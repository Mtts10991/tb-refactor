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
 * Token refresher — จัดการ JWT token refresh logic และ dedupe ผ่าน ReplaySubject.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/auth/auth.service.ts (Group 4: refresh logic)
 *   - validateJwtToken(doRefresh)
 *   - refreshJwtToken(loadUserElseStoreJwtToken)
 *   - refreshTokenPending()
 *
 * @reason
 * ใน Angular ทุกอย่างอยู่ใน @Injectable class เดียวกัน ทำให้แกะ method ที่ต้อง
 * ใช้ร่วมกันยาก. ในฝั่ง React ใช้ closure-based factory เพื่อแยก refresh logic
 * ออกมาเป็น module เดียวที่รับ dependencies ที่จำเป็นผ่าน deps object.
 *
 * Strategy parity กับ Angular AuthService:
 *   1. validateJwtToken(doRefresh): ถ้า JWT token หมดอายุ ให้เรียก refreshJwtToken
 *      (ถ้า doRefresh=true) หรือ clear token (ถ้า doRefresh=false)
 *   2. refreshJwtToken(loadUserElseStoreJwtToken): ใช้ refresh token ขอ refresh JWT token
 *      ใหม่จาก /api/auth/token. ใช้ refreshTokenSubject (ReplaySubject) เพื่อ dedupe
 *      หลาย caller ที่เรียกพร้อมกัน — ทุกคนจะได้ response เดียวกัน
 *   3. refreshTokenPending(): บอกว่ากำลัง refresh อยู่หรือไม่ (เพื่อให้ interceptor
 *      ตัดสินใจได้ว่าจะ queue request หรือ trigger refresh)
 *
 * @module core/authentication
 */

import { Observable, ReplaySubject } from "rxjs";
import { LoginResponse } from "@shared/models/login.models";
import { HttpClient } from "@core/http/http-client";
import { defaultHttpOptions } from "@core/http/http-utils";
import {
  clearTokenData,
  getRefreshToken,
  isTokenValid,
  storeTokenWithExpiration,
} from "./auth-token-store";
import { decodeJwtToken } from "./jwt-decode-wrapper";

/**
 * Dependencies ที่ AuthTokenRefresher ต้องการจาก orchestrator (AuthSession).
 * ใช้ callback function เพื่อให้ refresher เรียกกลับไปยัง session ได้โดยไม่สร้าง circular import.
 */
export interface AuthTokenRefresherCallbacks {
  /**
   * Callback สำหรับ update token ลง localStorage + dispatch auth state.
   * parity กับ AuthService.setUserFromJwtToken(jwtToken, refreshToken, notify).
   *
   * @param jwtToken - JWT token ใหม่ หรือ null/undefined ถ้าต้องการ logout
   * @param refreshToken - refresh token ใหม่ หรือ null/undefined
   * @param notify - ถ้า true จะ notify store (dispatch auth state change)
   */
  setUserFromJwtToken: (
    jwtToken: string | null | undefined,
    refreshToken: string | null | undefined,
    notify: boolean,
  ) => Observable<boolean>;

  /**
   * Callback สำหรับ update tokens ลง localStorage (validation + storage).
   * parity กับ AuthService.updateAndValidateTokens(jwtToken, refreshToken, notify).
   */
  updateAndValidateTokens: (
    jwtToken: string,
    refreshToken: string,
    notify: boolean,
  ) => void;

  /**
   * Callback สำหรับ update auth user ใน store จาก token ใหม่.
   * parity กับ AuthService.updatedAuthUserFromToken(token).
   */
  updateAuthUserFromToken: (token: string) => void;

  /**
   * แปล message key เป็นข้อความ localized (parity กับ TranslateService.instant/get).
   * Phase 1.8 จะ replace ด้วย next-intl translation function จริง.
   *
   * @param messageKey - i18n key (เช่น 'access.refresh-token-expired')
   * @returns message ที่แปลแล้ว หรือ key เดิมถ้ายังไม่มี translation
   */
  translate: (messageKey: string) => string;
}

