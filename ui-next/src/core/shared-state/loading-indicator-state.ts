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
 * Loading-indicator state slice — ใช้ @react-rxjs/core สำหรับ track global loading state.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก NgRx load slice (4 ไฟล์):
 *   - ui-ngx/src/app/core/interceptors/load.models.ts (LoadState interface)
 *   - ui-ngx/src/app/core/interceptors/load.actions.ts (ActionLoadStart, ActionLoadFinish)
 *   - ui-ngx/src/app/core/interceptors/load.reducer.ts (loadReducer)
 *   - ui-ngx/src/app/core/interceptors/load.selectors.ts (selectIsLoading, getCurrentIsLoading)
 *
 * @reason
 * ใน Angular ใช้ NgRx store แบบ global singleton (Store<AppState>).
 * ฝั่ง React ใช้ @react-rxjs/core ซึ่งเป็น reactive state management ที่:
 *   - ไม่ต้อง Provider ครอบทั้ง app (observables เป็น module-level singletons)
 *   - integrate กับ React ผ่าน bind() hook โดยตรง
 *   - ลด boilerplate ลงเยอะ (ไม่ต้องเขียน actions/reducers/selectors แยก)
 *
 * การ mapping:
 *   - LoadState.isLoading → state$ observable ตัวเดียว (boolean)
 *   - ActionLoadStart → startLoading() emitter function
 *   - ActionLoadFinish → finishLoading() emitter function
 *   - selectIsLoading selector → useIsLoading() React hook (via bind)
 *   - getCurrentIsLoading(store) → getIsLoading() sync accessor (via stateObservable.getValue)
 *
 * Note เรื่อง API: @react-rxjs/core 0.10.8 (re-rxjs fork) ไม่มี createSignal().
 * ไฟล์นี้ใช้ RxJS Subject + state() + bind() เพื่อสร้าง signal pattern เดียวกัน.
 * ดูรายละเอียดได้ที่ shared-state/signal.ts
 *
 * @module core/shared-state
 */

import { bind } from "@react-rxjs/core";

import { createSignalWithInitial } from "./signal";

/**
 * Initial value ของ loading state.
 * parity กับ Angular: loadReducer initialState { isLoading: false }.
 */
const INITIAL_IS_LOADING = false;

/**
 * Signal สำหรับ loading state (boolean).
 *
 * parity กับ Angular: load reducer state slice `isLoading`.
 *
 * ใช้ createSignalWithInitial เพื่อให้มีค่าเริ่มต้น false ก่อนที่จะมี emit.
 * - setLoading(value) = emitter function (push true = ActionLoadStart, push false = ActionLoadFinish)
 * - isLoading$ = StateObservable ของค่าปัจจุบัน (parity กับ selectIsLoading)
 */
const [setLoading, isLoading$] = createSignalWithInitial<boolean>(INITIAL_IS_LOADING);

/**
 * เริ่ม loading state — parity กับ store.dispatch(new ActionLoadStart()).
 *
 * เรียกโดย loading-indicator-interceptor เมื่อ HTTP request แรกเริ่มทำงาน
 * (activeRequests === 1).
 *
 * @example
 * ```ts
 * startLoading();
 * isLoading$.getValue(); // true
 * ```
 */
export function startLoading(): void {
  setLoading(true);
}

/**
 * จบ loading state — parity กับ store.dispatch(new ActionLoadFinish()).
 *
 * เรียกโดย loading-indicator-interceptor เมื่อ HTTP request สุดท้ายเสร็จ
 * (activeRequests === 0).
 *
 * @example
 * ```ts
 * finishLoading();
 * isLoading$.getValue(); // false
 * ```
 */
export function finishLoading(): void {
  setLoading(false);
}

/**
 * StateObservable ของ loading state.
 *
 * parity กับ Angular: selectIsLoading selector + store.select(selectIsLoading).
 * export ไว้เพื่อให้ downstream modules ใช้ compose กับ observable อื่นได้.
 */
export { isLoading$ };

/**
 * React hook สำหรับอ่าน loading state — parity กับ Angular `selectIsLoading | async` pipe.
 *
 * @returns boolean ที่บอกว่ากำลังมี HTTP request ทำงานอยู่หรือไม่
 *
 * @example
 * ```tsx
 * function LoadingBar() {
 *   const isLoading = useIsLoading();
 *   return isLoading ? <Spinner /> : null;
 * }
 * ```
 */
export const useIsLoading = bind(isLoading$, INITIAL_IS_LOADING)[0];

/**
 * อ่านค่า loading state แบบ synchronous — parity กับ Angular getCurrentIsLoading(store).
 *
 * ใช้ในกรณีที่ต้องการค่าปัจจุบันโดยไม่ subscribe (เช่นใน service, interceptor).
 *
 * @returns boolean ค่า loading state ปัจจุบัน
 */
export function getIsLoading(): boolean {
  // DefaultedStateObservable.getValue() คืนค่าล่าสุดที่ emit หรือ initial value
  return isLoading$.getValue();
}
