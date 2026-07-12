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
 * localStorage token storage — parity กับ static methods ของ AuthService
 * ที่จัดการ JWT/refresh token persistence ใน localStorage.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/auth/auth.service.ts (Group 1: localStorage static methods)
 *
 * @reason
 * ใน Angular เดิม static methods อยู่ใน @Injectable class. ในฝั่ง React/Next.js
 * ไม่มี DI แบบ Angular จึงแยกเป็น module functions แทน — เรียกได้จากทุกที่โดยตรง.
 *
 * API parity กับ Angular AuthService static methods:
 *   - _storeGet(key) → storeGet(key)
 *   - isTokenValid(prefix) → isTokenValid(prefix)
 *   - isJwtTokenValid() → isJwtTokenValid()
 *   - clearTokenData() → clearTokenData()
 *   - getJwtToken() → getJwtToken()
 *
 * Storage keys (parity กับ Angular เดิม):
 *   - jwt_token / jwt_token_expiration
 *   - refresh_token / refresh_token_expiration
 *
 * @module core/authentication
 */

/**
 * localStorage storage key prefixes สำหรับ JWT/refresh token.
 * parity กับ Angular AuthService เดิม.
 */
export type TokenPrefix = "jwt_token" | "refresh_token";

/**
 * อ่านค่าจาก localStorage ด้วย key.
 * parity กับ AuthService._storeGet(key) (private static ใน Angular).
 *
 * @param key - localStorage key
 * @returns value ที่เก็บไว้ หรือ null ถ้าไม่มี
 */
export function storeGet(key: string): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  return localStorage.getItem(key);
}

/**
 * ตรวจว่า token ที่เก็บใน localStorage (ด้วย prefix ที่ระบุ) ยัง valid อยู่หรือไม่.
 * parity กับ AuthService.isTokenValid(prefix) (private static ใน Angular).
 *
 * Token ถือว่า valid เมื่อ:
 *   - มีการบันทึก expiration ไว้
 *   - และเวลาปัจจุบันยังไม่ถึง expiration (มี buffer 2 วินาทีเพื่อกัน race)
 *
 * @param prefix - token prefix ('jwt_token' หรือ 'refresh_token')
 * @returns true ถ้า token ยัง valid
 */
export function isTokenValid(prefix: TokenPrefix): boolean {
  const clientExpiration = storeGet(`${prefix}_expiration`);
  if (!clientExpiration) {
    return false;
  }
  const expirationTime = Number(clientExpiration);
  if (!Number.isFinite(expirationTime)) {
    return false;
  }
  return expirationTime > Date.now() + 2000;
}

/**
 * ตรวจว่า JWT token ปัจจุบันยัง valid อยู่หรือไม่.
 * parity กับ AuthService.isJwtTokenValid() (public static ใน Angular).
 *
 * @returns true ถ้า JWT token ยัง valid
 */
export function isJwtTokenValid(): boolean {
  return isTokenValid("jwt_token");
}

/**
 * ลบ JWT/refresh token และ expiration ออกจาก localStorage ทั้งหมด.
 * parity กับ AuthService.clearTokenData() (private static ใน Angular).
 */
export function clearTokenData(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("jwt_token_expiration");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("refresh_token_expiration");
}

/**
 * อ่าน JWT token ปัจจุบันจาก localStorage.
 * parity กับ AuthService.getJwtToken() (public static ใน Angular).
 *
 * @returns JWT token string หรือ null ถ้าไม่มี
 */
export function getJwtToken(): string | null {
  return storeGet("jwt_token");
}

/**
 * อ่าน refresh token ปัจจุบันจาก localStorage.
 * parity กับ AuthService._storeGet('refresh_token').
 *
 * @returns refresh token string หรือ null ถ้าไม่มี
 */
export function getRefreshToken(): string | null {
  return storeGet("refresh_token");
}

/**
 * บันทึก token + คำนวณ client expiration ลง localStorage.
 * parity กับ AuthService.updateAndValidateToken(token, prefix, notify) —
 * ส่วนที่เก็บ localStorage (ส่วน notify จะถูกจัดการใน auth-session.ts แทน).
 *
 * Client expiration คำนวณจาก TTL (exp - iat) แทนการใช้ exp ตรงๆ เพื่อให้
 * ตรงกับเวลาของ client (ชดเชย clock skew ระหว่าง server กับ client).
 *
 * @param token - JWT/refresh token string
 * @param prefix - storage prefix ('jwt_token' หรือ 'refresh_token')
 * @param issuedAt - claim 'iat' จาก token (เวลาที่ token ออก, Unix timestamp วินาที)
 * @param expirationTime - claim 'exp' จาก token (เวลาที่ token หมดอายุ, Unix timestamp วินาที)
 * @returns true ถ้าบันทึกสำเร็จ (iat/exp valid), false ถ้า token invalid
 */
export function storeTokenWithExpiration(
  token: string,
  prefix: TokenPrefix,
  issuedAt: number | undefined,
  expirationTime: number | undefined,
): boolean {
  if (!issuedAt || !expirationTime) {
    return false;
  }
  const timeToLive = expirationTime - issuedAt;
  if (timeToLive <= 0) {
    return false;
  }
  if (typeof localStorage === "undefined") {
    return false;
  }
  const clientExpiration = Date.now() + timeToLive * 1000;
  localStorage.setItem(prefix, token);
  localStorage.setItem(`${prefix}_expiration`, String(clientExpiration));
  return true;
}

/**
 * ลบ token รายตัวออกจาก localStorage (ทั้ง token + expiration).
 * ใช้สำหรับกรณีที่ต้องการเคลียร์เฉพาะบาง token (เช่น refresh_token ตอน login ด้วย accessToken).
 *
 * @param prefix - storage prefix ที่ต้องการลบ
 */
export function removeStoredToken(prefix: TokenPrefix): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.removeItem(prefix);
  localStorage.removeItem(`${prefix}_expiration`);
}
