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
 * Error-handling interceptor — จับ HTTP error responses และ dispatch ไปยัง
 * handler ที่เหมาะสม (refresh token, forbidden dialog, entities limit, ฯลฯ).
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/interceptors/global-http-interceptor.ts
 *   - handleResponseError() (private method, ~50 บรรทัด)
 *
 * @reason
 * ใน Angular logic นี้อยู่ใน GlobalHttpInterceptor ตัวเดียวกับ auth + loading.
 * ในฝั่ง React แยกออกเป็น interceptor ตัวเดียวที่รับผิดชอบ error handling ทั้งหมด:
 *   - 401 → refresh token + retry (via auth-token-refresher)
 *   - 403 → forbidden (log warning — dialog จะอยู่ใน Phase 2)
 *   - 409 → delegate ไป entity-conflict-interceptor (ผ่าน next chain)
 *   - errorCode 41 → entitiesLimitExceeded (log — dialog ใน Phase 2)
 *   - status 0/-1 → "Unable to connect"
 *   - อื่น ๆ → parseHttpErrorMessage เพื่อ format error ให้ user เห็น
 *
 * ข้อแตกต่างจาก Angular:
 *   - ใน Angular 409 จะถูก handle ใน entity-conflict-interceptor ตัวแยก (รันก่อน global)
 *     ดังนั้นใน chain ของเรา entity-conflict-interceptor อยู่ลำดับสุดท้าย (innermost)
 *     error-handling-interceptor จึงไม่ต้องจัดการ 409 โดยตรง — แค่ pass through
 *   - 429 retry อยู่ใน rate-limit-interceptor ตัวแยก (chain ลำดับก่อน innermost)
 *
 * @module core/http/interceptors
 */

import { Observable, throwError } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";
import type { HttpInterceptor } from "../http-client";
import {
  AuthEntryPoint,
  ServerErrorCode,
} from "../../error-handling/server-error-codes";
import {
  type HttpErrorLike,
  parseHttpErrorMessage,
  type TranslateFn,
} from "../../error-handling/http-error-parser";

/**
 * Error response shape ที่ ThingsBoard HttpClient ส่งเข้ามาเมื่อ fetch ล้มเหลว
 * หรือ response.ok === false.
 *
 * parity กับ Angular HttpErrorResponse — แต่ฝั่ง fetch เราใช้ object ธรรมดา
 * ที่มี status, statusText, error body.
 */
export interface FetchErrorResponse {
  readonly status: number;
  readonly statusText?: string;
  readonly url?: string;
  readonly error?: unknown;
}

/**
 * Token refresher API ที่ error-handling-interceptor ต้องการ.
 * parity กับ Angular AuthService.refreshJwtToken() + refreshTokenPending().
 */
export interface TokenRefresher {
  /**
   * Refresh JWT token โดยใช้ refresh token.
   * parity กับ AuthService.refreshJwtToken(loadUserElseStoreJwtToken).
   *
   * @returns Observable<LoginResponse> ที่ emit เมื่อ refresh สำเร็จ
   */
  readonly refreshJwtToken: () => Observable<unknown>;

  /**
   * บอกว่ากำลัง refresh token อยู่หรือไม่.
   * parity กับ AuthService.refreshTokenPending().
   */
  readonly refreshTokenPending: () => boolean;
}

/**
 * Callbacks สำหรับ report errors ที่ไม่ใช่ 401/429 ให้ UI layer จัดการ.
 * Phase 2 จะแทนที่ console.warn ด้วย dialog service จริง.
 */
export interface ErrorHandlerCallbacks {
  /**
   * แปล i18n key → localized message.
   * parity กับ TranslateService.instant(key).
   */
  readonly translate: TranslateFn;

  /**
   * โชว์ error message ให้ user เห็น (toast/notification).
   * parity กับ Angular store.dispatch(new ActionNotificationShow({ message, type: 'error' })).
   *
   * Phase 2 จะ wire กับ HeroUI toast จริง. Phase 1 ใช้ stub.
   *
   * @param message - ข้อความที่จะโชว์
   * @param timeout - delay (ms) ก่อนโชว์ (parity กับ error.timeout)
   */
  readonly showError: (message: string, timeout?: number) => void;

  /**
   * โชว์ "forbidden" (403) dialog/toast.
   * parity กับ Angular dialogService.forbidden().
   *
   * Phase 2 จะ wire กับ HeroUI modal จริง. Phase 1 ใช้ stub.
   */
  readonly showForbidden?: () => void;

