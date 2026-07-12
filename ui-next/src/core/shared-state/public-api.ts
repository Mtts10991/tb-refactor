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
 * Public API barrel สำหรับ @core/shared-state module.
 *
 * parity กับ Angular: public-api.ts pattern ที่รวม exports ของ module.
 *
 * @reason
 * ให้ consumers import จาก path เดียว:
 *   import { useAuthState, StoreProvider, startLoading } from "@core/shared-state";
 *
 * แทนที่จะต้อง import แยกจากแต่ละ slice module.
 *
 * @module core/shared-state
 */

export * from "./store-context";