/**
 * Dependencies object สำหรับสร้าง AuthTokenRefresher.
 */
export interface AuthTokenRefresherDependencies {
  /** HTTP client สำหรับเรียก /api/auth/token */
  readonly httpClient: HttpClient;
  /** Callbacks ที่ชี้กลับไปยัง AuthSession orchestrator */
  readonly callbacks: AuthTokenRefresherCallbacks;
}

/**
 * สร้าง auth token refresher instance — ปิด state ไว้ใน closure.
 *
 * parity กับ refresh logic ของ AuthService (3 methods: validateJwtToken,
 * refreshJwtToken, refreshTokenPending). State ที่ปิดใน closure คือ
 * refreshTokenSubject สำหรับ dedupe.
 *
 * @example
 * ```ts
 * const refresher = createAuthTokenRefresher({
 *   httpClient,
 *   callbacks: {
 *     setUserFromJwtToken: session.setUserFromJwtToken,
 *     updateAndValidateTokens: session.updateAndValidateTokens,
 *     updateAuthUserFromToken: session.updateAuthUserFromToken,
 *     translate: (key) => translate(key),
 *   },
 * });
 * const loginResponse = await refresher.refreshJwtToken(true).toPromise();
 * ```
 *
 * @param deps - dependencies (httpClient + callbacks)
 * @returns refresher API: validateJwtToken, refreshJwtToken, refreshTokenPending
 */
export function createAuthTokenRefresher(
  deps: AuthTokenRefresherDependencies,
): {
  validateJwtToken: (doRefresh: boolean) => Observable<void>;
  refreshJwtToken: (loadUserElseStoreJwtToken?: boolean) => Observable<LoginResponse>;
  refreshTokenPending: () => boolean;
} {
  const { httpClient, callbacks } = deps;

  // parity กับ AuthService.refreshTokenSubject — ReplaySubject(1) เพื่อ replay ค่าสุดท้าย
  // ให้ subscriber ที่ subscribe ภายหลัง (เช่น interceptor ที่ trigger refresh)
  let refreshTokenSubject: ReplaySubject<LoginResponse> | null = null;

  /**
   * Refresh JWT token โดยใช้ refresh token.
   * parity กับ AuthService.refreshJwtToken(loadUserElseStoreJwtToken).
   *
   * Dedupe strategy: ใช้ refreshTokenSubject (ReplaySubject) — ถ้ามี refresh ทำงานอยู่แล้ว
   * caller ที่เรียกซ้ำจะได้ share subject ตัวเดียวกัน (ทุก caller จะได้ response เดียวกัน).
   */
  function refreshJwtToken(loadUserElseStoreJwtToken = true): Observable<LoginResponse> {
    // ถ้ามี refresh ทำงานอยู่แล้ว → return subject ที่ทำงานอยู่ (dedupe)
    if (refreshTokenSubject !== null) {
      return refreshTokenSubject;
    }

    // สร้าง subject ใหม่สำหรับ refresh ครั้งนี้
    refreshTokenSubject = new ReplaySubject<LoginResponse>(1);
    const response = refreshTokenSubject;

    const refreshToken = getRefreshToken();
    const refreshTokenValid = isTokenValid("refresh_token");

    // Clear current JWT token ก่อน refresh (parity กับ AuthService.setUserFromJwtToken(null, null, false))
    callbacks.setUserFromJwtToken(null, null, false);

    if (!refreshTokenValid) {
      // Refresh token หมดอายุ → error
      callbacks.translate("access.refresh-token-expired");
      response.error(new Error(callbacks.translate("access.refresh-token-expired")));
      refreshTokenSubject = null;
    } else {
      // Refresh token ยัง valid → เรียก /api/auth/token
      const refreshTokenRequest = { refreshToken };
      const refreshObservable = httpClient.post<LoginResponse>(
        "/api/auth/token",
        refreshTokenRequest,
        defaultHttpOptions(),
      );
      refreshObservable.subscribe({
        next: (loginResponse: LoginResponse) => {
          if (loadUserElseStoreJwtToken) {
            callbacks.setUserFromJwtToken(
              loginResponse.token,
              loginResponse.refreshToken,
              false,
            );
          } else {
            callbacks.updateAndValidateTokens(
              loginResponse.token,
              loginResponse.refreshToken,
              true,
            );
          }
          callbacks.updateAuthUserFromToken(loginResponse.token);
          response.next(loginResponse);
          response.complete();
          refreshTokenSubject = null;
        },
        error: () => {
          clearTokenData();
          response.error(new Error(callbacks.translate("access.refresh-token-failed")));
          refreshTokenSubject = null;
        },
      });
    }
    return response;
  }

  /**
   * ตรวจสอบ JWT token — ถ้าหมดอายุ ให้ refresh (ถ้า doRefresh=true) หรือ clear (ถ้า doRefresh=false).
   * parity กับ AuthService.validateJwtToken(doRefresh).
   */
  function validateJwtToken(doRefresh: boolean): Observable<void> {
    const subject = new ReplaySubject<void>();
    if (!isTokenValid("jwt_token")) {
      if (doRefresh) {
        refreshJwtToken(!doRefresh).subscribe({
          next: () => {
            subject.next();
            subject.complete();
          },
          error: (err: unknown) => {
            subject.error(err);
          },
        });
      } else {
        clearTokenData();
        subject.error(null);
      }
    } else {
      subject.next();
      subject.complete();
    }
    return subject;
  }

  /**
   * บอกว่ากำลัง refresh token อยู่หรือไม่.
   * parity กับ AuthService.refreshTokenPending().
   *
   * Interceptor ใช้เพื่อตัดสินใจว่าจะ queue request (รอ refresh เสร็จ) หรือ trigger refresh ใหม่.
   */
  function refreshTokenPending(): boolean {
    return refreshTokenSubject !== null;
  }

  return {
    validateJwtToken,
    refreshJwtToken,
    refreshTokenPending,
  };
}

