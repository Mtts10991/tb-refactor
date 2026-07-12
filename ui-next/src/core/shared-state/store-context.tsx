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
 * StoreProvider — React context ที่รวม shared state ทั้งหมดของ Phase 1.8
 * (auth, settings, notification, loading) เป็น single provider tree.
 *
 * @parityEngine Angular
 * parity กับ: ui-ngx/src/app/core/core.module.ts (ที่ register StoreModule, EffectsModule)
 *   - StoreModule.forRoot(reducers, { metaReducers })
 *   - EffectsModule.forRoot(effects)
 *   - StoreDevModule (dev only)
 *
 * @reason
 * ใน Angular, NgRx store เป็น global singleton ที่ register ใน CoreModule.
 * components  inject Store<AppState> เพื่อ dispatch actions + select state.
 *
 * ฝั่ง React + @react-rxjs/core:
 *   - observables เป็น module-level singletons อยู่แล้ว (ไม่ต้อง Provider)
 *   - แต่ต้องมี <Subscribe> boundary เพื่อ manage subscription lifecycle
 *     ของ components ที่อยู่ในต้นไม้ (auto-unsubscribe เมื่อ unmount)
 *
 * StoreProvider ทำหน้าที่:
 *   1. ห่อ app ด้วย <Subscribe> เพื่อจัดการ subscription lifecycle
 *   2. เป็น extension point สำหรับ Phase 2+ (เช่น inject side-effect pipelines,
 *      wire loading interceptor callbacks, register i18n sync)
 *
 * Note เรื่อง API: @react-rxjs/core 0.10.8 มี Subscribe component สำหรับ
 * จัดการ subscription lifecycle. hooks (useAuthState, useIsLoading, ฯลฯ)
 * สามารถ import ตรงจาก slice modules ได้โดยตรง — StoreProvider เป็นแค่
 * convenience wrapper สำหรับ mount-time setup.
 *
 * @module core/shared-state
 */

"use client";

import React, { type ReactNode } from "react";
import { Subscribe } from "@react-rxjs/core";

// ============================================================================
// Slice modules — import เพื่อ ensure signals ถูก initialize + re-export
// ============================================================================

// ============================================================================
// Re-export hooks (convenience single import)
// ============================================================================

import {
  useAuthState,
  useIsAuthenticated,
  useIsUserLoaded,
  useUserReady,
  useAuthUser,
  useUserDetails,
  useUserTokenAccessEnabled,
  useHasRepository,
  useTbelEnabled,
  usePersistDeviceStateToTelemetry,
  useMobileQrEnabled,
  useHomeDashboardParams,
  useUserSettings,
  useOpenedMenuSections,
  useLastPublicDashboardId,
  getCurrentAuthState,
  getCurrentAuthUser,
  getCurrentUserSettings,
  getCurrentOpenedMenuSections,
  notifyAuthenticated,
  notifyUnauthenticated,
  notifyUserLoaded,
  updateUserDetails,
  updateAuthUser,
  updateLastPublicDashboardId,
  updateHasRepository,
  updateMobileQrEnabled,
  updateOpenedMenuSection,
  putUserSettings,
  deleteUserSettings,
  updateTrendzSettings,
  dispatchAuthAction,
} from "./authentication-state";

import {
  useSettings,
  useUserLang,
  getUserLang,
  getSettings,
  changeLanguage,
} from "./settings-state";

import {
  useNotification,
  useHideNotification,
  getNotification,
  getHideNotification,
  showNotification,
  hideNotification,
  type NotificationMessage,
  type HideNotification,
  type NotificationType,
  type NotificationHorizontalPosition,
  type NotificationVerticalPosition,
} from "./notification-state";

import {
  useIsLoading,
  getIsLoading,
  startLoading,
  finishLoading,
} from "./loading-indicator-state";

// Re-export everything (single import point สำหรับ consumers)
export {
  // Auth state hooks
  useAuthState,
  useIsAuthenticated,
  useIsUserLoaded,
  useUserReady,
  useAuthUser,
  useUserDetails,
  useUserTokenAccessEnabled,
  useHasRepository,
  useTbelEnabled,
  usePersistDeviceStateToTelemetry,
  useMobileQrEnabled,
  useHomeDashboardParams,
  useUserSettings,
  useOpenedMenuSections,
  useLastPublicDashboardId,
  // Auth sync accessors
  getCurrentAuthState,
  getCurrentAuthUser,
  getCurrentUserSettings,
  getCurrentOpenedMenuSections,
  // Auth action creators
  notifyAuthenticated,
  notifyUnauthenticated,
  notifyUserLoaded,
  updateUserDetails,
  updateAuthUser,
  updateLastPublicDashboardId,
  updateHasRepository,
  updateMobileQrEnabled,
  updateOpenedMenuSection,
  putUserSettings,
  deleteUserSettings,
  updateTrendzSettings,
  dispatchAuthAction,
  // Settings hooks
  useSettings,
  useUserLang,
  // Settings sync accessors
  getUserLang,
  getSettings,
  // Settings action creators
  changeLanguage,
  // Notification hooks
  useNotification,
  useHideNotification,
  // Notification sync accessors
  getNotification,
  getHideNotification,
  // Notification action creators
  showNotification,
  hideNotification,
  // Loading hooks
  useIsLoading,
  // Loading sync accessors
  getIsLoading,
  // Loading action creators
  startLoading,
  finishLoading,
};

