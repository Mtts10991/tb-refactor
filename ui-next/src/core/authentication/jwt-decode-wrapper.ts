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
 * Wrapper สำหรับ jwt-decode library — แทน JwtHelperService ของ @auth0/angular-jwt.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: @auth0/angular-jwt JwtHelperService.decodeToken()
 *
 * @reason
 * Angular เดิมใช้ @auth0/angular-jwt ซึ่งเป็น Angular-specific (ต้องใช้ภายใน Angular DI).
 * ในฝั่ง React/Next.js เปลี่ยนไปใช้ jwt-decode library (ตัวเดียวกัน แต่เป็น framework-agnostic)
 * เพื่อลด coupling กับ Angular และ bundle size.
 *
 * API parity กับ JwtHelperService:
 *   - jwtHelper.decodeToken(token) → decodeJwtToken(token)
 *
 * ส่งคืน decoded token เป็น Record<string, unknown> เพื่อความ type-safe (แทน any ใน Angular เดิม).
 *
 * @module core/authentication
 */

import { jwtDecode } from "jwt-decode";

/**
 * ThingsBoard JWT token payload — parity กับ field ที่ ThingsBoard backend ใส่ใน token.
 * ใช้สำหรับ type assertion หลัง decode (เพื่อให้ TypeScript รู้ field ที่จะใช้งาน).
 *
 * Field parity กับ @shared/models/user.model.ts AuthUser + JWT standard claims:
 *   - sub: user subject (user ID สำหรับ public user)
 *   - iat: issued at (Unix timestamp วินาที)
 *   - exp: expiration time (Unix timestamp วินาที)
 *   - firstName/lastName/isPublic/userId/scopes: ThingsBoard custom claims
 */
export interface ThingsBoardJwtPayload {
  /** User subject (user ID สำหรับ public user, parity กับ AuthUser.sub) */
  sub?: string;
  /** Issued at — Unix timestamp วินาที */
  iat?: number;
  /** Expiration time — Unix timestamp วินาที */
  exp?: number;
  /** User ID (parity กับ AuthUser.userId) */
  userId?: string;
  /** First name (parity กับ AuthUser.firstName) */
  firstName?: string;
  /** Last name (parity กับ AuthUser.lastName) */
  lastName?: string;
  /** Tenant ID */
  tenantId?: string;
  /** Customer ID */
  customerId?: string;
  /** Enabled flag */
  enabled?: boolean;
  /** Scopes array (parity กับ AuthUser.scopes — index 0 คือ authority string) */
  scopes?: string[];
  /** Public user flag (parity กับ AuthUser.isPublic) */
  isPublic?: boolean;
  /** Field อื่นๆ ที่อาจมีใน token */
  [key: string]: unknown;
}

/**
 * Decode JWT token โดยไม่ verify signature (parity กับ JwtHelperService.decodeToken).
 *
 * ใช้ jwt-decode library ภายใต้. ฟังก์ชันนี้จะ throw error ถ้า token ไม่ใช่ JWT ที่ valid format
 * (parity กับ JwtHelperService.decodeToken ที่ throw InvalidTokenError).
 *
 * @example
 * ```ts
 * const payload = decodeJwtToken(token);
 * console.log(payload.sub, payload.userId, payload.exp);
 * ```
 *
 * @param token - JWT token string ที่ต้องการ decode
 * @returns decoded payload ของ token (type ThingsBoardJwtPayload)
 */
export function decodeJwtToken(token: string): ThingsBoardJwtPayload {
  return jwtDecode<ThingsBoardJwtPayload>(token);
}

/**
 * Decode JWT token อย่างปลอดภัย — ไม่ throw ถ้า token invalid.
 *
 * ใช้ในที่ที่ไม่แน่ใจว่า token valid หรือไม่ (เช่น จาก URL query param) —
 * จะ return null แทนการ throw error.
 *
 * @param token - JWT token string ที่ต้องการ decode
 * @returns decoded payload หรือ null ถ้า decode ไม่สำเร็จ
 */
export function tryDecodeJwtToken(token: string | null | undefined): ThingsBoardJwtPayload | null {
  if (!token) {
    return null;
  }
  try {
    return decodeJwtToken(token);
  } catch {
    return null;
  }
}
