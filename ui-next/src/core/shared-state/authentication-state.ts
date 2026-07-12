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
 * Authentication state slice — ใช้ @react-rxjs/core สำหรับ manage auth lifecycle.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก NgRx auth slice (5 ไฟล์):
 *   - ui-ngx/src/app/core/auth/auth.models.ts → @core/auth/auth.models.ts (already ported)
 *   - ui-ngx/src/app/core/auth/auth.actions.ts (12 action classes)
 *   - ui-ngx/src/app/core/auth/auth.reducer.ts (authReducer + emptyUserAuthState + initialState)
 *   - ui-ngx/src/app/core/auth/auth.selectors.ts (15+ selectors)
 *   - ui-ngx/src/app/core/auth/auth.effects.ts (side effects ใน AuthService แทน)
 *
 * @reason
 * ใน Angular ใช้ NgRx store เก็บ AuthState และ dispatch actions ผ่าน AuthService.notify*.
 * ฝั่ง React ใช้ @react-rxjs/core:
 *   - reducerSignal สำหรับ accumulator pattern (state เดียว หลาย actions)
 *   - authState$ observable + bind() hooks สำหรับ React components
 *   - side effects อยู่ใน auth-session.ts (notifyAuthenticated ฯลฯ) เหมือนเดิม
 *
 * การ mapping:
 *   - AuthState → authState$ (DefaultedStateObservable ผ่าน createReducerSignal)
 *   - 12 auth actions → typed action creators (authenticate, unauthenticate, loadUser, ...)
 *   - 15+ selectors → bind(authState$, selectorFn) hooks
 *
 * Note เรื่อง API: @react-rxjs/core 0.10.8 (re-rxjs fork) ไม่มี createSignal().
 * ไฟล์นี้ใช้ createReducerSignal จาก ./signal.ts (NgRx-style reducer + scan).
 *
 * @module core/shared-state
 */

import { map } from "rxjs/operators";
import { bind } from "@react-rxjs/core";

import type {
  AuthPayload,
  AuthState,
} from "@core/auth/auth.models";
import type { AuthUser, User } from "@shared/models/user.model";
import type { UserSettings } from "@shared/models/user-settings.models";
import type { TrendzSettings } from "@shared/models/trendz-settings.models";
import { initialUserSettings } from "@shared/models/user-settings.models";
import { initialTrendzSettings } from "@shared/models/trendz-settings.models";

import { createReducerSignal } from "./signal";

// ============================================================================
// State definitions — port จาก auth.reducer.ts
// ============================================================================

/**
 * Empty auth payload ที่ใช้ reset state เมื่อ unauthenticated หรือ load user fail.
 *
 * parity กับ Angular: emptyUserAuthState ใน auth.reducer.ts.
 * ทุก fields ถูก set เป็นค่าว่าง/false/empty array เพื่อ clear user-specific data.
 */
const emptyUserAuthState: AuthPayload = {
  authUser: null,
  userDetails: null,
  userTokenAccessEnabled: false,
  forceFullscreen: false,
  allowedDashboardIds: [],
  edgesSupportEnabled: false,
  hasRepository: false,
  tbelEnabled: false,
  persistDeviceStateToTelemetry: false,
  mobileQrEnabled: false,
  maxResourceSize: 0,
  maxArgumentsPerCF: 0,
  minAllowedDeduplicationIntervalInSecForCF: 0,
  minAllowedAggregationIntervalInSecForCF: 0,
  minAllowedScheduledUpdateIntervalInSecForCF: 0,
  maxRelationLevelPerCfArgument: 0,
  maxRelatedEntitiesToReturnPerCfArgument: 0,
  maxDataPointsPerRollingArg: 0,
  maxDebugModeDurationMinutes: 0,
  intermediateAggregationIntervalInSecForCF: 0,
  userSettings: initialUserSettings,
  trendzSettings: initialTrendzSettings,
};

/**
 * Initial state ของ auth slice.
 *
 * parity กับ Angular: initialState ใน auth.reducer.ts.
 * - isAuthenticated: false (ยังไม่ได้ login)
 * - isUserLoaded: false (ยังไม่ได้เรียก loadUser)
 * - lastPublicDashboardId: null
 * - นอกนั้น = emptyUserAuthState
 */
