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
 * Server error codes + i18n key map สำหรับ ThingsBoard REST API errors.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/shared/models/constants.ts
 *   - Constants.serverErrorCode (numeric codes)
 *   - Constants.entryPoints (auth-related URL prefixes)
 *   - serverErrorCodesTranslations (Map<errorCode, i18n key>)
 *
 * @reason
 * ใน Angular constants ทั้งสามนี้อยู่รวมกันในไฟล์ constants.ts ตัวเดียว (2,000+ บรรทัด).
 * ในฝั่ง React แยกออกเป็น module เล็ก ๆ ที่เกี่ยวกับ error handling โดยเฉพาะ เพื่อ:
 *   1. ลด coupling — http-error-parser ไม่ต้อง import constants ตัวใหญ่ทั้งหมด
 *   2. ทำให้ tree-shake ง่ายขึ้น
 *   3. ค้นหาง่าย — คนหา "server error code" จะเจอไฟล์นี้
 *
 * @module core/error-handling
 */

/**
 * Numeric error codes ที่ ThingsBoard server ส่งกลับมาใน error response body
 * ภายใต้ field `errorCode`.
 * parity กับ Constants.serverErrorCode ของ Angular.
 */
export const ServerErrorCode = {
  /** General server error (2) */
  general: 2,
  /** Authentication failure (10) */
  authentication: 10,
  /** JWT token หมดอายุ (11) — interceptor ต้อง trigger refresh */
  jwtTokenExpired: 11,
  /** Tenant trial หมดอายุ (12) */
  tenantTrialExpired: 12,
  /** Credentials หมดอายุ (15) — ต้องเปลี่ยน password */
  credentialsExpired: 15,
  /** Permission denied (20) */
  permissionDenied: 20,
  /** Invalid arguments (30) */
  invalidArguments: 30,
  /** Bad request parameters (31) */
  badRequestParams: 31,
  /** Item not found (32) */
  itemNotFound: 32,
  /** Too many requests (33) — rate limited */
  tooManyRequests: 33,
  /** Too many updates (34) */
  tooManyUpdates: 34,
  /** Entities limit exceeded (41) — เกินโควต้าของ tenant */
  entitiesLimitExceeded: 41,
  /** Password violation (45) */
  passwordViolation: 45,
} as const;

/**
 * Type ของ server error code value (union ของ numeric literals).
 * ใช้สำหรับ type-safe lookup ใน serverErrorCodesTranslations.
 */
export type ServerErrorCodeValue =
  (typeof ServerErrorCode)[keyof typeof ServerErrorCode];

/**
 * Map จาก errorCode (number) → i18n key (string).
 * parity กับ serverErrorCodesTranslations ของ Angular.
 *
 * ใช้สำหรับ translate error message ใน http-error-parser: เมื่อ error response
 * มี errorCode ที่รู้จัก จะดึง i18n key จาก map นี้ แล้วเรียก translate function
 * เพื่อให้ได้ข้อความที่ localize แล้ว.
 */
export const serverErrorCodesTranslations = new Map<number, string>([
  [ServerErrorCode.general, "server-error.general"],
  [ServerErrorCode.authentication, "server-error.authentication"],
  [ServerErrorCode.jwtTokenExpired, "server-error.jwt-token-expired"],
  [ServerErrorCode.tenantTrialExpired, "server-error.tenant-trial-expired"],
  [ServerErrorCode.credentialsExpired, "server-error.credentials-expired"],
  [ServerErrorCode.permissionDenied, "server-error.permission-denied"],
  [ServerErrorCode.invalidArguments, "server-error.invalid-arguments"],
  [ServerErrorCode.badRequestParams, "server-error.bad-request-params"],
  [ServerErrorCode.itemNotFound, "server-error.item-not-found"],
  [ServerErrorCode.tooManyRequests, "server-error.too-many-requests"],
  [ServerErrorCode.tooManyUpdates, "server-error.too-many-updates"],
  [ServerErrorCode.entitiesLimitExceeded, "server-error.entities-limit-exceeded"],
]);

/**
 * Auth-related entry points ที่ interceptor ต้องรู้ (เพื่อ bypass token logic).
 * parity กับ Constants.entryPoints ของ Angular.
 */
export const AuthEntryPoint = {
  /** POST /api/auth/login — login endpoint (รับ credentials, ไม่ต้องใส่ token) */
  login: "/api/auth/login",
  /** POST /api/auth/token — refresh token endpoint (รับ refresh_token, ไม่ต้องใส่ JWT) */
  tokenRefresh: "/api/auth/token",
  /** /api/noauth* — endpoints สาธารณะที่ไม่ต้องการ authentication */
  nonTokenBased: "/api/noauth",
} as const;
