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
 * Re-export ของ auth selectors จาก shared-state + NgRx-style compatibility shims.
 *
 * @parityEngine Angular
 * ดู implementation จริงได้ที่: ui-next/src/core/shared-state/authentication-state.ts
 *
 * @reason
 * Phase 1.8 ได้ย้าย auth state ไปที่ @core/shared-state/authentication-state แล้ว
 * (ใช้ @react-rxjs/core). แต่ยังมี consumers ที่ import จาก @core/auth/auth.selectors:
 *   - entities-version-control.service.ts: import { selectIsUserLoaded }
 *   - websocket.service.ts: import { selectIsAuthenticated }
 *
 * สอง consumers นี้ยังใช้ NgRx-style store.pipe(select(selector)) pattern
 * (Phase 1 stubs ที่จะถูก replace ใน Phase 2). เพื่อไม่ให้ import พัง:
 *   - re-export React hooks (useAuthState, useIsAuthenticated, ...) สำหรับ consumers ใหม่
 *   - export NgRx-style selector tokens (selectIsAuthenticated, selectIsUserLoaded)
 *     เป็น sentinel objects ให้ consumers เดิม (store stub ไม่ได้ใช้ค่าจริง anyway)
 *
 * Phase 2 จะ refactor consumers ทั้งสองไปใช้ reactive pattern เต็มรูปแบบ.
 */

// React hooks + sync accessors (สำหรับ consumers ใหม่ที่ใช้ @react-rxjs/core)
export {
  useAuthState,
  useIsAuthenticated,
  useIsUserLoaded,
  useUserReady,
  useAuthUser,
  useUserDetails,
  useUserSettings,
  useOpenedMenuSections,
  getCurrentAuthState,
  getCurrentAuthUser,
  getCurrentUserSettings,
  getCurrentOpenedMenuSections,
} from "@core/shared-state/authentication-state";

/**
 * NgRx-style selector token สำหรับ selectIsAuthenticated.
 *
 * parity กับ Angular: selectIsAuthenticated createSelector.
 * เป็น sentinel object เพราะ consumers เดิม (websocket.service) ใช้ stub store
 * ที่ไม่ได้ evaluate selector จริง — แค่ใช้เป็น token สำหรับระบุ state slice.
 *
 * Phase 2 จะ replace consumers ใหม่ → ลบ sentinel นี้ทิ้ง.
 */
export const selectIsAuthenticated = Symbol("selectIsAuthenticated");

/**
 * NgRx-style selector token สำหรับ selectIsUserLoaded.
 *
 * parity กับ Angular: selectIsUserLoaded createSelector.
 * sentinel object สำหรับ entities-version-control.service (Phase 2 จะ replace).
 */
export const selectIsUserLoaded = Symbol("selectIsUserLoaded");
