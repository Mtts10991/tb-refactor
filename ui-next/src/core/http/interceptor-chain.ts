///
/// Copyright © 2016-2026 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

/**
 * @fileoverview
 * Factory สำหรับสร้าง default interceptor chain ของ ThingsBoard HTTP client.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/app.module.ts (HTTP_INTERCEPTORS provider config)
 *   ที่ลงทะเบียน interceptors ในลำดับ:
 *     1. EntityConflictInterceptor (multi-provider, รันก่อน)
 *     2. GlobalHttpInterceptor (รันทีหลัง)
 *
 * @reason
 * ใน Angular interceptor ลำดับถูกกำหนดโดยลำดับใน HTTP_INTERCEPTORS multi-provider token.
 * ในฝั่ง React เราควบคุมลำดับเองผ่าน array ที่ส่งให้ HttpClient constructor.
 *
 * ลำดับของ interceptor chain (outermost → innermost):
 *   1. authentication-interceptor       — ใส่ JWT token ก่อน request ออก
 *   2. error-handling-interceptor       — จับ error หลัง response กลับ (401 refresh, 403 forbidden)
 *   3. loading-indicator-interceptor    — track loading state ตลอด lifecycle
 *   4. rate-limit-interceptor           — retry 429 ด้วย jitter delay
 *   5. entity-conflict-interceptor      — handle 409 สำหรับ versioned entities
 *
 * การทำงาน:
 *   - request วิ่งจาก outermost → innermost (auth แนบ token ก่อน → ส่งต่อไป)
 *   - response/error วิ่งจาก innermost → outermost (entity-conflict เจอเห็น error ก่อน
 *     แล้วส่งต่อให้ rate-limit → loading → error-handling → auth)
 *
 * ข้อแตกต่างจาก Angular:
 *   - ใน Angular EntityConflictInterceptor รันก่อน GlobalHttpInterceptor เพื่อ catch 409
 *     ก่อนที่จะถูก treat เป็น generic error.
 *   - ใน chain ของเรา ทุก interceptor จับ error ผ่าน catchError ของตัวเอง,
 *     ดังนั้น entity-conflict (innermost) จะเห็น 409 ก่อน แล้วถ้า pass through
 *     จะวิ่งออกไปให้ rate-limit → error-handling ตามลำดับ.
 *
 * @module core/http
 */

import type { HttpInterceptor } from "./http-client";
import { createAuthenticationInterceptor } from "./interceptors/authentication-interceptor";
import {
  createErrorHandlingInterceptor,
  type ErrorHandlerCallbacks,
  type TokenRefresher,
} from "./interceptors/error-handling-interceptor";
import {
  createLoadingIndicatorInterceptor,
  type LoadingIndicatorCallbacks,
} from "./interceptors/loading-indicator-interceptor";
import { createRateLimitInterceptor } from "./interceptors/rate-limit-interceptor";
import {
  createEntityConflictInterceptor,
  type EntityConflictCallbacks,
} from "./interceptors/entity-conflict-interceptor";

/**
 * Dependencies ทั้งหมดที่จำเป็นสำหรับสร้าง default interceptor chain.
 *
 * รวม dependencies ของทุก interceptor ที่อยู่ใน chain.
 * Orchestrator (เช่น AuthSession) สร้าง deps object นี้ครั้งเดียวแล้วส่งให้ factory.
 */
export interface InterceptorChainDependencies {
  /**
   * Token getter สำหรับ authentication interceptor.
   * parity กับ AuthService.getJwtToken().
   */
  readonly getJwtToken: () => string | null;

  /**
   * Token refresher สำหรับ error-handling interceptor.
   * parity กับ AuthService.refreshJwtToken() + refreshTokenPending().
   */
  readonly tokenRefresher: TokenRefresher;

  /**
   * Error handler callbacks สำหรับ error-handling interceptor.
   * parity กับ DialogService + store.dispatch(ActionNotificationShow).
   */
  readonly errorHandlers: ErrorHandlerCallbacks;

