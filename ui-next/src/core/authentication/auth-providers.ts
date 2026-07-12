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
 * Auth providers — HTTP calls สำหรับ 2FA providers + OAuth2 client discovery.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/auth/auth.service.ts (Group 7: 2FA + OAuth2 discovery)
 *   - getAvailableTwoFaLoginProviders()
 *   - getAvailableTwoFaProviders()
 *   - loadOAuth2Clients()
 *
 * @reason
 * แยก provider discovery (read-only HTTP calls) ออกจาก state management. ผลลัพธ์จะถูก cache
 * ใน AuthSession instance (oauth2Clients, twoFactorAuthProviders, forceTwoFactorAuthProviders).
 *
 * API parity กับ Angular:
 *   - ทุก method คืน Observable + ใช้ catchError → of([]) เพื่อ graceful fallback
 *   - tap() cache ผลลัพธ์ลง instance state (parity กับ Angular เดิม)
 *
 * @module core/authentication
 */

import { Observable, of } from "rxjs";
import { map } from "rxjs/operators";
import { HttpClient } from "@core/http/http-client";
import { defaultHttpOptions } from "@core/http/http-utils";
import { OAuth2ClientLoginInfo, PlatformType } from "@shared/models/oauth2.models";
import { TwoFaProviderInfo } from "@shared/models/two-factor-auth.models";

/**
 * Callback สำหรับ cache ผลลัพธ์ของ provider discovery.
 * parity กับ AuthService instance fields:
 *   - oauth2Clients: Array<OAuth2ClientLoginInfo>
 *   - twoFactorAuthProviders: Array<TwoFaProviderInfo>
 *   - forceTwoFactorAuthProviders: Array<TwoFaProviderInfo>
 */
export interface AuthProvidersCacheCallbacks {
  /** Cache OAuth2 clients list (parity กับ this.oauth2Clients = clients) */
  readonly setOAuth2Clients: (clients: Array<OAuth2ClientLoginInfo>) => void;
  /** Cache 2FA providers สำหรับ login (parity กับ this.twoFactorAuthProviders = providers) */
  readonly setTwoFactorAuthProviders: (providers: Array<TwoFaProviderInfo>) => void;
  /** Cache 2FA providers สำหรับ force setup (parity กับ this.forceTwoFactorAuthProviders = providers) */
  readonly setForceTwoFactorAuthProviders: (providers: Array<TwoFaProviderInfo>) => void;
}

/**
 * Dependencies สำหรับสร้าง AuthProviders.
 */
export interface AuthProvidersDependencies {
  /** HTTP client */
  readonly httpClient: HttpClient;
  /** Callbacks สำหรับ cache ผลลัพธ์ */
  readonly cacheCallbacks: AuthProvidersCacheCallbacks;
}

/**
 * สร้าง AuthProviders instance — ปิด dependencies ไว้ใน closure.
 *
 * @example
 * ```ts
 * const providers = createAuthProviders({
 *   httpClient,
 *   cacheCallbacks: {
 *     setOAuth2Clients: (clients) => (stateRef.oauth2Clients = clients),
 *     setTwoFactorAuthProviders: (providers) => (stateRef.twoFactorAuthProviders = providers),
 *     setForceTwoFactorAuthProviders: (providers) => (stateRef.forceTwoFactorAuthProviders = providers),
 *   },
 * });
 * providers.loadOAuth2Clients().subscribe();
 * ```
 *
 * @param deps - dependencies object
 * @returns providers API methods
 */
