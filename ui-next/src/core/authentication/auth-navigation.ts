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
 * Auth navigation — pure functions สำหรับคำนวณ redirect URL หลัง login/logout.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/auth/auth.service.ts (Group 6: redirect logic)
 *   - gotoDefaultPlace(isAuthenticated)
 *   - forceDefaultPlace(authState, path, params)
 *   - defaultUrl(isAuthenticated, authState, path, params)
 *
 * @reason
 * Angular เดิมใช้ Router DI + NgZone ใน gotoDefaultPlace. ในฝั่ง React ใช้ pure functions
 * ที่รับ authState เป็น parameter แล้ว return URL string — caller (React component)
 * จะเป็นคนเรียก Next.js router.push() เอง. ทำให้ logic test ได้ง่าย (pure functions).
 *
 * API parity กับ Angular:
 *   - gotoDefaultPlace → computeDefaultPlace (คืน URL string แทนการ navigate เอง)
 *   - forceDefaultPlace → shouldForceDefaultPlace
 *   - defaultUrl → computeDefaultUrl
 *
 * @module core/authentication
 */

import { Authority } from "@shared/models/authority.enum";
import { AuthState } from "@core/auth/auth.models";
import { AuthUser } from "@shared/models/user.model";

/**
 * Route params type — parity กับ Angular's Params (object ที่ value เป็น any).
 * ใช้สำหรับ defaultUrl/forceDefaultPlace parameter 'params'.
 */
export interface RouteParams {
  readonly [key: string]: string | undefined;
}

/**
 * ผลลัพธ์ของ computeDefaultUrl — parity กับ Angular UrlTree แต่แปลงเป็น plain string
 * เพื่อให้ใช้กับ Next.js router ได้โดยตรง.
 */
export type DefaultUrlResult = string | null;

/**
 * ตรวจว่า user มี default dashboard หรือไม่.
 * parity กับ AuthService.userHasDefaultDashboard(authState) (private method).
 *
 * @param authState - auth state ปัจจุบัน
 * @returns true ถ้ามี defaultDashboardId ใน userDetails.additionalInfo
 */
export function userHasDefaultDashboard(authState: AuthState | undefined | null): boolean {
  if (!authState || !authState.userDetails || !authState.userDetails.additionalInfo) {
    return false;
  }
  return Boolean(authState.userDetails.additionalInfo.defaultDashboardId);
}

/**
 * ตรวจว่า user มี profile หรือไม่ (ไม่ใช่ public user).
 * parity กับ AuthService.userHasProfile(authUser) (private method).
 *
 * @param authUser - current auth user
 * @returns true ถ้า authUser มีและไม่ใช่ public
 */
export function userHasProfile(authUser: AuthUser | undefined | null): boolean {
  return Boolean(authUser) && !authUser!.isPublic;
}

/**
 * ตรวจว่าควร force redirect ไป default place หรือไม่.
 * parity กับ AuthService.forceDefaultPlace(authState, path, params).
 *
 * ใช้สำหรับ tenant admin / customer user ที่มี default dashboard และเปิด force fullscreen —
 * ทุก route อื่นจะถูก redirect กลับไป default dashboard ยกเว้น:
 *   - /account (user สามารถเข้าได้ถ้ามี profile)
 *   - /dashboard/:id หรือ /dashboards/:id ที่อยู่ใน allowedDashboardIds
 *
 * @param authState - auth state ปัจจุบัน
 * @param path - current route path
 * @param params - current route params (สำหรับเช็ค dashboardId)
 * @returns true ถ้าควร force redirect ไป default place
 */
export function shouldForceDefaultPlace(
  authState: AuthState | undefined | null,
  path?: string,
  params?: RouteParams,
): boolean {
  if (!authState || !authState.authUser) {
    return false;
  }
  const { authUser } = authState;
  if (
    authUser.authority !== Authority.TENANT_ADMIN &&
    authUser.authority !== Authority.CUSTOMER_USER
  ) {
    return false;
  }
  if (!((userHasDefaultDashboard(authState) && authState.forceFullscreen) || authUser.isPublic)) {
    return false;
  }
  if (!path) {
    return true;
  }
  if (path.startsWith("account")) {
    if (userHasProfile(authUser)) {
      return false;
    }
    return true;
  }
  if (
    (path.startsWith("dashboard.") || path.startsWith("dashboards.")) &&
    params &&
    authState.allowedDashboardIds.indexOf(params.dashboardId ?? "") > -1
  ) {
    return false;
  }
  return true;
}

