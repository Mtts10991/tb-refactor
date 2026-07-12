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
 * AuthSession — orchestrator ที่รวม token-store + refresher + api + navigation + providers.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/auth/auth.service.ts (Group 3 + 5 + glue code)
 *   - loadUser(doTokenRefresh)
 *   - reloadUser()
 *   - setUserFromJwtToken(jwtToken, refreshToken, notify)
 *   - updateAndValidateTokens / updateAndValidateToken
 *   - parsePublicId()
 *   - notifyAuthenticated/notifyUnauthenticated/notifyUserLoaded
 *   - procceedJwtTokenValidate
 *   - loadSystemParams
 *   - showLoginErrorDialog
 *
 * @reason
 * ใน Angular 657 บรรทัด god service. ในฝั่ง React แยกเป็น 6 module เฉพาะทาง แล้ว
 * compose กลับด้วย factory function createAuthSession(deps).
 *
 * AuthSession ทำหน้าที่:
 *   1. Compose dependencies ทั้งหมดเข้าด้วยกัน (token-store, refresher, api, navigation, providers)
 *   2. Manage auth state (notify callbacks เมื่อ authenticated/unauthenticated/user-loaded)
 *   3. Coordinate loadUser flow (public login, query param login, username/password login)
 *   4. Manage redirectUrl state (สำหรับ redirect กลับหลัง login)
 *
 * State parity กับ Angular AuthService instance fields:
 *   - redirectUrl: string | null
 *   - oauth2Clients, twoFactorAuthProviders, forceTwoFactorAuthProviders (cache ใน state object)
 *
 * @module core/authentication
 */

import { Observable, of, ReplaySubject, throwError } from "rxjs";
import { catchError, map, mergeMap } from "rxjs/operators";
import { HttpClient } from "@core/http/http-client";
import { defaultHttpOptions, defaultHttpOptionsFromConfig, RequestConfig } from "@core/http/http-utils";
import { Authority } from "@shared/models/authority.enum";
import {
  LoginRequest,
  LoginResponse,
} from "@shared/models/login.models";
import { AuthPayload, AuthState, SysParams, SysParamsState } from "@core/auth/auth.models";
import { AuthUser, User } from "@shared/models/user.model";
import { OAuth2ClientLoginInfo } from "@shared/models/oauth2.models";
import { TwoFactorAuthProviderType, TwoFaProviderInfo } from "@shared/models/two-factor-auth.models";
import { getQueryParam } from "@core/utils";

import {
  clearTokenData,
  getJwtToken,
  isTokenValid,
  removeStoredToken,
  storeGet,
  storeTokenWithExpiration,
} from "./auth-token-store";
import { decodeJwtToken, tryDecodeJwtToken } from "./jwt-decode-wrapper";
import {
  createAuthTokenRefresher,
  validateAndStoreToken,
  validateAndStoreTokens,
} from "./auth-token-refresher";
import { createAuthApi, applyLoginResponseSideEffects } from "./auth-api";
import {
  createAuthProviders,
  withErrorFallbackAndCache,
} from "./auth-providers";
import { computeDefaultPlace } from "./auth-navigation";

/**
 * Stub Store — parity กับ @ngrx/store Store<AppState>.
 * Phase 1.8 จะ replace ด้วย React state management จริง (Zustand/Redux Toolkit).
 */
export interface AuthStoreStub {
  /**
   * Dispatch auth action — parity กับ store.dispatch(action).
   * Phase 1.8 จะ implement dispatch จริง.
   */
  dispatch: (action: AuthStoreAction) => void;
  /**
   * อ่าน auth state ปัจจุบัน — parity กับ getCurrentAuthState(store).
   */
  getAuthState: () => AuthState | undefined;
  /**
   * อ่าน auth user ปัจจุบัน — parity กับ getCurrentAuthUser(store).
   */
  getAuthUser: () => AuthUser | undefined;
}

/**
 * Auth store action — parity กับ auth.actions.ts ActionAuth*.
 * Phase 1.8 จะ replace ด้วย typed action จริง.
 */
export interface AuthStoreAction {
  readonly type: string;
  readonly payload?: unknown;
}

/**
 * UserService stub — parity กับ ui-ngx UserService.
 * Phase 1.3 ได้ port เป็น ui-next/src/core/http/services/user.service.ts แล้ว
 * แต่ใช้ UserService interface แบบ lightweight ตรงนี้เพื่อลด coupling.
 */