  /**
   * โชว์ "entities limit exceeded" dialog/toast (errorCode 41).
   * parity กับ Angular dialogService.entitiesLimitExceeded(error).
   *
   * Phase 2 จะ wire กับ HeroUI modal จริง. Phase 1 ใช้ stub.
   *
   * @param error - error body ที่ server ส่งกลับมา
   */
  readonly showEntitiesLimitExceeded?: (error: unknown) => void;

  /**
   * Logout user (parity กับ AuthService.logout(true, true)).
   * ใช้เมื่อ refresh token ล้มเหลว — ต้องบังคับ login ใหม่.
   */
  readonly logout: () => void;
}

/**
 * Dependencies สำหรับ error-handling interceptor.
 */
export interface ErrorHandlingInterceptorDependencies {
  /** Token refresher สำหรับจัดการ 401 */
  readonly tokenRefresher: TokenRefresher;
  /** Callbacks สำหรับ report errors ให้ UI */
  readonly errorHandlers: ErrorHandlerCallbacks;
}

/**
 * สร้าง error-handling interceptor ที่จับ error responses และ dispatch ไป handler ที่เหมาะสม.
 *
 * parity กับส่วน handleResponseError() ของ Angular GlobalHttpInterceptor.
 *
 * Algorithm (parity กับ Angular handleResponseError):
 *   1. ดึง errorCode จาก error body
 *   2. ถ้า status === 401 และ URL ไม่ใช่ /api/auth/token:
 *      - ถ้า errorCode === jwtTokenExpired (11) หรือ refreshTokenPending → refresh + retry
 *      - ถ้า errorCode !== credentialsExpired (15) → ถือว่า unhandled → parse + showError
 *   3. ถ้า errorCode === entitiesLimitExceeded (41) → showEntitiesLimitExceeded
 *   4. ถ้า status === 0 หรือ -1 → "Unable to connect"
 *   5. ถ้า status === 403 → showForbidden
 *   6. ถ้า status === 404/504 → showError พร้อม message เฉพาะเจาะจง
 *   7. อื่น ๆ → parseHttpErrorMessage + showError
 *
 * @param deps - dependencies (token refresher + error handler callbacks)
 * @returns HttpInterceptor ที่พร้อมใช้ใน chain
 */
