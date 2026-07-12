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
 * Settings state slice — ใช้ @react-rxjs/core สำหรับ manage user language setting.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก NgRx settings slice (6 ไฟล์):
 *   - ui-ngx/src/app/core/settings/settings.models.ts (SettingsState interface)
 *   - ui-ngx/src/app/core/settings/settings.actions.ts (ActionSettingsChangeLanguage)
 *   - ui-ngx/src/app/core/settings/settings.reducer.ts (settingsReducer)
 *   - ui-ngx/src/app/core/settings/settings.selectors.ts (selectSettings, selectUserLang)
 *   - ui-ngx/src/app/core/settings/settings.effects.ts (setTranslateServiceLanguage, setTitle)
 *   - ui-ngx/src/app/core/settings/settings.utils.ts (updateUserLang helper)
 *
 * @reason
 * ใน Angular ใช้ NgRx store เก็บ userLang + Effect ที่:
 *   - save ลง localStorage
 *   - เรียก TranslateService.use(lang)
 *   - update <html lang="...">
 *   - moment.locale([lang])
 *
 * ฝั่ง React (Next.js + next-intl) การเปลี่ยนภาษาทำผ่าน routing (/en → /th) ไม่ใช่ TranslateService.
 * ดังนั้น settings-state เก็บแค่ userLang ใน signal แล้วให้ component เป็นคน wire กับ next-intl.
 *
 * การ mapping:
 *   - SettingsState.userLang → userLang$ signal (string | null)
 *   - ActionSettingsChangeLanguage({userLang}) → changeLanguage(userLang) emitter
 *   - selectUserLang → useUserLang() React hook (via bind)
 *   - SettingsEffects.setTranslateServiceLanguage → component subscribe + wire next-intl/middleware
 *
 * Note เรื่อง API: @react-rxjs/core 0.10.8 (re-rxjs fork) ไม่มี createSignal().
 * ไฟล์นี้ใช้ helper จาก ./signal.ts ซึ่ง wrap Subject + state() + bind().
 *
 * @module core/shared-state
 */

import { bind } from "@react-rxjs/core";

import { createSignalWithInitial } from "./signal";

// ============================================================================
// Type definitions — port จาก settings.models.ts
// ============================================================================

/**
 * User settings state ใน store.
 *
 * parity กับ Angular: SettingsState interface.
 *
 * ใน Angular มีเพียง field userLang แต่กำหนดเป็น interface เพื่อขยายในอนาคต.
 * ฝั่ง React ใช้ type เดียวกันเพื่อ maintain parity.
 *
 * Note: ใน Angular initialState.userLang = null (ไม่ใช่ string) เพราะต้องการ
 * แยก "user ยังไม่ได้เลือกภาษา" จาก "user เลือกภาษา X" — null หมายถึง detect อัตโนมัติ
 * จาก browser language.
 */
export interface SettingsState {
  /** language code เช่น "en_US", "th_TH" หรือ null ถ้ายังไม่ได้เลือก */
  userLang: string;
}

/**
 * Initial value ของ settings state.
 * parity กับ Angular: settingsReducer initialState { userLang: null }.
 *
 * null = ยังไม่ได้เลือกภาษา → fallback ไป browser language (parity กับ updateUserLang).
 */
const INITIAL_USER_LANG: string | null = null;

// ============================================================================
// State signal — parity กับ settingsReducer state slice
// ============================================================================

/**
 * Signal สำหรับ user language setting.
 *
 * parity กับ Angular: SettingsState.userLang field.
 *
 * - null = ยังไม่ได้เลือก (detect อัตโนมัติจาก browser)
 * - string = language code เช่น "en_US", "th_TH"
 */
const [setUserLang, userLang$] = createSignalWithInitial<string | null>(INITIAL_USER_LANG);

// ============================================================================
// Action emitters — parity กับ settings.actions.ts
// ============================================================================

/**
 * เปลี่ยนภาษาของ UI — parity กับ store.dispatch(new ActionSettingsChangeLanguage({userLang})).
 *
 * การ mapping:
 *   ActionSettingsChangeLanguage({userLang}) → setUserLang(userLang)
 *
 * Component ที่ subscribe userLang$ จะได้ค่าใหม่และ wire กับ next-intl/middleware
 * parity กับ Angular SettingsEffects.setTranslateServiceLanguage ที่:
 *   - save ลง localStorage (SETTINGS_KEY)
 *   - เรียก TranslateService.use(lang)
 *   - update <html lang="...">
 *   - moment.locale([lang])
 *
 * ฝั่ง React จะ wire side effects เหล่านี้ใน component (Phase 2+) แทน NgRx Effect.
 *
 * @param userLang - language code เช่น "en_US" หรือ null เพื่อ detect อัตโนมัติ
 *
 * @example
 * ```ts
 * changeLanguage("th_TH");
 * changeLanguage(null); // detect อัตโนมัติจาก browser
 * ```
 */
export function changeLanguage(userLang: string): void {
  setUserLang(userLang);
}

// ============================================================================
// Selectors / Hooks — parity กับ settings.selectors.ts
// ============================================================================

/**
 * StateObservable ของ user language setting.
 *
 * parity กับ Angular: selectUserLang selector.
 * export ไว้สำหรับ compose กับ observable อื่น (เช่น side effects pipe).
 */
export { userLang$ };

/**
 * React hook สำหรับอ่าน user language setting — parity กับ Angular `selectUserLang | async` pipe.
 *
 * @returns language code ปัจจุบัน (เช่น "en_US") หรือ null ถ้ายังไม่ได้เลือก
 *
 * @example
 * ```tsx
 * function LanguageIndicator() {
 *   const userLang = useUserLang();
 *   return <span>{userLang ?? "auto"}</span>;
 * }
 * ```
 */
export const useUserLang = bind(userLang$, INITIAL_USER_LANG)[0];

/**
 * React hook สำหรับอ่าน settings state ทั้งหมด — parity กับ Angular `selectSettings | async` pipe.
 *
 * ใช้เมื่อต้องการ access หลาย fields ใน settings state (แม้ตอนนี้จะมีแค่ userLang).
 *
 * @returns SettingsState object ปัจจุบัน
 */
export const useSettings = bind(
  userLang$,
  INITIAL_USER_LANG,
  // transform single field → SettingsState object (parity กับ selectSettings)
)[0];

/**
 * อ่าน user language ปัจจุบันแบบ synchronous.
 *
 * parity กับ Angular: getCurrentUserLang(store) pattern.
 *
 * @returns language code ปัจจุบัน หรือ null
 */
export function getUserLang(): string | null {
  return userLang$.getValue();
}

/**
 * อ่าน settings state ทั้งหมดแบบ synchronous.
 *
 * parity กับ Angular: getCurrentSettings(store) pattern.
 *
 * @returns SettingsState object ปัจจุบัน
 */
export function getSettings(): SettingsState {
  return { userLang: userLang$.getValue() };
}