const initialAuthState: AuthState = {
  isAuthenticated: false,
  isUserLoaded: false,
  lastPublicDashboardId: null,
  ...emptyUserAuthState,
};

// ============================================================================
// Action types — port จาก auth.actions.ts
// ============================================================================

/**
 * Union type ของ auth actions — parity กับ Angular AuthActions union.
 *
 * แต่ละ action เป็น discriminated union ด้วย field `type` (string literal).
 * parity กับ Angular action classes ที่มี readonly type + constructor payload.
 */
export type AuthAction =
  | { readonly type: "[Auth] Authenticated"; readonly payload: AuthPayload }
  | { readonly type: "[Auth] Unauthenticated" }
  | { readonly type: "[Auth] Load User"; readonly payload: { isUserLoaded: boolean } }
  | { readonly type: "[Auth] Update User Details"; readonly payload: { userDetails: User } }
  | { readonly type: "[Auth] Update Auth User"; readonly payload: Partial<AuthUser> }
  | {
      readonly type: "[Auth] Update Last Public Dashboard Id";
      readonly payload: { lastPublicDashboardId: string };
    }
  | { readonly type: "[Auth] Change Has Repository"; readonly payload: { hasRepository: boolean } }
  | {
      readonly type: "[Auth] Update Mobile QR Enabled";
      readonly payload: { mobileQrEnabled: boolean };
    }
  | {
      readonly type: "[Preferences] Update Opened Menu Section";
      readonly payload: { path: string; opened: boolean };
    }
  | { readonly type: "[Preferences] Put user settings"; readonly payload: Partial<UserSettings> }
  | {
      readonly type: "[Preferences] Delete user settings";
      readonly payload: Array<string>;
    }
  | { readonly type: "[Auth] Update Trendz Settings"; readonly payload: TrendzSettings };

// ============================================================================
// Reducer — port จาก auth.reducer.ts (authReducer function)
// ============================================================================

/**
 * unset helper — parity กับ lodash _.unset ที่ใช้ใน Angular core/utils.ts.
 *
 * ลบ property ตาม dot-path ออกจาก object (mutate).
 * parity กับ Angular: unset(userSettings, path).
 *
 * @param object - target object (จะถูก mutate)
 * @param path - dot-separated path เช่น "openedMenuSections" หรือ "docLinks.links"
 * @returns true ถ้า property ถูกลบ, false ถ้าไม่มี property นั้น
 */
function unset(object: Record<string, unknown>, path: string): boolean {
  const parts = path.split(".");
  let current: Record<string, unknown> | unknown = object;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof current !== "object" || current === null) {
      return false;
    }
    current = (current as Record<string, unknown>)[parts[i]];
  }
  if (typeof current !== "object" || current === null) {
    return false;
  }
  const lastKey = parts[parts.length - 1];
  return delete (current as Record<string, unknown>)[lastKey];
}