export function createErrorHandlingInterceptor(
  deps: ErrorHandlingInterceptorDependencies,
): HttpInterceptor {
  const { tokenRefresher, errorHandlers } = deps;

  return (request: Request, next: (req: Request) => Observable<Response>): Observable<Response> => {
    return next(request).pipe(
      catchError((error: unknown): Observable<Response> => {
        return handleResponseError(request, next, error);
      }),
    );
  };

  /**
   * จัดการ error response ตาม status code + errorCode.
   * parity กับ Angular GlobalHttpInterceptor.handleResponseError().
   */
  function handleResponseError(
    request: Request,
    next: (req: Request) => Observable<Response>,
    rawError: unknown,
  ): Observable<Response> {
    const errorResponse = normalizeError(rawError);
    const errorCode = extractErrorCode(errorResponse.error);
    const ignoreErrors = false; // parity: config.ignoreErrors (จะ wire ใน Phase 2 ผ่าน InterceptorConfig)

    // Case 1: refresh token pending หรือ 401 (ไม่ใช่ refresh endpoint เอง)
    // parity กับ Angular: errorResponse.error.refreshTokenPending || status === 401
    const isRefreshPending =
      isObject(errorResponse.error) &&
      (errorResponse.error as { refreshTokenPending?: boolean }).refreshTokenPending === true;

    if (
      isRefreshPending ||
      (errorResponse.status === 401 && request.url !== AuthEntryPoint.tokenRefresh)
    ) {
      // refresh token + retry เมื่อ: refresh pending, หรือ JWT expired (errorCode 11)
      if (isRefreshPending || errorCode === ServerErrorCode.jwtTokenExpired) {
        return refreshTokenAndRetry(request, next);
      } else if (errorCode !== ServerErrorCode.credentialsExpired) {
        // credentialsExpired (15) → ต้องเปลี่ยน password ไม่ใช่ refresh
        // อื่น ๆ → unhandled, fall through ไป showError
        showUnhandledError(errorResponse, request);
      }
      return throwError(() => errorResponse);
    }

    // Case 2: entities limit exceeded (errorCode 41)
    // parity กับ Angular: errorCode === entitiesLimitExceeded
    if (errorCode === ServerErrorCode.entitiesLimitExceeded) {
      if (!ignoreErrors && errorHandlers.showEntitiesLimitExceeded) {
        errorHandlers.showEntitiesLimitExceeded(errorResponse.error);
      }
      return throwError(() => errorResponse);
    }

    // Case 3: 429 rate limited → ปล่อยให้ rate-limit-interceptor จัดการ (chain อยู่ข้างใน)
    // parity กับ Angular: 429 retry logic — แต่เราแยกเป็น interceptor ตัวแยก
    // ดังนั้นที่นี่ไม่ retry, แค่ pass through
    if (errorResponse.status === 429) {
      return throwError(() => errorResponse);
    }

    // Case 4: 403 forbidden
    // parity กับ Angular: status === 403 → dialogService.forbidden()
    if (errorResponse.status === 403) {
      if (!ignoreErrors) {
        if (errorHandlers.showForbidden) {
          errorHandlers.showForbidden();
        } else {
          console.warn("[error-handling-interceptor] 403 Forbidden", request.url);
        }
      }
      return throwError(() => errorResponse);
    }

    // Case 5: connection error (status 0 หรือ -1)
    // parity กับ Angular: status === 0 || status === -1 → showError('Unable to connect')
    if (errorResponse.status === 0 || errorResponse.status === -1) {
      errorHandlers.showError("Unable to connect");
      return throwError(() => errorResponse);
    }

    // Case 6: RPC endpoints ไม่โชว์ error (parity กับ Angular)
    if (request.url.startsWith("/api/rpc") || request.url.startsWith("/api/plugins/rpc")) {
      return throwError(() => errorResponse);
    }

    // Case 7: 404 / 504 มี message เฉพาะเจาะจง
    // parity กับ Angular: 404 → "method: url<br/>status: statusText", 504 → "Request timeout"
    if (errorResponse.status === 404) {
      if (!ignoreErrors) {
        errorHandlers.showError(
          `${request.method}: ${request.url}<br/>${errorResponse.status}: ${errorResponse.statusText ?? ""}`,
        );
      }
      return throwError(() => errorResponse);
    }
    if (errorResponse.status === 504) {
      if (!ignoreErrors) {
        errorHandlers.showError("Request timeout");
      }
      return throwError(() => errorResponse);
    }

    // Case 8: unhandled error → parse + showError
    // parity กับ Angular: unhandled = true → parseHttpErrorMessage + showError
    showUnhandledError(errorResponse, request);
    return throwError(() => errorResponse);
  }

  /**
   * Refresh JWT token แล้ว retry request เดิม.
   * parity กับ Angular GlobalHttpInterceptor.refreshTokenAndRetry().
   */
  function refreshTokenAndRetry(
    request: Request,
    next: (req: Request) => Observable<Response>,
  ): Observable<Response> {
    return tokenRefresher.refreshJwtToken().pipe(
      catchError((err: unknown) => {
        // refresh ล้มเหลว → logout + report error
        // parity กับ Angular: authService.logout(true, true)
        errorHandlers.logout();
        const message = err instanceof Error ? err.message : "Unauthorized!";
        errorHandlers.showError(message, 200);
        return throwError(() => err);
      }),
      switchMap(() => next(request)),
    );
  }

  /**
   * โชว์ unhandled error ผ่าน parseHttpErrorMessage.
   * parity กับ Angular: parseHttpErrorMessage(errorResponse, translate, responseType, sanitizer)
   */
  function showUnhandledError(errorResponse: HttpErrorLike, request: Request): void {
    const parsed = parseHttpErrorMessage(
      errorResponse,
      errorHandlers.translate,
      // responseType parity: Angular ใช้ req.responseType, ฝั่ง fetch ไม่มี — ส่ง undefined
      undefined,
    );
    void request; // parity: Angular ใช้ req.responseType เท่านั้น
    errorHandlers.showError(parsed.message, parsed.timeout);
  }
}

/**
 * Normalize raw error ให้เป็น FetchErrorResponse shape.
 *
 * parity: Angular HttpErrorResponse มี status/statusText/error fields ครบ,
 * แต่ฝั่ง fetch error อาจเป็น Error object ธรรมดา (network error) หรือ custom object.
 */
function normalizeError(rawError: unknown): FetchErrorResponse {
  if (typeof rawError === "object" && rawError !== null && "status" in rawError) {
    return rawError as FetchErrorResponse;
  }
  // Network error / unknown → status 0 ("Unable to connect")
  return {
    status: 0,
    statusText: "Unknown Error",
    error: rawError,
  };
}

/**
 * ดึง errorCode จาก error body.
 * parity กับ Angular: errorResponse.error ? errorResponse.error.errorCode : null
 */
function extractErrorCode(errorBody: unknown): number | null {
  if (isObject(errorBody) && typeof (errorBody as { errorCode?: unknown }).errorCode === "number") {
    return (errorBody as { errorCode: number }).errorCode;
  }
  return null;
}

/** Type guard: เช็คว่า value เป็น non-null object */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
