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
 * Type definitions สำหรับ Auth state — port จาก Angular NgRx auth slice.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/auth/auth.models.ts
 *
 * @reason
 * ใน Angular types นี้อยู่ใน auth.models.ts และใช้ร่วมกันระหว่าง:
 *   - auth.reducer.ts (state shape)
 *   - auth.actions.ts (action payloads)
 *   - auth.selectors.ts (selector return types)
 *   - auth.service.ts (loadUser return type)
 *
 * ฝั่ง React เก็บ types นี้ไว้ที่เดิม (@core/auth/auth.models) เพื่อให้:
 *   - auth-session.ts ยัง import ได้ปกติ (ไม่ต้องแก้ import path)
 *   - shared-state/authentication-state.ts import จากที่นี่เพื่อ share types
 *
 * @module core/auth
 */

import { AuthUser, User } from "@shared/models/user.model";
import { UserSettings } from "@shared/models/user-settings.models";
import { TrendzSettings } from "@shared/models/trendz-settings.models";

/**
 * System parameters ที่ server ส่งกลับจาก GET /api/system/params.
 *
 * parity กับ Angular: SysParamsState interface.
 * ใช้สำหรับเก็บค่า configuration ระดับระบบที่ user ปัจจุบันเห็นได้.
 */
export interface SysParamsState {
  userTokenAccessEnabled: boolean;
  allowedDashboardIds: string[];
  edgesSupportEnabled: boolean;
  hasRepository: boolean;
  tbelEnabled: boolean;
  persistDeviceStateToTelemetry: boolean;
  mobileQrEnabled: boolean;
  userSettings: UserSettings;
  maxResourceSize: number;
  maxDebugModeDurationMinutes: number;
  maxDataPointsPerRollingArg: number;
  maxArgumentsPerCF: number;
  minAllowedDeduplicationIntervalInSecForCF: number;
  minAllowedAggregationIntervalInSecForCF: number;
  minAllowedScheduledUpdateIntervalInSecForCF: number;
  maxRelationLevelPerCfArgument: number;
  maxRelatedEntitiesToReturnPerCfArgument: number;
  ruleChainDebugPerTenantLimitsConfiguration?: string;
  calculatedFieldDebugPerTenantLimitsConfiguration?: string;
  intermediateAggregationIntervalInSecForCF: number;
  trendzSettings: TrendzSettings;
}

/**
 * Extended SysParamsState ที่มี maxDatapointsLimit เพิ่ม.
 *
 * parity กับ Angular: SysParams interface.
 * server ส่งค่านี้มาด้วย แต่ไม่ได้เก็บใน NgRx store (ใช้ส่งต่อให้ TimeService เท่านั้น).
 */
export interface SysParams extends SysParamsState {
  maxDatapointsLimit: number;
}

/**
 * Payload สำหรับ authenticate user — ประกอบด้วย authUser + userDetails + sysParams.
 *
 * parity กับ Angular: AuthPayload interface.
 * ใช้สำหรับ:
 *   - return type ของ AuthService.loadUser()
 *   - payload ของ ActionAuthAuthenticated
 */
export interface AuthPayload extends SysParamsState {
  authUser: AuthUser;
  userDetails: User;
  forceFullscreen: boolean;
}

/**
 * Full auth state ใน store — เพิ่ม flags การจัดการ auth lifecycle.
 *
 * parity กับ Angular: AuthState interface.
 *
 * Fields เพิ่มเติม (นอกเหนือจาก AuthPayload):
 *   - isAuthenticated: user login แล้วหรือยัง
 *   - isUserLoaded: loadUser() ทำงานเสร็จแล้ว (success หรือ fail)
 *   - lastPublicDashboardId: dashboard ID ล่าสุดที่ public user เข้าชม
 */
export interface AuthState extends AuthPayload {
  isAuthenticated: boolean;
  isUserLoaded: boolean;
  lastPublicDashboardId: string;
}