/**
 * Helper สำหรับ update tokens ลง localStorage พร้อม dispatch unauthenticated ถ้า token invalid.
 * parity กับ AuthService.updateAndValidateTokens และ updateAndValidateToken.
 *
 * Export เป็น helper function ให้ AuthSession ใช้ (เพื่อไม่ให้ refresher กับ session ต้อง
 * duplicate logic). Decode token → คำนวณ expiration → store ลง localStorage.
 *
 * @param jwtToken - JWT token ใหม่
 * @param refreshToken - refresh token ใหม่
 * @param onInvalid - callback ที่จะเรียกถ้า token invalid (parity กับ notify unauthenticated)
 */
export function validateAndStoreTokens(
  jwtToken: string,
  refreshToken: string,
  onInvalid: () => void,
): void {
  if (!validateAndStoreToken(jwtToken, "jwt_token", onInvalid)) {
    // ถ้า jwt token invalid ก็ไม่ต้องเก็บ refresh token
    return;
  }
  validateAndStoreToken(refreshToken, "refresh_token", onInvalid);
}

/**
 * Helper สำหรับ validate + store token ตัวเดียวลง localStorage.
 * parity กับ AuthService.updateAndValidateToken(token, prefix, notify).
 *
 * @param token - token string
 * @param prefix - storage prefix ('jwt_token' หรือ 'refresh_token')
 * @param onInvalid - callback ที่จะเรียกถ้า token invalid
 * @returns true ถ้าบันทึกสำเร็จ, false ถ้า token invalid
 */
export function validateAndStoreToken(
  token: string,
  prefix: "jwt_token" | "refresh_token",
  onInvalid: () => void,
): boolean {
  let valid = false;
  try {
    const tokenData = decodeJwtToken(token);
    const issuedAt = tokenData?.iat;
    const expTime = tokenData?.exp;
    valid = storeTokenWithExpiration(token, prefix, issuedAt, expTime);
  } catch {
    valid = false;
  }
  if (!valid) {
    onInvalid();
  }
  return valid;
}