  /**
   * Loading indicator callbacks สำหรับ loading-indicator interceptor.
   * parity กับ store.dispatch(ActionLoadStart/Finish).
   */
  readonly loadingCallbacks: LoadingIndicatorCallbacks;

  /**
   * Entity conflict callbacks สำหรับ entity-conflict interceptor.
   * parity กับ EntityConflictDialogComponent.
   */
  readonly conflictCallbacks: EntityConflictCallbacks;

  /**
   * Max retries สำหรับ rate-limit interceptor (default: 3).
   * parity: Angular ไม่จำกัด, เราเพิ่มเพื่อ safety.
   */
  readonly maxRateLimitRetries?: number;
}

/**
 * สร้าง default interceptor chain ของ ThingsBoard HTTP client.
 *
 * parity กับ Angular HTTP_INTERCEPTORS provider config ที่ลงทะเบียน
 * EntityConflictInterceptor + GlobalHttpInterceptor.
 *
 * ลำดับ chain (outermost → innermost):
 *   1. authentication-interceptor       — ใส่ JWT token ก่อน request ออก
 *   2. error-handling-interceptor       — จับ error หลัง response (401, 403, etc.)
 *   3. loading-indicator-interceptor    — track loading state
 *   4. rate-limit-interceptor           — retry 429
 *   5. entity-conflict-interceptor      — handle 409 versioned entity conflict
 *
 * @param deps - dependencies สำหรับทุก interceptor ใน chain
 * @returns array ของ interceptors ในลำดับที่ถูกต้อง (พร้อมส่งให้ HttpClient constructor)
 *
 * @example
 * ```ts
 * const interceptors = createDefaultInterceptorChain({
 *   getJwtToken: () => storeGet("jwt_token"),
 *   tokenRefresher: authTokenRefresher,
 *   errorHandlers: {
 *     translate: (key) => translate(key),
 *     showError: (msg, timeout) => toast.error(msg),
 *     showForbidden: () => toast.error("Forbidden"),
 *     showEntitiesLimitExceeded: () => toast.error("Entities limit exceeded"),
 *     logout: () => authSession.logout(),
 *   },
 *   loadingCallbacks: {
 *     startLoading: () => setLoading(true),
 *     finishLoading: () => setLoading(false),
 *   },
 *   conflictCallbacks: {
 *     openConflictDialog: (entity, msg) => openConflictModal(entity, msg),
 *   },
 * });
 * const httpClient = new HttpClient(interceptors);
 * ```
 */
export function createDefaultInterceptorChain(
  deps: InterceptorChainDependencies,
): HttpInterceptor[] {
  // ลำดับสำคัญมาก! outermost ต้องอยู่ index 0
  // (HttpClient จะ reduceRight จากท้าย array ไปต้น array — ต้น array คือ outermost)
  return [
    // 1. Authentication — ใส่ JWT token ก่อน request ออก
    createAuthenticationInterceptor({
      getJwtToken: deps.getJwtToken,
    }),

    // 2. Error handling — จับ error หลัง response กลับ (401 refresh, 403 forbidden)
    createErrorHandlingInterceptor({
      tokenRefresher: deps.tokenRefresher,
      errorHandlers: deps.errorHandlers,
    }),

    // 3. Loading indicator — track loading state ตลอด request lifecycle
    createLoadingIndicatorInterceptor({
      callbacks: deps.loadingCallbacks,
    }),

    // 4. Rate limit — retry 429 ด้วย jitter delay (1000 + random*3000 ms)
    createRateLimitInterceptor({
      maxRetries: deps.maxRateLimitRetries,
    }),

    // 5. Entity conflict — handle 409 สำหรับ versioned entities (innermost)
    createEntityConflictInterceptor({
      callbacks: deps.conflictCallbacks,
    }),
  ];
}
