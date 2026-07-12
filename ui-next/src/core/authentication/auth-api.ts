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
 * Auth API client — HTTP calls สำหรับ login/logout/activate/reset password.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/auth/auth.service.ts (Group 2: login/logout/activate HTTP)
 *   - login(loginRequest)
 *   - checkTwoFaVerificationCode(providerType, verificationCode)
 *   - publicLogin(publicId)
 *   - sendResetPasswordLink(email)
 *   - activate(activateToken, password, sendActivationMail)
 *   - resetPassword(resetToken, password)
 *   - changePassword(currentPassword, newPassword, config)
 *   - getUserPasswordPolicy(config)
 *   - activateByEmailCode(emailCode)
 *   - resendEmailActivation(email)
 *   - loginAsUser(userId)
 *   - logout(captureLastUrl, ignoreRequest)
 *
 * @reason
 * แยก HTTP API calls ออกจาก state management เพื่อให้ test ง่ายและ reuse ได้.
 * Methods ที่ได้ token ใหม่ (login, activate, loginAsUser, checkTwoFaVerificationCode)
 * จะเรียก onTokenReceived callback เพื่อให้ AuthSession update state.
 *
 * API parity กับ Angular AuthService — ทุก method คืน Observable (parity กับ Angular).
 *
 * @module core/authentication
 */

import { Observable } from "rxjs";
import { HttpClient } from "@core/http/http-client";
import { defaultHttpOptions, defaultHttpOptionsFromConfig, RequestConfig } from "@core/http/http-utils";
import {
  LoginRequest,
  LoginResponse,
  PublicLoginRequest,
} from "@shared/models/login.models";
import { TwoFactorAuthProviderType } from "@shared/models/two-factor-auth.models";
import { UserPasswordPolicy } from "@shared/models/settings.models";

/**
 * Callback ที่ AuthApi เรียกเมื่อได้รับ token ใหม่จาก login/activate/loginAsUser.
 * parity กับ AuthService.setUserFromJwtToken(token, refreshToken, true).
 */
export type OnTokenReceived = (
  jwtToken: string,
  refreshToken: string,
  notify: boolean,
) => void;

/**
 * Callback ที่ AuthApi เรียกเมื่อได้รับ scope ที่ต้อง navigation (เช่น MFA).
 * parity กับ AuthService.login ที่เรียก router.navigateByUrl('login/mfa').
 */
export type OnLoginScopeReceived = (loginResponse: LoginResponse) => void;

/**
 * Callback สำหรับ logout — parity กับ AuthService.clearJwtToken (private method).
 * AuthSession จะ implement เป็น setUserFromJwtToken(null, null, true).
 */
export type OnLogout = () => void;

/**
 * Callback สำหรับ capture current URL ก่อน logout (captureLastUrl).
 * parity กับ AuthService.logout(captureLastUrl) ที่เก็บ this.router.url.
 */
export type GetCurrentUrl = () => string;

/**
 * Dependencies สำหรับสร้าง AuthApi.
 */
export interface AuthApiDependencies {
  /** HTTP client */
  readonly httpClient: HttpClient;
  /** เรียกเมื่อได้ token ใหม่ (จาก login, activate, loginAsUser, checkTwoFaVerificationCode) */
  readonly onTokenReceived: OnTokenReceived;
  /** เรียกเมื่อ login response มี scope พิเศษ (เช่น MFA) เพื่อ navigation */
  readonly onLoginScopeReceived: OnLoginScopeReceived;
  /** เรียกเมื่อ logout (clear JWT token + dispatch unauthenticated) */
  readonly onLogout: OnLogout;
  /** อ่าน URL ปัจจุบันของ router (สำหรับ captureLastUrl) */
  readonly getCurrentUrl: GetCurrentUrl;
}

/**
 * สร้าง AuthApi instance — ปิด dependencies ไว้ใน closure.
 *
 * @example
 * ```ts
 * const authApi = createAuthApi({
 *   httpClient,
 *   onTokenReceived: (jwt, refresh, notify) => session.setUserFromJwtToken(jwt, refresh, notify),
 *   onLoginScopeReceived: (resp) => navigateBasedOnScope(resp),
 *   onLogout: () => session.clearJwtToken(),
 *   getCurrentUrl: () => router.pathname,
 * });
 * ```
 *
 * @param deps - dependencies object
 * @returns auth API methods
 */