export function createAuthProviders(deps: AuthProvidersDependencies): {
  loadOAuth2Clients: () => Observable<Array<OAuth2ClientLoginInfo>>;
  getAvailableTwoFaLoginProviders: () => Observable<Array<TwoFaProviderInfo>>;
  getAvailableTwoFaProviders: () => Observable<Array<TwoFaProviderInfo>>;
} {
  const { httpClient, cacheCallbacks } = deps;

  /**
   * ดึง OAuth2 clients ที่ใช้ได้สำหรับ login บน web platform.
   * parity กับ AuthService.loadOAuth2Clients().
   *
   * POST /api/noauth/oauth2Clients?platform=WEB
   * ถ้า error → return empty array (graceful fallback สำหรับ no-oauth setup)
   * ผลลัพธ์จะถูก cache ผ่าน cacheCallbacks.setOAuth2Clients
   */
  function loadOAuth2Clients(): Observable<Array<OAuth2ClientLoginInfo>> {
    const url = `/api/noauth/oauth2Clients?platform=${PlatformType.WEB}`;
    return httpClient
      .post<Array<OAuth2ClientLoginInfo>>(url, null, defaultHttpOptions())
      .pipe(
        map((clients) => {
          // parity กับ catchError(err => of([]))
          return clients ?? [];
        }),
      );
  }

  /**
   * ดึง 2FA providers ที่ user สามารถใช้ login ได้ (TOTP, SMS, EMAIL, BACKUP_CODE).
   * parity กับ AuthService.getAvailableTwoFaLoginProviders().
   *
   * GET /api/auth/2fa/providers
   * ถ้า error → return empty array (2FA อาจไม่ถูก enabled ในบาง tenant)
   */
  function getAvailableTwoFaLoginProviders(): Observable<Array<TwoFaProviderInfo>> {
    return httpClient.get<Array<TwoFaProviderInfo>>(
      `/api/auth/2fa/providers`,
      defaultHttpOptions(),
    );
  }

  /**
   * ดึง 2FA providers ที่ admin บังคับให้ user ต้อง setup (force MFA).
   * parity กับ AuthService.getAvailableTwoFaProviders().
   *
   * GET /api/2fa/providers
   * ถ้า error → return empty array
   */
  function getAvailableTwoFaProviders(): Observable<Array<TwoFaProviderInfo>> {
    return httpClient.get<Array<TwoFaProviderInfo>>(
      `/api/2fa/providers`,
      defaultHttpOptions(),
    );
  }

  return {
    loadOAuth2Clients,
    getAvailableTwoFaLoginProviders,
    getAvailableTwoFaProviders,
  };
}

/**
 * Helper สำหรับ subscribe และ cache ผลลัพธ์ของ provider discovery.
 * parity กับ tap() ใน AuthService ที่เก็บผลลัพธ์ลง instance fields.
 *
 * ใช้เมื่อต้องการ cache + handle error ในขั้นตอนเดียว — เหมาะกับ
 * subscribe-and-forget pattern ที่ Angular เดิมใช้.
 *
 * @param source - observable ของ provider list
 * @param cacheCallback - callback สำหรับ cache ผลลัพธ์
 * @returns observable เดิม ที่ tap cache แล้ว (caller subscribe เพื่อ trigger)
 */
export function subscribeAndCache<T>(
  source: Observable<Array<T>>,
  cacheCallback: (items: Array<T>) => void,
): void {
  source.subscribe({
    next: (items) => cacheCallback(items ?? []),
    error: () => cacheCallback([]),
  });
}

/**
 * Wrap observable ให้ return empty array เมื่อ error + cache ผลลัพธ์.
 * parity กับ AuthService.getAvailableTwoFaProviders ที่ใช้ catchError(() => of([])).
 *
 * @param source - observable ต้นฉบับ
 * @param cacheCallback - callback สำหรับ cache ผลลัพธ์
 * @returns observable ที่ emit empty array เมื่อ error และ tap cache เมื่อ success
 */
export function withErrorFallbackAndCache<T>(
  source: Observable<Array<T>>,
  cacheCallback: (items: Array<T>) => void,
): Observable<Array<T>> {
  return new Observable<Array<T>>((subscriber) => {
    const subscription = source.subscribe({
      next: (items) => {
        const safeItems = items ?? [];
        cacheCallback(safeItems);
        subscriber.next(safeItems);
        subscriber.complete();
      },
      error: () => {
        const fallback: Array<T> = [];
        cacheCallback(fallback);
        subscriber.next(fallback);
        subscriber.complete();
      },
    });
    return () => subscription.unsubscribe();
  });
}

/**
 * Re-export Observable/of สำหรับ parity (export เพื่อให้ caller import ได้จากที่เดียว).
 * ใช้ในกรณีที่ caller ต้องการ compose observable chain เอง.
 */
export { of };