/**
 * Auth reducer — parity กับ Angular authReducer function.
 *
 * Pure function ที่คำนวณ state ใหม่จาก state เดิม + action.
 * รักษา immutability โดยใช้ spread + สร้าง object ใหม่เสมอ (parity กับ Angular reducer).
 *
 * @param state - state ปัจจุบัน
 * @param action - auth action ที่จะ apply
 * @returns state ใหม่หลัง apply action
 */
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "[Auth] Authenticated":
      // parity: return { ...state, isAuthenticated: true, ...action.payload };
      return { ...state, isAuthenticated: true, ...action.payload };

    case "[Auth] Unauthenticated":
      // parity: return { ...state, isAuthenticated: false, ...emptyUserAuthState };
      return { ...state, isAuthenticated: false, ...emptyUserAuthState };

    case "[Auth] Load User": {
      // parity: กรณี isUserLoaded=true → เก็บ isAuthenticated เดิม + payload
      //         กรณี isUserLoaded=false → reset isAuthenticated=false + emptyUserAuthState
      const isUserLoaded = action.payload.isUserLoaded;
      return {
        ...state,
        ...action.payload,
        isAuthenticated: isUserLoaded ? state.isAuthenticated : false,
        ...(isUserLoaded ? {} : emptyUserAuthState),
      };
    }

    case "[Auth] Update User Details":
      // parity: return { ...state, ...action.payload };
      return { ...state, ...action.payload };

    case "[Auth] Update Auth User": {
      // parity: const authUser = {...state.authUser, ...action.payload}; return {...state, authUser};
      const authUser = { ...state.authUser, ...action.payload };
      return { ...state, authUser };
    }

    case "[Auth] Update Last Public Dashboard Id":
      // parity: return { ...state, ...action.payload };
      return { ...state, ...action.payload };

    case "[Auth] Change Has Repository":
      // parity: return { ...state, ...action.payload };
      return { ...state, ...action.payload };

    case "[Auth] Update Mobile QR Enabled":
      // parity: return { ...state, ...action.payload };
      return { ...state, ...action.payload };

    case "[Preferences] Update Opened Menu Section": {
      // parity: อัปเดต Set ของ openedMenuSections (add/remove ตาม opened flag)
      const openedMenuSections = new Set(state.userSettings.openedMenuSections);
      if (action.payload.opened) {
        openedMenuSections.add(action.payload.path);
      } else {
        openedMenuSections.delete(action.payload.path);
      }
      const userSettings: UserSettings = {
        ...state.userSettings,
        openedMenuSections: Array.from(openedMenuSections),
      };
      return { ...state, userSettings };
    }

    case "[Preferences] Put user settings": {
      // parity: merge userSettings เข้ากับ payload
      const userSettings: UserSettings = { ...state.userSettings, ...action.payload };
      return { ...state, userSettings };
    }

    case "[Preferences] Delete user settings": {
      // parity: unset แต่ละ path ออกจาก userSettings (clone ก่อนเพื่อไม่ mutate state เดิม)
      const userSettings: UserSettings = { ...state.userSettings };
      action.payload.forEach((path) => {
        unset(userSettings as unknown as Record<string, unknown>, path);
      });
      return { ...state, userSettings };
    }

    case "[Auth] Update Trendz Settings":
      // parity: return { ...state, trendzSettings: action.payload };
      return { ...state, trendzSettings: action.payload };

    default:
      return state;
  }
}

// ============================================================================
// State signal — createReducerSignal สร้าง dispatch + authState$
// ============================================================================

/**
 * Reducer signal สำหรับ auth state — parity กับ NgRx store feature 'auth'.
 *
 * [dispatchAuth, authState$] = createReducerSignal<AuthState, AuthAction>(...)
 *   - dispatchAuth(action) = parity กับ store.dispatch(action)
 *   - authState$ = parity กับ store.select(selectAuth) (DefaultedStateObservable)
 */
const [dispatchAuth, authState$] = createReducerSignal<AuthState, AuthAction>(
  initialAuthState,
  authReducer,
);

// ============================================================================
// Action creators — parity กับ auth.actions.ts Action classes
// ============================================================================

/**
 * Notify ว่า user authenticated — parity กับ new ActionAuthAuthenticated(payload).
 *
 * @param payload - auth payload (authUser + userDetails + sysParams)
 *
 * @example
 * ```ts
 * notifyAuthenticated({ authUser, userDetails, ...sysParams });
 * ```
 */
export function notifyAuthenticated(payload: AuthPayload): void {
  dispatchAuth({ type: "[Auth] Authenticated", payload });
}

/**
 * Notify ว่า user unauthenticated — parity กับ new ActionAuthUnauthenticated().
 *
 * @example
 * ```ts
 * notifyUnauthenticated();
 * ```
 */
export function notifyUnauthenticated(): void {
  dispatchAuth({ type: "[Auth] Unauthenticated" });
}

/**
 * Notify ว่า user loaded (หรือ failed) — parity กับ new ActionAuthLoadUser({isUserLoaded}).
 *
 * @param isUserLoaded - true ถ้า load สำเร็จ, false ถ้า fail
 *
 * @example
 * ```ts
 * notifyUserLoaded(true);  // load สำเร็จ
 * notifyUserLoaded(false); // load fail → reset auth state
 * ```
 */
