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
 * Notification state slice — ใช้ @react-rxjs/core สำหรับ manage toast/snackbar messages.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก NgRx notification slice (4 ไฟล์):
 *   - ui-ngx/src/app/core/notification/notification.models.ts (NotificationState, NotificationMessage, HideNotification, NotificationType)
 *   - ui-ngx/src/app/core/notification/notification.actions.ts (ActionNotificationShow, ActionNotificationHide)
 *   - ui-ngx/src/app/core/notification/notification.reducer.ts (notificationReducer)
 *   - ui-ngx/src/app/core/notification/notification.effects.ts (NotificationEffects → ToastNotificationService)
 *
 * @reason
 * ใน Angular ใช้ NgRx store เก็บ notification state + Effect dispatch ต่อไป ToastNotificationService.
 * ฝั่ง React ใช้ @react-rxjs/core:
 *   - 2 signals สำหรับ show + hide (parity กับ 2 fields ใน NotificationState)
 *   - ไม่ต้องมี Effect เพราะ component ที่ render toast สามารถ subscribe signal ตรง ๆ ได้
 *
 * การ mapping:
 *   - NotificationState.notification → notification$ signal (NotificationMessage | null)
 *   - NotificationState.hideNotification → hideNotification$ signal (HideNotification | null)
 *   - ActionNotificationShow(msg) → showNotification(msg) emitter
 *   - ActionNotificationHide(hide) → hideNotification(hide) emitter
 *   - NotificationEffects.dispatchNotification → component subscribe notification$
 *   - NotificationEffects.hideNotification → component subscribe hideNotification$
 *
 * Note เรื่อง API: @react-rxjs/core 0.10.8 (re-rxjs fork) ไม่มี createSignal().
 * ไฟล์นี้ใช้ helper จาก ./signal.ts ซึ่ง wrap Subject + state() + bind().
 *
 * @module core/shared-state
 */

import { bind } from "@react-rxjs/core";

import { createSignalWithInitial } from "./signal";

// ============================================================================
// Type definitions — port จาก notification.models.ts
// ============================================================================

/**
 * ประเภทของ notification — parity กับ Angular NotificationType.
 * กำหนด style ของ toast (icon, color, duration default).
 */
export type NotificationType = "info" | "warn" | "success" | "error";

/**
 * ตำแหน่งแนวนอนของ toast — parity กับ Angular NotificationHorizontalPosition.
 * parity กับ Material MatSnackBarHorizontalPosition.
 */
export type NotificationHorizontalPosition =
  | "start"
  | "center"
  | "end"
  | "left"
  | "right";

/**
 * ตำแหน่งแนวตั้งของ toast — parity กับ Angular NotificationVerticalPosition.
 * parity กับ Material MatSnackBarVerticalPosition.
 */
export type NotificationVerticalPosition = "top" | "bottom";

/**
 * ข้อความ notification ที่จะแสดงเป็น toast.
 *
 * parity กับ Angular: NotificationMessage class.
 *
 * ใช้เป็น payload ของ showNotification() และค่าใน notification$ signal.
 */
export interface NotificationMessage {
  /** ข้อความที่จะแสดง (i18n key หรือ plain text) */
  message: string;
  /** ประเภท notification กำหนด icon/color */
  type: NotificationType;
  /** target สำหรับ grouping หรือ dismiss เฉพาะ (เช่น "global", "auth-error") */
  target?: string;
  /** duration ใน milliseconds (0 = sticky ไม่หายเอง) */
  duration?: number;
  /** บังคับ dismiss notification อื่นก่อนแสดงอันใหม่ */
  forceDismiss?: boolean;
  /** ตำแหน่งแนวนอน (default ตาม config ของ toast container) */
  horizontalPosition?: NotificationHorizontalPosition;
  /** ตำแหน่งแนวตั้ง (default ตาม config ของ toast container) */
  verticalPosition?: NotificationVerticalPosition;
  /** CSS class(es) เพิ่มเติมสำหรับ style toast panel */
  panelClass?: string | string[];
  /** flag สำหรับ modern toast style (Phase 3 HeroUI) */
  modern?: boolean;
}

/**
 * Trigger สำหรับซ่อน notification ที่กำลังแสดงอยู่.
 *
 * parity กับ Angular: HideNotification class.
 *
 * ถ้า target ระบุ → ซ่อนเฉพาะ notification ที่มี target ตรงกัน
 * ถ้า target undefined → ซ่อนทั้งหมด
 */
export interface HideNotification {
  /** target ของ notification ที่จะซ่อน (undefined = ซ่อนทั้งหมด) */
  target?: string;
}