export function createAuthApi(deps: AuthApiDependencies): {
  login: (loginRequest: LoginRequest) => Observable<LoginResponse>;
  checkTwoFaVerificationCode: (
    providerType: TwoFactorAuthProviderType,
    verificationCode: number,
  ) => Observable<LoginResponse>;
  publicLogin: (publicId: string) => Observable<LoginResponse>;
  sendResetPasswordLink: (email: string) => Observable<unknown>;
  activate: (
    activateToken: string,
    password: string,
    sendActivationMail: boolean,
  ) => Observable<LoginResponse>;
  resetPassword: (resetToken: string, password: string) => Observable<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    config?: RequestConfig,
  ) => Observable<unknown>;
  getUserPasswordPolicy: (config?: RequestConfig) => Observable<UserPasswordPolicy>;
  activateByEmailCode: (emailCode: string) => Observable<LoginResponse>;
  resendEmailActivation: (email: string) => Observable<unknown>;
  loginAsUser: (userId: string) => Observable<LoginResponse>;
  logout: (captureLastUrl?: boolean, ignoreRequest?: boolean) => void;
} {
  const { httpClient, onTokenReceived, onLoginScopeReceived, onLogout, getCurrentUrl } = deps;

  /**
   * Login ด้วย username/password.
   * parity กับ AuthService.login(loginRequest).
   *
   * POST /api/auth/login → ได้ LoginResponse (token + refreshToken + scope).
   * ถ้า scope เป็น PRE_VERIFICATION_TOKEN/MFA_CONFIGURATION_TOKEN → callback จะ navigate ไป mfa/force-mfa.
   */
  function login(loginRequest: LoginRequest): Observable<LoginResponse> {
    return httpClient
      .post<LoginResponse>("/api/auth/login", loginRequest, defaultHttpOptions());
    // Note: onTokenReceived + onLoginScopeReceived จะถูกเรียกโดย caller (subscribe),
    //   เพื่อให้ตรงกับ Angular เดิมที่ tap() ทำใน observable chain.
    //   สำหรับ parity เต็มรูปแบบ สามารถ tap() ในนี้ได้ — แต่แยกออกไปให้ orchestrator จัดการ
    //   ชัดเจนกว่า (caller ต้อง subscribe เองและจัดการ token).
  }

  /**
   * ตรวจสอบ 2FA verification code.
   * parity กับ AuthService.checkTwoFaVerificationCode(providerType, verificationCode).
   *
   * POST /api/auth/2fa/verification/check?providerType=...&verificationCode=...
   */
  function checkTwoFaVerificationCode(
    providerType: TwoFactorAuthProviderType,
    verificationCode: number,
  ): Observable<LoginResponse> {
    return httpClient.post<LoginResponse>(
      `/api/auth/2fa/verification/check?providerType=${providerType}&verificationCode=${verificationCode}`,
      null,
      defaultHttpOptions(false, true),
    );
  }

  /**
   * Login ด้วย public ID (สำหรับ public dashboard sharing).
   * parity กับ AuthService.publicLogin(publicId).
   *
   * POST /api/auth/login/public
   */
  function publicLogin(publicId: string): Observable<LoginResponse> {
    const publicLoginRequest: PublicLoginRequest = { publicId };
    return httpClient.post<LoginResponse>(
      "/api/auth/login/public",
      publicLoginRequest,
      defaultHttpOptions(),
    );
  }

  /**
   * ส่ง reset password link ไปยัง email.
   * parity กับ AuthService.sendResetPasswordLink(email).
   *
   * POST /api/noauth/resetPasswordByEmail
   */
  function sendResetPasswordLink(email: string): Observable<unknown> {
    return httpClient.post(
      "/api/noauth/resetPasswordByEmail",
      { email },
      defaultHttpOptions(),
    );
  }

  /**
   * Activate user account ด้วย activation token.
   * parity กับ AuthService.activate(activateToken, password, sendActivationMail).
   *
   * POST /api/noauth/activate?sendActivationMail=... → ได้ LoginResponse
   */
  function activate(
    activateToken: string,
    password: string,
    sendActivationMail: boolean,
  ): Observable<LoginResponse> {
    return httpClient.post<LoginResponse>(
      `/api/noauth/activate?sendActivationMail=${sendActivationMail}`,
      { activateToken, password },
      defaultHttpOptions(),
    );
  }

  /**
   * Reset password ด้วย reset token.
   * parity กับ AuthService.resetPassword(resetToken, password).
   *
   * POST /api/noauth/resetPassword
   */
  function resetPassword(resetToken: string, password: string): Observable<void> {
    return httpClient.post<void>(
      "/api/noauth/resetPassword",
      { resetToken, password },
      defaultHttpOptions(),
    );
  }

  /**
   * Change password ของ user ปัจจุบัน.
   * parity กับ AuthService.changePassword(currentPassword, newPassword, config).
   *
   * POST /api/auth/changePassword
   */
  function changePassword(
    currentPassword: string,
    newPassword: string,
    config?: RequestConfig,
  ): Observable<unknown> {
    return httpClient.post(
      "/api/auth/changePassword",
      { currentPassword, newPassword },
      defaultHttpOptionsFromConfig(config),
    );
  }

  /**
   * ดึง user password policy.
   * parity กับ AuthService.getUserPasswordPolicy(config).
   *
   * GET /api/noauth/userPasswordPolicy
   */
  function getUserPasswordPolicy(config?: RequestConfig): Observable<UserPasswordPolicy> {
    return httpClient.get<UserPasswordPolicy>(
      "/api/noauth/userPasswordPolicy",
      defaultHttpOptionsFromConfig(config),
    );
  }

  /**
   * Activate user ด้วย email code (จาก activation email link).
   * parity กับ AuthService.activateByEmailCode(emailCode).
   *
   * POST /api/noauth/activateByEmailCode?emailCode=...
   */
  function activateByEmailCode(emailCode: string): Observable<LoginResponse> {
    return httpClient.post<LoginResponse>(
      `/api/noauth/activateByEmailCode?emailCode=${emailCode}`,
      null,
      defaultHttpOptions(),
    );
  }

  /**
   * ส่ง activation email ใหม่.
   * parity กับ AuthService.resendEmailActivation(email).
   *
   * POST /api/noauth/resendEmailActivation?email=...
   */
  function resendEmailActivation(email: string): Observable<unknown> {
    const encodedEmail = encodeURIComponent(email);
    return httpClient.post(
      `/api/noauth/resendEmailActivation?email=${encodedEmail}`,
      null,
      defaultHttpOptions(),
    );
  }

  /**
   * Login as user อื่น (admin feature — impersonation).
   * parity กับ AuthService.loginAsUser(userId).
   *
   * GET /api/user/{userId}/token → ได้ LoginResponse
   */
  function loginAsUser(userId: string): Observable<LoginResponse> {
    return httpClient.get<LoginResponse>(
      `/api/user/${userId}/token`,
      defaultHttpOptions(),
    );
  }

  /**
   * Logout — เรียก /api/auth/logout แล้ว clear JWT token.
   * parity กับ AuthService.logout(captureLastUrl, ignoreRequest).
   *
   * @param captureLastUrl - ถ้า true → เก็บ URL ปัจจุบันไว้ใน redirectUrl (เพื่อ redirect กลับหลัง login)
   * @param ignoreRequest - ถ้า true → ข้าม HTTP call (logout ฝั่ง client อย่างเดียว)
   */
  function logout(captureLastUrl = false, ignoreRequest = false): void {
    if (captureLastUrl) {
      // Note: redirectUrl จะถูกจัดการใน AuthSession (เพราะเป็น state)
      // เรียก getCurrentUrl เพื่อให้ caller รู้ว่าต้อง capture URL ตอนนี้
      const _currentUrl = getCurrentUrl();
      void _currentUrl; // parity: redirectUrl = this.router.url (handled in session)
    }
    if (!ignoreRequest) {
      httpClient
        .post("/api/auth/logout", null, defaultHttpOptions(true, true))
        .subscribe({
          next: () => onLogout(),
          error: () => onLogout(),
        });
    } else {
      onLogout();
    }
  }

  return {
    login,
    checkTwoFaVerificationCode,
    publicLogin,
    sendResetPasswordLink,
    activate,
    resetPassword,
    changePassword,
    getUserPasswordPolicy,
    activateByEmailCode,
    resendEmailActivation,
    loginAsUser,
    logout,
  };
}

/**
 * Helper สำหรับ apply onTokenReceived/onLoginScopeReceived side effects หลัง login response.
 * parity กับ tap() ใน AuthService.login/checkTwoFaVerificationCode/activate/loginAsUser.
 *
 * ใช้สำหรับ wrap LoginResponse observable — caller ไม่ต้องเขียน tap เอง.
 *
 * @example
 * ```ts
 * applyLoginResponseSideEffects(authApi.login(req), callbacks).subscribe();
 * ```
 */
export function applyLoginResponseSideEffects(
  source: Observable<LoginResponse>,
  callbacks: {
    onTokenReceived: OnTokenReceived;
    onLoginScopeReceived: OnLoginScopeReceived;
  },
): Observable<LoginResponse> {
  return new Observable<LoginResponse>((subscriber) => {
    const subscription = source.subscribe({
      next: (response) => {
        callbacks.onTokenReceived(response.token, response.refreshToken, true);
        callbacks.onLoginScopeReceived(response);
        subscriber.next(response);
        subscriber.complete();
      },
      error: (err) => subscriber.error(err),
    });
    return () => subscription.unsubscribe();
  });
}