export function notifyUserLoaded(isUserLoaded: boolean): void {
  dispatchAuth({ type: "[Auth] Load User", payload: { isUserLoaded } });
}

/**
 * Update user details — parity กับ new ActionAuthUpdateUserDetails({userDetails}).
 *
 * @param userDetails - user object ใหม่จาก server
 */
export function updateUserDetails(userDetails: User): void {
  dispatchAuth({ type: "[Auth] Update User Details", payload: { userDetails } });
}

/**
 * Update auth user (partial) — parity กับ new ActionAuthUpdateAuthUser(partial).
 *
 * @param payload - partial AuthUser fields ที่จะ merge
 *
 * @example
 * ```ts
 * updateAuthUser({ firstName: "New", lastName: "Name" });
 * ```
 */
export function updateAuthUser(payload: Partial<AuthUser>): void {
  dispatchAuth({ type: "[Auth] Update Auth User", payload });
}

/**
 * Update last public dashboard ID — parity กับ new ActionAuthUpdateLastPublicDashboardId({lastPublicDashboardId}).
 *
 * @param lastPublicDashboardId - dashboard ID ล่าสุดที่ public user เข้าชม
 */
export function updateLastPublicDashboardId(lastPublicDashboardId: string): void {
  dispatchAuth({
    type: "[Auth] Update Last Public Dashboard Id",
    payload: { lastPublicDashboardId },
  });
}

/**
 * Update hasRepository flag — parity กับ new ActionAuthUpdateHasRepository({hasRepository}).
 *
 * @param hasRepository - true ถ้า tenant มี VC repository enabled
 */
export function updateHasRepository(hasRepository: boolean): void {
  dispatchAuth({ type: "[Auth] Change Has Repository", payload: { hasRepository } });
}

/**
 * Update mobile QR enabled flag — parity กับ new ActionUpdateMobileQrCodeEnabled({mobileQrEnabled}).
 *
 * @param mobileQrEnabled - true ถ้า mobile QR code feature เปิดอยู่
 */
export function updateMobileQrEnabled(mobileQrEnabled: boolean): void {
  dispatchAuth({ type: "[Auth] Update Mobile QR Enabled", payload: { mobileQrEnabled } });
}

/**
 * Update opened menu section — parity กับ new ActionPreferencesUpdateOpenedMenuSection({path, opened}).
 *
 * @param path - menu section path เช่น "home.dashboard"
 * @param opened - true ถ้า expand, false ถ้า collapse
 */
export function updateOpenedMenuSection(path: string, opened: boolean): void {
  dispatchAuth({
    type: "[Preferences] Update Opened Menu Section",
    payload: { path, opened },
  });
}

/**
 * Put user settings (merge) — parity กับ new ActionPreferencesPutUserSettings(partial).
 *
 * @param payload - partial UserSettings fields ที่จะ merge
 */
export function putUserSettings(payload: Partial<UserSettings>): void {
  dispatchAuth({ type: "[Preferences] Put user settings", payload });
}

/**
 * Delete user settings (unset paths) — parity กับ new ActionPreferencesDeleteUserSettings(paths).
 *
 * @param paths - array ของ dot-paths ที่จะ unset เช่น ["docLinks.links", "lang"]
 */
export function deleteUserSettings(paths: Array<string>): void {
  dispatchAuth({ type: "[Preferences] Delete user settings", payload: paths });
}

/**
 * Update Trendz settings — parity กับ new ActionAuthUpdateTrendzSettings(settings).
 *
 * @param payload - TrendzSettings ใหม่
 */
export function updateTrendzSettings(payload: TrendzSettings): void {
  dispatchAuth({ type: "[Auth] Update Trendz Settings", payload });
}