export interface UserServiceStub {
  /** ดึง user details by ID — parity กับ UserService.getUser(userId) */
  getUser: (userId: string) => Observable<User>;
}

/**
 * TimeService stub — parity กับ ui-ngx TimeService.setMaxDatapointsLimit.
 * Phase 1.8 จะ port เป็น module จริง.
 */
export interface TimeServiceStub {
  setMaxDatapointsLimit: (limit: number) => void;
}

/**
 * Callback สำหรับ navigation — parity กับ Router.navigateByUrl + NgZone.run.
 * Phase 1.8 จะใช้ Next.js router.push จริง.
 */
export interface AuthNavigationCallbacks {
  /** Navigate ไปยัง URL — parity กับ router.navigateByUrl(url) */
  navigate: (url: string) => void;
  /** Parse URL เป็น UrlTree-like object — parity กับ router.parseUrl */
  parseUrl: (url: string) => unknown;
  /** อ่าน URL ปัจจุบัน — parity กับ router.url */
  getCurrentUrl: () => string;
}

/**
 * Callback สำหรับ dialog — parity กับ MatDialog + TranslateService.
 * Phase 1.8 จะใช้ React modal จริง.
 */
export interface AuthDialogCallbacks {
  /** แสดง error dialog สำหรับ login error — parity กับ showLoginErrorDialog */
  showLoginErrorDialog: (loginError: string) => void;
  /** แปล i18n key → message — parity กับ TranslateService.instant/get */
  translate: (messageKey: string) => string;
}

/**
 * Query param utilities — parity กับ UtilsService.getQueryParam/removeQueryParams/updateQueryParam.
 */
export interface AuthQueryParamsCallbacks {
  /** อ่าน query param จาก URL — parity กับ utils.getQueryParam(name) */
  getQueryParam: (name: string) => string | null;
  /** ลบ query params ออกจาก URL — parity กับ utils.removeQueryParams(keys) */
  removeQueryParams: (keys: Array<string>) => void;
  /** Update query param — parity กับ utils.updateQueryParam(key, value) */
  updateQueryParam: (key: string, value: string | null) => void;
}

/**
 * Dependencies ทั้งหมดที่ AuthSession ต้องการ.
 */
export interface AuthSessionDependencies {
  /** HTTP client สำหรับเรียก API */
  readonly httpClient: HttpClient;
  /** Auth store stub (Phase 1.8 จะ replace) */
  readonly store: AuthStoreStub;
  /** User service stub สำหรับดึง userDetails */
  readonly userService: UserServiceStub;
  /** Time service stub */
  readonly timeService: TimeServiceStub;
  /** Navigation callbacks */
  readonly navigation: AuthNavigationCallbacks;
  /** Dialog + translation callbacks */
  readonly dialog: AuthDialogCallbacks;
  /** Query params callbacks (default: ใช้ utils.ts getQueryParam + URLSearchParams) */
  readonly queryParams?: AuthQueryParamsCallbacks;
  /** Flag สำหรับ mobile app — parity กับ isMobileApp() */
  readonly isMobileApp?: boolean;
}

/**
 * Auth session state ที่ cache ใน instance.
 * parity กับ AuthService instance fields:
 *   - redirectUrl: string
 *   - oauth2Clients, twoFactorAuthProviders, forceTwoFactorAuthProviders
 */
export interface AuthSessionState {
  redirectUrl: string | null;
  oauth2Clients: Array<OAuth2ClientLoginInfo> | null;
  twoFactorAuthProviders: Array<TwoFaProviderInfo> | null;
  forceTwoFactorAuthProviders: Array<TwoFaProviderInfo> | null;
}

/**
 * สร้าง AuthSession instance — orchestrator ที่ compose dependencies ทั้งหมด.
 *
 * @example
 * ```ts
 * const session = createAuthSession({
 *   httpClient,
 *   store: authStore,
 *   userService,
 *   timeService,
 *   navigation: { navigate: router.push, parseUrl, getCurrentUrl: () => router.pathname },
 *   dialog: { showLoginErrorDialog, translate: t },
 * });
 * session.login({ username, password }).subscribe();
 * ```
 *
 * @param deps - dependencies object
 * @returns auth session API
 */