/**
 * คำนวณ default URL หลังจาก login/logout.
 * parity กับ AuthService.defaultUrl(isAuthenticated, authState, path, params).
 *
 * ส่งคืน URL string ที่ caller ควร navigate ไป (หรือ null ถ้าไม่ต้อง navigate).
 *
 * @param isAuthenticated - สถานะ login ปัจจุบัน
 * @param authState - auth state ปัจจุบัน (optional — parity กับ Angular)
 * @param path - current route path (optional)
 * @param params - current route params (optional)
 * @param redirectUrl - URL ที่ต้องการ redirect กลับ (optional — parity กับ this.redirectUrl)
 * @returns URL string ที่ควร navigate ไป หรือ null
 */
export function computeDefaultUrl(
  isAuthenticated: boolean,
  authState?: AuthState,
  path?: string,
  params?: RouteParams,
  redirectUrl?: string | null,
): DefaultUrlResult {
  if (!isAuthenticated) {
    return "login";
  }
  if (!authState || !authState.authUser) {
    return null;
  }
  const { authUser } = authState;

  if (authUser.authority === Authority.PRE_VERIFICATION_TOKEN) {
    return "login/mfa";
  }
  if (authUser.authority === Authority.MFA_CONFIGURATION_TOKEN) {
    return "login/force-mfa";
  }
  if (path && path !== "login" && !shouldForceDefaultPlace(authState, path, params)) {
    // Path ปัจจุบัน valid — ไม่ต้อง redirect
    return null;
  }
  // ต้อง redirect ไป default place
  let result: string;
  if (redirectUrl) {
    result = redirectUrl;
  } else {
    result = "home";
  }
  // Tenant admin / customer user ที่มี default dashboard → redirect ไป dashboard
  if (
    authUser.authority === Authority.TENANT_ADMIN ||
    authUser.authority === Authority.CUSTOMER_USER
  ) {
    if (userHasDefaultDashboard(authState)) {
      const dashboardId = authState.userDetails.additionalInfo.defaultDashboardId;
      if (authState.forceFullscreen) {
        result = `dashboard/${dashboardId}`;
      } else {
        result = `dashboards/${dashboardId}`;
      }
    } else if (authUser.isPublic) {
      result = `dashboard/${authState.lastPublicDashboardId}`;
    }
  }
  return result;
}

/**
 * Options สำหรับ computeDefaultPlace — parity กับ AuthService.gotoDefaultPlace.
 */
export interface ComputeDefaultPlaceOptions {
  /** สถานะ login ปัจจุบัน */
  readonly isAuthenticated: boolean;
  /** Auth state ปัจจุบัน */
  readonly authState?: AuthState;
  /** Current route path */
  readonly path?: string;
  /** Current route params */
  readonly params?: RouteParams;
  /** Redirect URL (สำหรับ redirect กลับหลัง login) */
  readonly redirectUrl?: string | null;
  /**
   * Flag สำหรับ mobile app — parity กับ isMobileApp().
   * ใน mobile app จะไม่ navigate (parity กับ Angular เดิมที่ return ทันทีถ้า isMobileApp()).
   */
  readonly isMobileApp?: boolean;
}

/**
 * คำนวณ default place ที่ควร navigate ไป — pure function.
 * parity กับ AuthService.gotoDefaultPlace(isAuthenticated).
 *
 * ใน Angular เดิมใช้ NgZone + Router.navigateByUrl เพื่อ navigate. ในฝั่ง React ส่งคืน
 * URL string แล้วให้ caller (React component / hook) เป็นคนเรียก router.push() เอง.
 *
 * @param options - navigation options
 * @returns URL string ที่ควร navigate ไป หรือ null ถ้าไม่ต้อง navigate
 */
export function computeDefaultPlace(options: ComputeDefaultPlaceOptions): DefaultUrlResult {
  // parity กับ Angular: if (!isMobileApp()) { ... }
  if (options.isMobileApp) {
    return null;
  }
  return computeDefaultUrl(
    options.isAuthenticated,
    options.authState,
    options.path,
    options.params,
    options.redirectUrl,
  );
}