/**
 * Generic dispatch สำหรับใช้จาก auth-session.ts (parity กับ store.dispatch({type, payload})).
 *
 * auth-session.ts ใช้ generic dispatch pattern:
 *   store.dispatch({ type: "[Auth] Authenticated", payload: authPayload })
 *
 * export นี้ให้สามารถ dispatch action แบบ generic ได้โดยไม่ต้อง import action creator แต่ละตัว.
 * ใน Phase 2 จะค่อย ๆ เปลี่ยนไปใช้ typed action creators (notifyAuthenticated ฯลฯ).
 *
 * @param action - auth action object (ต้องมี type ที่ตรงกับ AuthAction)
 */
export function dispatchAuthAction(action: AuthAction): void {
  dispatchAuth(action);
}

// ============================================================================
// Selectors / Hooks — parity กับ auth.selectors.ts
// ============================================================================

/**
 * StateObservable ของ auth state ทั้งหมด.
 *
 * parity กับ Angular: selectAuth selector + store.select(selectAuth).
 * export ไว้สำหรับ compose กับ observable อื่น (เช่น derive selectors).
 */
export { authState$ };

/**
 * React hook สำหรับอ่าน auth state ทั้งหมด — parity กับ Angular `selectAuth | async`.
 *
 * @returns AuthState object ปัจจุบัน
 *
 * @example
 * ```tsx
 * function AuthDebug() {
 *   const auth = useAuthState();
 *   return <pre>{JSON.stringify(auth, null, 2)}</pre>;
 * }
 * ```
 */
export const useAuthState = bind(authState$, initialAuthState)[0];

/**
 * React hook สำหรับ check ว่า user authenticated แล้วหรือยัง.
 *
 * parity กับ Angular: selectIsAuthenticated selector.
 *
 * @returns true ถ้า user login แล้ว
 */
export const useIsAuthenticated = bind(
  authState$.pipe(map((state) => state.isAuthenticated)),
  initialAuthState.isAuthenticated,
)[0];

/**
 * React hook สำหรับ check ว่า user loaded แล้วหรือยัง.
 *
 * parity กับ Angular: selectIsUserLoaded selector.
 *
 * @returns true ถ้า loadUser() ทำงานเสร็จแล้ว (success หรือ fail)
 */
export const useIsUserLoaded = bind(
  authState$.pipe(map((state) => state.isUserLoaded)),
  initialAuthState.isUserLoaded,
)[0];

/**
 * React hook สำหรับอ่าน user readiness status.
 *
 * parity กับ Angular: selectUserReady selector (combineLatest of isAuthenticated + isUserLoaded).
 *
 * @returns object { isAuthenticated, isUserLoaded } สำหรับ gate UI rendering
 */
export const useUserReady = bind(
  authState$.pipe(
    map((state) => ({
      isAuthenticated: state.isAuthenticated,
      isUserLoaded: state.isUserLoaded,
    })),
  ),
  { isAuthenticated: false, isUserLoaded: false },
)[0];

/**
 * React hook สำหรับอ่าน auth user ปัจจุบัน.
 *
 * parity กับ Angular: selectAuthUser selector.
 *
 * @returns AuthUser ปัจจุบัน หรือ null ถ้าไม่ได้ login
 */
export const useAuthUser = bind(
  authState$.pipe(map((state) => state.authUser)),
  initialAuthState.authUser,
)[0];

/**
 * React hook สำหรับอ่าน user details.
 *
 * parity กับ Angular: selectUserDetails selector.
 *
 * @returns User object ปัจจุบัน หรือ null ถ้าไม่ได้ login
 */
export const useUserDetails = bind(
  authState$.pipe(map((state) => state.userDetails)),
  initialAuthState.userDetails,
)[0];

/**
 * React hook สำหรับ check ว่า user token access enabled หรือไม่.
 *
 * parity กับ Angular: selectUserTokenAccessEnabled selector.
 */
export const useUserTokenAccessEnabled = bind(
  authState$.pipe(map((state) => state.userTokenAccessEnabled)),
  initialAuthState.userTokenAccessEnabled,
)[0];

/**
 * React hook สำหรับ check ว่า tenant มี repository หรือไม่.
 *
 * parity กับ Angular: selectHasRepository selector.
 */
export const useHasRepository = bind(
  authState$.pipe(map((state) => state.hasRepository)),
  initialAuthState.hasRepository,
)[0];