export function createAuthSession(deps: AuthSessionDependencies): {
  // Public state accessors
  readonly state: AuthSessionState;
  getRedirectUrl: () => string | null;
  setRedirectUrl: (url: string | null) => void;
  getOAuth2Clients: () => Array<OAuth2ClientLoginInfo> | null;
  getTwoFactorAuthProviders: () => Array<TwoFaProviderInfo> | null;
  getForceTwoFactorAuthProviders: () => Array<TwoFaProviderInfo> | null;

  // Token store API (parity กับ AuthService static methods)
  isJwtTokenValid: () => boolean;
  getJwtToken: () => string | null;
  parsePublicId: () => string | null;
  clearJwtToken: () => void;

  // Refresh API (delegated to refresher)
  validateJwtToken: (doRefresh: boolean) => Observable<void>;
  refreshJwtToken: (loadUserElseStoreJwtToken?: boolean) => Observable<LoginResponse>;
  refreshTokenPending: () => boolean;

  // Auth API (delegated to auth-api)
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
  getUserPasswordPolicy: (config?: RequestConfig) => Observable<unknown>;
  activateByEmailCode: (emailCode: string) => Observable<LoginResponse>;
  resendEmailActivation: (email: string) => Observable<unknown>;
  loginAsUser: (userId: string) => Observable<LoginResponse>;
  logout: (captureLastUrl?: boolean, ignoreRequest?: boolean) => void;

  // Providers API (delegated to providers)
  loadOAuth2Clients: () => Observable<Array<OAuth2ClientLoginInfo>>;
  getAvailableTwoFaLoginProviders: () => Observable<Array<TwoFaProviderInfo>>;
  getAvailableTwoFaProviders: () => Observable<Array<TwoFaProviderInfo>>;

  // Navigation API (delegated to navigation)
  gotoDefaultPlace: (isAuthenticated: boolean) => void;

  // Orchestrator methods (Group 3 + 5)
  setUserFromJwtToken: (
    jwtToken: string | null | undefined,
    refreshToken: string | null | undefined,
    notify: boolean,
  ) => Observable<boolean>;
  reloadUser: () => void;
  loadUser: (doTokenRefresh: boolean) => Observable<AuthPayload>;

  // Internal helpers (exported เพื่อให้ refresher เรียกได้)
  updateAndValidateTokens: (jwtToken: string, refreshToken: string, notify: boolean) => void;
  updateAuthUserFromToken: (token: string) => void;
} {
  const {
    httpClient,
    store,
    userService,
    timeService,
    navigation,
    dialog,
    queryParams,
    isMobileApp = false,
  } = deps;

  // State ที่ cache ใน instance (parity กับ AuthService instance fields)
  const sessionState: AuthSessionState = {
    redirectUrl: null,
    oauth2Clients: null,
    twoFactorAuthProviders: null,
    forceTwoFactorAuthProviders: null,
  };

  // Query params callback (default: ใช้ getQueryParam จาก utils.ts)
  const queryParamsImpl: AuthQueryParamsCallbacks = queryParams ?? {
    getQueryParam: (name: string) => getQueryParam(name),
    removeQueryParams: (_keys: Array<string>) => {
      /* parity stub — Phase 1.6 จะ implement จริง */
    },
    updateQueryParam: (_key: string, _value: string | null) => {
      /* parity stub — Phase 1.6 จะ implement จริง */
    },
  };

  // === Group 3: notify helpers (parity กับ AuthService.notify*) ===

  /**
   * Notify store ว่า user authenticated — parity กับ AuthService.notifyAuthenticated(authPayload).
   * dispatch ActionAuthAuthenticated
   */
  function notifyAuthenticated(authPayload: AuthPayload): void {
    store.dispatch({ type: "[Auth] Authenticated", payload: authPayload });
  }

  /**
   * Notify store ว่า user unauthenticated — parity กับ AuthService.notifyUnauthenticated().
   * dispatch ActionAuthUnauthenticated
   */
  function notifyUnauthenticated(): void {
    store.dispatch({ type: "[Auth] Unauthenticated" });
  }

  /**
   * Notify store ว่า user loaded (หรือ failed) — parity กับ AuthService.notifyUserLoaded(isUserLoaded).
   * dispatch ActionAuthLoadUser({isUserLoaded})
   */
  function notifyUserLoaded(isUserLoaded: boolean): void {
    store.dispatch({ type: "[Auth] Load user", payload: { isUserLoaded } });
  }

  // === Group 3: token validation helpers ===

  /**
   * Update + validate tokens ลง localStorage (jwt + refresh).
   * parity กับ AuthService.updateAndValidateTokens(jwtToken, refreshToken, notify).
   */
  function updateAndValidateTokens(
    jwtToken: string,
    refreshToken: string,
    notify: boolean,
  ): void {
    validateAndStoreTokens(jwtToken, refreshToken, notify ? notifyUnauthenticated : () => {});
  }

  /**
   * Update auth user ใน store จาก token ใหม่ (หลัง refresh).
   * parity กับ AuthService.updatedAuthUserFromToken(token).
   *
   * ถ้า token มี sub/firstName/lastName ต่างจาก current auth user → dispatch update.
   */
  function updateAuthUserFromToken(token: string): void {
    const authUser = store.getAuthUser();
    let tokenData: ReturnType<typeof decodeJwtToken> | null = null;
    try {
      tokenData = decodeJwtToken(token);
    } catch {
      tokenData = null;
    }
    if (
      authUser &&
      tokenData &&
      (["sub", "firstName", "lastName"] as const).some(
        (field) => authUser[field] !== tokenData![field],
      )
    ) {
      store.dispatch({
        type: "[Auth] Update auth user",
        payload: {
          sub: tokenData.sub,
          firstName: tokenData.firstName,
          lastName: tokenData.lastName,
        },
      });
    }
  }

  // === Group 3: setUserFromJwtToken (parity กับ AuthService.setUserFromJwtToken) ===

  /**
   * Update auth state จาก JWT token — parity กับ AuthService.setUserFromJwtToken.
   *
   * @param jwtToken - JWT token ใหม่ หรือ null/undefined ถ้า logout
   * @param refreshToken - refresh token ใหม่ หรือ null/undefined
   * @param notify - ถ้า true จะ dispatch auth state changes
   * @returns Observable<boolean> ที่ emit true ถ้า authenticated, false ถ้าไม่
   */
  function setUserFromJwtToken(
    jwtToken: string | null | undefined,
    refreshToken: string | null | undefined,
    notify: boolean,
  ): Observable<boolean> {
    const authenticatedSubject = new ReplaySubject<boolean>();
    if (!jwtToken) {
      clearTokenData();
      if (notify) {
        notifyUnauthenticated();
      }
      authenticatedSubject.next(false);
      authenticatedSubject.complete();
    } else {
      updateAndValidateTokens(jwtToken, refreshToken as string, notify);
      if (notify) {
        notifyUserLoaded(false);
        loadUser(false).subscribe({
          next: (authPayload) => {
            notifyAuthenticated(authPayload);
            notifyUserLoaded(true);
            authenticatedSubject.next(true);
            authenticatedSubject.complete();
          },
          error: () => {
            notifyUnauthenticated();
            notifyUserLoaded(true);
            authenticatedSubject.next(false);
            authenticatedSubject.complete();
          },
        });
      } else {
        loadUser(false).subscribe({
          next: () => {
            authenticatedSubject.next(true);
            authenticatedSubject.complete();
          },
          error: () => {
            authenticatedSubject.next(false);
            authenticatedSubject.complete();
          },
        });
      }
    }
    return authenticatedSubject;
  }

  // === Group 3: clearJwtToken (parity กับ AuthService.clearJwtToken private) ===

  /**
   * Clear JWT token + dispatch unauthenticated.
   * parity กับ AuthService.clearJwtToken() (private method).
   */
  function clearJwtToken(): void {
    setUserFromJwtToken(null, null, true);
  }

  // === Group 5: loadUser flow (parity กับ AuthService.loadUser) ===

  /**
   * ดึง system params จาก server — parity กับ AuthService.loadSystemParams().
   * GET /api/system/params
   */
  function loadSystemParams(): Observable<SysParamsState> {
    return httpClient.get<SysParams>("/api/system/params", defaultHttpOptions()).pipe(
      map((sysParams) => {
        if (sysParams?.maxDatapointsLimit !== undefined) {
          timeService.setMaxDatapointsLimit(sysParams.maxDatapointsLimit);
        }
        return sysParams;
      }),
      catchError(() => of({} as SysParamsState)),
    );
  }

  /**
   * Validate JWT token แล้วดึง auth payload (authUser + userDetails + sysParams).
   * parity กับ AuthService.procceedJwtTokenValidate(doTokenRefresh).
   *
   * Flow:
   *   1. validateJwtToken(doTokenRefresh) — refresh ถ้าจำเป็น
   *   2. decode JWT → authUser + authority
   *   3. ถ้า public user → loadSystemParams + return
   *   4. ถ้า pre-verification/MFA token → return เฉพาะ authUser
   *   5. ถ้า user ทั่วไป → getUser(userId) + loadSystemParams + return
   *
   * @param doTokenRefresh - ถ้า true จะ refresh token ถ้าหมดอายุ
   * @returns Observable<AuthPayload>
   */
  function procceedJwtTokenValidate(doTokenRefresh?: boolean): Observable<AuthPayload> {
    const loadUserSubject = new ReplaySubject<AuthPayload>();
    validateJwtToken(doTokenRefresh).subscribe({
      next: () => {
        let authPayload = {} as AuthPayload;
        const jwtToken = storeGet("jwt_token");
        if (!jwtToken) {
          loadUserSubject.error(null);
          return;
        }
        try {
          authPayload.authUser = decodeJwtToken(jwtToken) as unknown as AuthUser;
        } catch {
          loadUserSubject.error(null);
          return;
        }
        if (authPayload.authUser && authPayload.authUser.scopes && authPayload.authUser.scopes.length) {
          authPayload.authUser.authority = Authority[authPayload.authUser.scopes[0] as keyof typeof Authority];
        } else if (authPayload.authUser) {
          authPayload.authUser.authority = Authority.ANONYMOUS;
        }
        if (authPayload.authUser?.isPublic) {
          authPayload.forceFullscreen = true;
        }
        if (authPayload.authUser?.isPublic) {
          // Public user — โหลด sys params แล้ว return
          loadSystemParams().subscribe({
            next: (sysParams) => {
              authPayload = { ...authPayload, ...sysParams };
              loadUserSubject.next(authPayload);
              loadUserSubject.complete();
            },
            error: (err) => loadUserSubject.error(err),
          });
        } else if (
          authPayload.authUser?.authority === Authority.PRE_VERIFICATION_TOKEN ||
          authPayload.authUser?.authority === Authority.MFA_CONFIGURATION_TOKEN
        ) {
          // MFA token — ไม่ต้องโหลด userDetails
          loadUserSubject.next(authPayload);
          loadUserSubject.complete();
        } else if (authPayload.authUser?.userId) {
          // User ทั่วไป — โหลด userDetails + sys params
          userService.getUser(authPayload.authUser.userId).subscribe({
            next: (user) => {
              authPayload.userDetails = user;
              authPayload.forceFullscreen = false;
              if (userForceFullscreen(authPayload)) {
                authPayload.forceFullscreen = true;
              }
              loadSystemParams().subscribe({
                next: (sysParams) => {
                  authPayload = { ...authPayload, ...sysParams };
                  loadUserSubject.next(authPayload);
                  loadUserSubject.complete();
                },
                error: (err) => {
                  loadUserSubject.error(err);
                  logout();
                },
              });
            },
            error: (err) => {
              loadUserSubject.error(err);
              logout();
            },
          });
        } else {
          loadUserSubject.error(null);
        }
      },
      error: (err) => loadUserSubject.error(err),
    });
    return loadUserSubject;
  }

  /**
   * ตรวจว่า auth payload ควร force fullscreen — parity กับ AuthService.userForceFullscreen.
   */
  function userForceFullscreen(authPayload: AuthPayload): boolean {
    return (
      Boolean(authPayload.authUser && authPayload.authUser.isPublic) ||
      Boolean(
        authPayload.userDetails &&
          authPayload.userDetails.additionalInfo &&
          authPayload.userDetails.additionalInfo.defaultDashboardId &&
          authPayload.userDetails.additionalInfo.defaultDashboardFullscreen &&
          authPayload.userDetails.additionalInfo.defaultDashboardFullscreen === true,
      )
    );
  }

  /**
   * แสดง login error dialog — parity กับ AuthService.showLoginErrorDialog.
   */
  function showLoginErrorDialog(loginError: string): void {
    dialog.showLoginErrorDialog(loginError);
  }

  /**
   * โหลด user จาก token — parity กับ AuthService.loadUser(doTokenRefresh).
   *
   * Flow:
   *   1. ถ้ามี authUser ใน store อยู่แล้ว → return empty payload
   *   2. ถ้ามี publicId ใน query param → publicLogin
   *   3. ถ้ามี accessToken ใน query param → ใช้ token นั้น
   *   4. ถ้ามี username/password ใน query param → login
   *   5. ถ้ามี loginError ใน query param → show dialog
   *   6. fallback → procceedJwtTokenValidate
   *
   * @param doTokenRefresh - ถ้า true จะ refresh token ถ้าหมดอายุ
   * @returns Observable<AuthPayload>
   */
  function loadUser(doTokenRefresh: boolean): Observable<AuthPayload> {
    const authUser = store.getAuthUser();
    if (!authUser) {
      const publicId = queryParamsImpl.getQueryParam("publicId");
      const accessToken = queryParamsImpl.getQueryParam("accessToken");
      const refreshToken = queryParamsImpl.getQueryParam("refreshToken");
      const username = queryParamsImpl.getQueryParam("username");
      const password = queryParamsImpl.getQueryParam("password");
      const loginError = queryParamsImpl.getQueryParam("loginError");

      if (publicId) {
        return publicLogin(publicId).pipe(
          mergeMap((response) => {
            updateAndValidateTokens(response.token, response.refreshToken, false);
            return procceedJwtTokenValidate();
          }),
          catchError(() => {
            queryParamsImpl.updateQueryParam("publicId", null);
            throw Error();
          }),
        );
      }
      if (accessToken) {
        const queryParamsToRemove = ["accessToken"];
        if (refreshToken) {
          queryParamsToRemove.push("refreshToken");
        }
        queryParamsImpl.removeQueryParams(queryParamsToRemove);
        try {
          validateAndStoreToken(accessToken, "jwt_token", notifyUnauthenticated);
          if (refreshToken) {
            validateAndStoreToken(refreshToken, "refresh_token", notifyUnauthenticated);
          } else {
            removeStoredToken("refresh_token");
          }
        } catch (e) {
          return throwError(() => e);
        }
        return procceedJwtTokenValidate();
      }
      if (username && password) {
        queryParamsImpl.updateQueryParam("username", null);
        queryParamsImpl.updateQueryParam("password", null);
        const loginRequest: LoginRequest = { username, password };
        return httpClient
          .post<LoginResponse>("/api/auth/login", loginRequest, defaultHttpOptions())
          .pipe(
            mergeMap((loginResponse: LoginResponse) => {
              updateAndValidateTokens(loginResponse.token, loginResponse.refreshToken, false);
              return procceedJwtTokenValidate();
            }),
          );
      }
      if (loginError) {
        Promise.resolve().then(() => showLoginErrorDialog(loginError));
        queryParamsImpl.updateQueryParam("loginError", null);
        return throwError(() => Error());
      }
      return procceedJwtTokenValidate(doTokenRefresh);
    }
    return of({} as AuthPayload);
  }

  /**
   * Reload user จาก server — parity กับ AuthService.reloadUser().
   *
   * ใช้เมื่อ userDetails อาจเปลี่ยน (เช่น หลัง update profile).
   */
  function reloadUser(): void {
    loadUser(true).subscribe({
      next: (authPayload) => {
        notifyAuthenticated(authPayload);
        notifyUserLoaded(true);
      },
      error: () => {
        notifyUnauthenticated();
        notifyUserLoaded(true);
      },
    });
  }

  // === Group 6: navigation (delegated to auth-navigation) ===

  /**
   * Navigate ไป default place — parity กับ AuthService.gotoDefaultPlace.
   *
   * Phase 1.5: ใช้ navigation.navigate callback (Phase 1.8 จะใช้ Next.js router).
   */
  function gotoDefaultPlace(isAuthenticated: boolean): void {
    if (isMobileApp) {
      return;
    }
    const authState = store.getAuthState();
    const url = computeDefaultPlace({
      isAuthenticated,
      authState,
      redirectUrl: sessionState.redirectUrl,
      isMobileApp,
    });
    if (url) {
      // Consume redirectUrl (parity กับ this.redirectUrl = null)
      sessionState.redirectUrl = null;
      navigation.navigate(url);
    }
  }

  // === Parse publicId from token (parity กับ AuthService.parsePublicId) ===

  /**
   * Parse publicId จาก current JWT token — parity กับ AuthService.parsePublicId().
   *
   * ใช้สำหรับ public dashboard sharing.
   *
   * @returns public user ID (sub claim) หรือ null ถ้าไม่ใช่ public user
   */
  function parsePublicId(): string | null {
    const token = getJwtToken();
    if (!token) {
      return null;
    }
    const tokenData = tryDecodeJwtToken(token);
    if (tokenData && tokenData.isPublic) {
      return tokenData.sub ?? null;
    }
    return null;
  }

  // === Compose sub-modules ===

  // Create auth API (Group 2)
  const authApi = createAuthApi({
    httpClient,
    onTokenReceived: (jwt, refresh, notify) => {
      setUserFromJwtToken(jwt, refresh, notify);
    },
    onLoginScopeReceived: (loginResponse) => {
      // parity กับ AuthService.login tap(): navigate ไป mfa/force-mfa ถ้า scope พิเศษ
      if (loginResponse.scope === Authority.PRE_VERIFICATION_TOKEN) {
        navigation.navigate("login/mfa");
      } else if (loginResponse.scope === Authority.MFA_CONFIGURATION_TOKEN) {
        navigation.navigate("login/force-mfa");
      }
    },
    onLogout: () => clearJwtToken(),
    getCurrentUrl: () => navigation.getCurrentUrl(),
  });

  // Wrap login methods ที่ต้อง apply side effects (token + scope navigation)
  const loginWithSideEffects = (loginRequest: LoginRequest): Observable<LoginResponse> =>
    applyLoginResponseSideEffects(authApi.login(loginRequest), {
      onTokenReceived: (jwt, refresh, notify) => setUserFromJwtToken(jwt, refresh, notify),
      onLoginScopeReceived: (loginResponse) => {
        if (loginResponse.scope === Authority.PRE_VERIFICATION_TOKEN) {
          navigation.navigate("login/mfa");
        } else if (loginResponse.scope === Authority.MFA_CONFIGURATION_TOKEN) {
          navigation.navigate("login/force-mfa");
        }
      },
    });

  const checkTwoFaVerificationCodeWithSideEffects = (
    providerType: TwoFactorAuthProviderType,
    verificationCode: number,
  ): Observable<LoginResponse> =>
    applyLoginResponseSideEffects(
      authApi.checkTwoFaVerificationCode(providerType, verificationCode),
      {
        onTokenReceived: (jwt, refresh, notify) => setUserFromJwtToken(jwt, refresh, notify),
        onLoginScopeReceived: () => {},
      },
    );

  const activateWithSideEffects = (
    activateToken: string,
    password: string,
    sendActivationMail: boolean,
  ): Observable<LoginResponse> =>
    applyLoginResponseSideEffects(
      authApi.activate(activateToken, password, sendActivationMail),
      {
        onTokenReceived: (jwt, refresh, notify) => setUserFromJwtToken(jwt, refresh, notify),
        onLoginScopeReceived: () => {},
      },
    );

  const loginAsUserWithSideEffects = (userId: string): Observable<LoginResponse> =>
    applyLoginResponseSideEffects(authApi.loginAsUser(userId), {
      onTokenReceived: (jwt, refresh, notify) => setUserFromJwtToken(jwt, refresh, notify),
      onLoginScopeReceived: () => {},
    });

  // Wrap changePassword (side effect: update tokens, parity กับ AuthService.changePassword tap)
  const changePasswordWithSideEffects = (
    currentPassword: string,
    newPassword: string,
    config?: RequestConfig,
  ): Observable<unknown> => {
    return new Observable<unknown>((subscriber) => {
      const subscription = authApi
        .changePassword(currentPassword, newPassword, config)
        .subscribe({
          next: (response) => {
            // parity กับ tap((loginResponse: LoginResponse) => setUserFromJwtToken(...))
            // Note: changePassword response อาจเป็น LoginResponse หรือ void แล้วแต่ backend
            const loginResponse = response as LoginResponse;
            if (loginResponse?.token && loginResponse?.refreshToken) {
              setUserFromJwtToken(loginResponse.token, loginResponse.refreshToken, false);
            }
            subscriber.next(response);
            subscriber.complete();
          },
          error: (err) => subscriber.error(err),
        });
      return () => subscription.unsubscribe();
    });
  };

  // Create token refresher (Group 4)
  const tokenRefresher = createAuthTokenRefresher({
    httpClient,
    callbacks: {
      setUserFromJwtToken,
      updateAndValidateTokens,
      updateAuthUserFromToken,
      translate: (key: string) => dialog.translate(key),
    },
  });

  // Wrap logout เพื่อ capture redirectUrl (parity กับ AuthService.logout)
  const logoutWithRedirectCapture = (captureLastUrl = false, ignoreRequest = false): void => {
    if (captureLastUrl) {
      sessionState.redirectUrl = navigation.getCurrentUrl();
    }
    authApi.logout(captureLastUrl, ignoreRequest);
  };

  // Create providers (Group 7)
  const authProviders = createAuthProviders({
    httpClient,
    cacheCallbacks: {
      setOAuth2Clients: (clients) => {
        sessionState.oauth2Clients = clients;
      },
      setTwoFactorAuthProviders: (providers) => {
        sessionState.twoFactorAuthProviders = providers;
      },
      setForceTwoFactorAuthProviders: (providers) => {
        sessionState.forceTwoFactorAuthProviders = providers;
      },
    },
  });

  // Wrap provider methods ด้วย error fallback + cache (parity กับ catchError + tap ใน Angular)
  const loadOAuth2ClientsWithCache = (): Observable<Array<OAuth2ClientLoginInfo>> =>
    withErrorFallbackAndCache(authProviders.loadOAuth2Clients(), (clients) => {
      sessionState.oauth2Clients = clients;
    });

  const getAvailableTwoFaLoginProvidersWithCache = (): Observable<Array<TwoFaProviderInfo>> =>
    withErrorFallbackAndCache(authProviders.getAvailableTwoFaLoginProviders(), (providers) => {
      sessionState.twoFactorAuthProviders = providers;
    });

  const getAvailableTwoFaProvidersWithCache = (): Observable<Array<TwoFaProviderInfo>> =>
    withErrorFallbackAndCache(authProviders.getAvailableTwoFaProviders(), (providers) => {
      sessionState.forceTwoFactorAuthProviders = providers;
    });

  return {
    // Public state
    get state() {
      return sessionState;
    },
    getRedirectUrl: () => sessionState.redirectUrl,
    setRedirectUrl: (url) => {
      sessionState.redirectUrl = url;
    },
    getOAuth2Clients: () => sessionState.oauth2Clients,
    getTwoFactorAuthProviders: () => sessionState.twoFactorAuthProviders,
    getForceTwoFactorAuthProviders: () => sessionState.forceTwoFactorAuthProviders,

    // Token store API
    isJwtTokenValid: () => isTokenValid("jwt_token"),
    getJwtToken: () => getJwtToken(),
    parsePublicId,
    clearJwtToken,

    // Refresh API (delegated to refresher)
    validateJwtToken: tokenRefresher.validateJwtToken,
    refreshJwtToken: tokenRefresher.refreshJwtToken,
    refreshTokenPending: tokenRefresher.refreshTokenPending,

    // Auth API
    login: loginWithSideEffects,
    checkTwoFaVerificationCode: checkTwoFaVerificationCodeWithSideEffects,
    publicLogin: authApi.publicLogin,
    sendResetPasswordLink: authApi.sendResetPasswordLink,
    activate: activateWithSideEffects,
    resetPassword: authApi.resetPassword,
    changePassword: changePasswordWithSideEffects,
    getUserPasswordPolicy: authApi.getUserPasswordPolicy,
    activateByEmailCode: authApi.activateByEmailCode,
    resendEmailActivation: authApi.resendEmailActivation,
    loginAsUser: loginAsUserWithSideEffects,
    logout: logoutWithRedirectCapture,

    // Providers API
    loadOAuth2Clients: loadOAuth2ClientsWithCache,
    getAvailableTwoFaLoginProviders: getAvailableTwoFaLoginProvidersWithCache,
    getAvailableTwoFaProviders: getAvailableTwoFaProvidersWithCache,

    // Navigation
    gotoDefaultPlace,

    // Orchestrator methods
    setUserFromJwtToken,
    reloadUser,
    loadUser,

    // Internal helpers
    updateAndValidateTokens,
    updateAuthUserFromToken,
  };
}

/**
 * Type alias สำหรับ AuthSession return type — ใช้สำหรับ type annotation ใน caller.
 *
 * @example
 * ```ts
 * let session: AuthSession | null = null;
 * session = createAuthSession(deps);
 * ```
 */
export type AuthSession = ReturnType<typeof createAuthSession>;