// Re-export types (separate because `export { type X }` in same block is awkward)
export type {
  NotificationMessage,
  HideNotification,
  NotificationType,
  NotificationHorizontalPosition,
  NotificationVerticalPosition,
};

// ============================================================================
// StoreProvider component
// ============================================================================

/**
 * Props สำหรับ StoreProvider.
 */
export interface StoreProviderProps {
  /** children ที่จะ render ภายใต้ store boundary */
  readonly children: ReactNode;
  /**
   * Optional fallback สำหรับ Suspense boundary ระหว่างที่รอค่าแรกจาก signal.
   * parity กับ Angular resolver ที่รอข้อมูลก่อน route เข้า component.
   */
  readonly fallback?: ReactNode;
}

/**
 * StoreProvider — ห่อ React app ด้วย subscription boundary ของ @react-rxjs/core.
 *
 * parity กับ Angular: CoreModule ที่ register NgRx StoreModule.forRoot().
 *
 * การใช้งาน:
 * ```tsx
 * // app/layout.tsx
 * import { StoreProvider } from "@core/shared-state/store-context";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <StoreProvider>{children}</StoreProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * ภายใต้ <StoreProvider> components สามารถ:
 *   - เรียก useAuthState(), useIsLoading(), useNotification(), useUserLang() ฯลฯ
 *   - subscription lifecycle ถูก manage อัตโนมัติ (auto-unsubscribe เมื่อ unmount)
 *   - ถ้า signal ยังไม่ emit ค่าแรก → ใช้ fallback ของ Suspense
 *
 * @param props - children + optional fallback
 * @returns React element ที่ห่อด้วย <Subscribe>
 */
export function StoreProvider({
  children,
  fallback = null,
}: StoreProviderProps): React.ReactElement {
  // <Subscribe> จาก @react-rxjs/core:
  //   - collects subscriptions ของ children
  //   - unsubscribes ทั้งหมดเมื่อ component unmount
  //   - ถ้ามี fallback → สร้าง Suspense boundary ระหว่างรอค่าแรก
  //
  // parity กับ Angular: ไม่มี direct equivalent เพราะ NgRx store เป็น singleton
  // แต่ pattern นี้เทียบเท่ากับการ register store ใน CoreModule + auto-cleanup
  return <Subscribe fallback={fallback}>{children}</Subscribe>;
}

/**
 * Higher-Order Component สำหรับห่อ component ด้วย StoreProvider.
 *
 * สำหรับใช้ในกรณีที่ไม่สามารถแก้ JSX tree โดยตรงได้ (เช่น Next.js pages).
 *
 * @example
 * ```tsx
 * export default withStore(MyPage);
 * ```
 *
 * @param Component - component ที่จะห่อ
 * @returns component ใหม่ที่ห่อด้วย StoreProvider
 */
export function withStore<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  const WrappedComponent = (props: P): React.ReactElement => (
    <StoreProvider>
      <Component {...props} />
    </StoreProvider>
  );
  WrappedComponent.displayName = `withStore(${Component.displayName ?? Component.name ?? "Component"})`;
  return WrappedComponent;
}

// ============================================================================
// Convenience hook: useStore() — single entry point สำหรับ access state ทั้งหมด
// ============================================================================

/**
 * Object ที่รวม state ทั้งหมดของ Phase 1.8.
 *
 * parity กับ Angular: AppState interface (load, auth, settings, notification).
 *
 * ใช้กับ useStore() hook เพื่อ access หลาย slices ใน component เดียว.
 */
export interface StoreSnapshot {
  /** auth state slice (parity กับ AppState.auth) */
  readonly auth: ReturnType<typeof useAuthState>;
  /** settings state slice (parity กับ AppState.settings) */
  readonly settings: ReturnType<typeof useSettings>;
  /** loading state slice (parity กับ AppState.load.isLoading) */
  readonly isLoading: ReturnType<typeof useIsLoading>;
  /** notification ปัจจุบัน (parity กับ AppState.notification.notification) */
  readonly notification: ReturnType<typeof useNotification>;
}

/**
 * React hook สำหรับ access state ทั้งหมดในครั้งเดียว.
 *
 * parity กับ Angular: store.select(selectAuth, selectSettings, selectIsLoading, selectNotification)
 * ผ่าน combineLatest + map.
 *
 * ใช้เมื่อ component ต้องการ access หลาย slices พร้อมกัน.
 * ถ้าต้องการ slice เดียว → ใช้ hook เฉพาะ (useAuthState, useIsLoading, ฯลฯ)
 * เพื่อลด re-render.
 *
 * @returns StoreSnapshot object ที่รวม state ทั้งหมด
 *
 * @example
 * ```tsx
 * function DebugPanel() {
 *   const store = useStore();
 *   return (
 *     <div>
 *       <span>Auth: {store.auth.isAuthenticated ? "yes" : "no"}</span>
 *       <span>Loading: {store.isLoading ? "yes" : "no"}</span>
 *     </div>
 *   );
 * }
 * ```
 *
 * Note: การใช้ useStore() จะทำให้ component re-render ทุกครั้งที่ state slice
 * อันใดอันหนึ่งเปลี่ยน. แนะนำให้ใช้ hook เฉพาะ slice แทนถ้าต้องการ performance.
 */
export function useStore(): StoreSnapshot {
  return {
    auth: useAuthState(),
    settings: useSettings(),
    isLoading: useIsLoading(),
    notification: useNotification(),
  };
}
