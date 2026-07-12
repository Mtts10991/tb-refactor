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
 * Re-export ของ load actions จาก shared-state + NgRx-style compatibility classes.
 *
 * @parityEngine Angular
 * ดู implementation จริงได้ที่: ui-next/src/core/shared-state/loading-indicator-state.ts
 * พอร์ตมาจาก: ui-ngx/src/app/core/interceptors/load.actions.ts
 *
 * @reason
 * Phase 1.8 ได้ย้าย loading state ไปที่ @core/shared-state/loading-indicator-state แล้ว
 * (ใช้ @react-rxjs/core). แต่ยังมี consumers ที่ import จาก @core/interceptors/load.actions:
 *   - entities-version-control.service.ts:
 *       import { ActionLoadFinish, ActionLoadStart } from '@core/interceptors/load.actions';
 *       this.store.dispatch(new ActionLoadStart());
 *       this.store.dispatch(new ActionLoadFinish());
 *
 * consumer นี้ยังใช้ NgRx-style `store.dispatch(new ActionXxx())` pattern
 * (Phase 1 stub ที่จะถูก replace ใน Phase 2). เพื่อไม่ให้ import พัง:
 *   - re-export startLoading/finishLoading สำหรับ consumers ใหม่
 *   - export ActionLoadStart/ActionLoadFinish เป็น classes ที่ constructor
 *     เรียก startLoading()/finishLoading() ให้อัตโนมัติ (compatibility shim)
 *
 * Phase 2 จะ refactor consumers ไปใช้ startLoading()/finishLoading() ตรง ๆ → ลบ classes.
 */

import {
  startLoading,
  finishLoading,
  useIsLoading,
  getIsLoading,
} from "@core/shared-state/loading-indicator-state";

// React hooks + emitters (สำหรับ consumers ใหม่ที่ใช้ @react-rxjs/core)
export { startLoading, finishLoading, useIsLoading, getIsLoading };

/**
 * NgRx-style action class สำหรับ ActionLoadStart.
 *
 * parity กับ Angular: class ActionLoadStart implements Action.
 *
 * Constructor จะเรียก startLoading() อัตโนมัติเพื่อ update loading state.
 * ใช้กับ pattern: `store.dispatch(new ActionLoadStart())`
 *
 * Phase 2 จะ replace consumers ให้ใช้ `startLoading()` ตรง ๆ → ลบ class นี้ทิ้ง.
 */
export class ActionLoadStart {
  readonly type = "[Load] Start";

  constructor() {
    // Delegate ไปยัง shared-state emitter จริง (parity กับ reducer ที่ set isLoading=true)
    startLoading();
  }
}

/**
 * NgRx-style action class สำหรับ ActionLoadFinish.
 *
 * parity กับ Angular: class ActionLoadFinish implements Action.
 *
 * Constructor จะเรียก finishLoading() อัตโนมัติเพื่อ update loading state.
 * ใช้กับ pattern: `store.dispatch(new ActionLoadFinish())`
 */
export class ActionLoadFinish {
  readonly type = "[Load] Finish";

  constructor() {
    // Delegate ไปยัง shared-state emitter จริง (parity กับ reducer ที่ set isLoading=false)
    finishLoading();
  }
}