/**
 * React hook สำหรับ check ว่า TBEL enabled หรือไม่.
 *
 * parity กับ Angular: selectTbelEnabled selector.
 */
export const useTbelEnabled = bind(
  authState$.pipe(map((state) => state.tbelEnabled)),
  initialAuthState.tbelEnabled,
)[0];

/**
 * React hook สำหรับ check ว่า persist device state to telemetry enabled.
 *
 * parity กับ Angular: selectPersistDeviceStateToTelemetry selector.
 */
export const usePersistDeviceStateToTelemetry = bind(
  authState$.pipe(map((state) => state.persistDeviceStateToTelemetry)),
  initialAuthState.persistDeviceStateToTelemetry,
)[0];

/**
 * React hook สำหรับ check ว่า mobile QR code enabled.
 *
 * parity กับ Angular: selectMobileQrEnabled selector.
 */
export const useMobileQrEnabled = bind(
  authState$.pipe(map((state) => state.mobileQrEnabled)),
  initialAuthState.mobileQrEnabled,
)[0];

/**
 * React hook สำหรับอ่าน home dashboard params.
 *
 * parity กับ Angular: selectHomeDashboardParams selector
 * (combineLatest of persistDeviceStateToTelemetry + mobileQrEnabled).
 */
export const useHomeDashboardParams = bind(
  authState$.pipe(
    map((state) => ({
      persistDeviceStateToTelemetry: state.persistDeviceStateToTelemetry,
      mobileQrEnabled: state.mobileQrEnabled,
    })),
  ),
  {
    persistDeviceStateToTelemetry: initialAuthState.persistDeviceStateToTelemetry,
    mobileQrEnabled: initialAuthState.mobileQrEnabled,
  },
)[0];

/**
 * React hook สำหรับอ่าน user settings.
 *
 * parity กับ Angular: selectUserSettings selector.
 */
export const useUserSettings = bind(
  authState$.pipe(map((state) => state.userSettings)),
  initialAuthState.userSettings,
)[0];

/**
 * React hook สำหรับอ่าน opened menu sections.
 *
 * parity กับ Angular: selectOpenedMenuSections selector.
 *
 * @returns array ของ menu section paths ที่ expand อยู่
 */
export const useOpenedMenuSections = bind(
  authState$.pipe(map((state) => state.userSettings.openedMenuSections)),
  initialAuthState.userSettings.openedMenuSections,
)[0];

/**
 * React hook สำหรับอ่าน last public dashboard ID.
 */
export const useLastPublicDashboardId = bind(
  authState$.pipe(map((state) => state.lastPublicDashboardId)),
  initialAuthState.lastPublicDashboardId,
)[0];

// ============================================================================
// Sync accessors — parity กับ getCurrentAuthState/getCurrentAuthUser pattern
// ============================================================================

/**
 * อ่าน auth state ทั้งหมดแบบ synchronous.
 *
 * parity กับ Angular: getCurrentAuthState(store).
 *
 * @returns AuthState object ปัจจุบัน
 */
export function getCurrentAuthState(): AuthState {
  return authState$.getValue();
}

/**
 * อ่าน auth user ปัจจุบันแบบ synchronous.
 *
 * parity กับ Angular: getCurrentAuthUser(store).
 *
 * @returns AuthUser ปัจจุบัน หรือ null
 */
export function getCurrentAuthUser(): AuthUser | null {
  return authState$.getValue().authUser;
}

/**
 * อ่าน user settings ปัจจุบันแบบ synchronous.
 *
 * parity กับ Angular: getCurrentUserSettings(store).
 *
 * @returns UserSettings object ปัจจุบัน
 */
export function getCurrentUserSettings(): UserSettings {
  return authState$.getValue().userSettings;
}

/**
 * อ่าน opened menu sections แบบ synchronous.
 *
 * parity กับ Angular: getCurrentOpenedMenuSections(store).
 *
 * @returns array ของ menu section paths ที่ expand อยู่
 */
export function getCurrentOpenedMenuSections(): string[] {
  return authState$.getValue().userSettings.openedMenuSections;
}