// ============================================================================
// State signals — parity กับ notificationReducer initialState + state
// ============================================================================

/**
 * Signal สำหรับ notification message ปัจจุบัน.
 *
 * parity กับ Angular: NotificationState.notification field.
 * - null = ไม่มี notification แสดงอยู่
 * - NotificationMessage = มี notification แสดงอยู่
 */
const [setNotification, notification$] = createSignalWithInitial<NotificationMessage | null>(
  null,
);

/**
 * Signal สำหรับ hide notification trigger.
 *
 * parity กับ Angular: NotificationState.hideNotification field.
 * - null = ไม่มีคำสั่ง hide ใหม่
 * - HideNotification = มีคำสั่ง hide (component subscribe เพื่อ dismiss toast)
 */
const [setHideNotification, hideNotification$] = createSignalWithInitial<HideNotification | null>(
  null,
);

// ============================================================================
// Action emitters — parity กับ notification.actions.ts
// ============================================================================

/**
 * แสดง notification — parity กับ store.dispatch(new ActionNotificationShow(msg)).
 *
 * การ mapping:
 *   ActionNotificationShow(notification) → setNotification(notification)
 *
 * Component ที่ render toast จะ subscribe notification$ และแสดง toast ใหม่เมื่อค่าเปลี่ยน.
 * parity กับ Angular NotificationEffects.dispatchNotification ที่ส่งต่อไป ToastNotificationService.
 *
 * @param notification - notification message ที่จะแสดง
 *
 * @example
 * ```ts
 * showNotification({
 *   message: "Login successful",
 *   type: "success",
 *   duration: 3000,
 * });
 * ```
 */
export function showNotification(notification: NotificationMessage): void {
  setNotification(notification);
}

/**
 * ซ่อน notification — parity กับ store.dispatch(new ActionNotificationHide(hide)).
 *
 * การ mapping:
 *   ActionNotificationHide(hideNotification) → setHideNotification(hideNotification)
 *
 * Component ที่ render toast จะ subscribe hideNotification$ และ dismiss toast ตาม target.
 * parity กับ Angular NotificationEffects.hideNotification ที่ส่งต่อไป ToastNotificationService.
 *
 * @param hide - hide notification trigger (ระบุ target หรือ undefined เพื่อซ่อนทั้งหมด)
 *
 * @example
 * ```ts
 * hideNotification({ target: "auth-error" }); // ซ่อนเฉพาะ auth-error
 * hideNotification({}); // ซ่อนทั้งหมด
 * ```
 */
export function hideNotification(hide: HideNotification): void {
  setHideNotification(hide);
}

// ============================================================================
// Selectors / Hooks — parity กับการอ่านจาก store.select(...)
// ============================================================================

/**
 * StateObservable ของ notification message ปัจจุบัน.
 *
 * parity กับ Angular: store.select(state => state.notification.notification).
 * export ไว้สำหรับ compose กับ observable อื่น (เช่น filter by target).
 */
export { notification$ };

/**
 * StateObservable ของ hide notification trigger.
 *
 * parity กับ Angular: store.select(state => state.notification.hideNotification).
 */
export { hideNotification$ };

/**
 * React hook สำหรับอ่าน notification message ปัจจุบัน.
 *
 * parity กับ Angular `selectNotification | async` pipe.
 *
 * @returns NotificationMessage ปัจจุบัน หรือ null ถ้าไม่มี
 *
 * @example
 * ```tsx
 * function ToastContainer() {
 *   const notification = useNotification();
 *   if (!notification) return null;
 *   return <Toast {...notification} />;
 * }
 * ```
 */
export const useNotification = bind(notification$, null)[0];

/**
 * React hook สำหรับอ่าน hide notification trigger ปัจจุบัน.
 *
 * parity กับ Angular `selectHideNotification | async` pipe.
 *
 * @returns HideNotification ถ้ามีคำสั่ง hide ใหม่ หรือ null
 */
export const useHideNotification = bind(hideNotification$, null)[0];

/**
 * อ่าน notification message ปัจจุบันแบบ synchronous.
 *
 * parity กับ Angular: getCurrentNotification(store) pattern.
 *
 * @returns NotificationMessage ปัจจุบัน หรือ null
 */
export function getNotification(): NotificationMessage | null {
  return notification$.getValue();
}

/**
 * อ่าน hide notification trigger ปัจจุบันแบบ synchronous.
 *
 * @returns HideNotification ถ้ามีคำสั่ง hide ใหม่ หรือ null
 */
export function getHideNotification(): HideNotification | null {
  return hideNotification$.getValue();
}
