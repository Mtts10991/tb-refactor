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
 * Authentication interceptor — แนบ JWT token ใน `X-Authorization` header
 * ก่อนที่ request จะถูกส่งออกไป.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/interceptors/global-http-interceptor.ts
 *   - updateAuthorizationHeader() (private method)
 *   - isTokenBasedAuthEntryPoint() (private method)
 *   - jwtIntercept() (private method — เฉพาะส่วนที่ใส่ header)
 *
 * @reason
 * ใน Angular logic นี้อยู่ใน GlobalHttpInterceptor ตัวเดียวกับ error handling + loading.
 * ในฝั่ง React แยกเป็น interceptor ตัวเล็ก ๆ ที่มีหน้าที่เดียว (single responsibility):
 *   - รับ request เข้ามา
 *   - เช็คว่า endpoint เป็น token-based (ไม่ใช่ login/refresh/noauth)
 *   - ถ้าใช่ → แนบ `X-Authorization: Bearer <jwt>` header
 *   - ส่งต่อให้ interceptor ตัวถัดไป
 *
 * สำคัญ: ThingsBoard ใช้ `X-Authorization` (ไม่ใช่ `Authorization` มาตรฐาน!)
 * parity กับ Angular GlobalHttpInterceptor.AUTH_HEADER_NAME = 'X-Authorization'.
 *
 * @module core/http/interceptors
 */

import { Observable } from "rxjs";
import type { HttpInterceptor } from "../http-client";
import { AuthEntryPoint } from "../../error-handling/server-error-codes";

/**
 * Dependencies สำหรับ authentication interceptor.
 * parity กับ static methods ของ Angular AuthService ที่ interceptor เรียก.
 */
export interface AuthInterceptorDependencies {
  /**
   * อ่าน JWT token ปัจจุบัน.
   * parity กับ AuthService.getJwtToken().
   *
   * @returns JWT token string หรือ null ถ้ายังไม่ login
   */
  readonly getJwtToken: () => string | null;
}

/** Auth scheme prefix — parity กับ Angular AUTH_SCHEME = 'Bearer ' */
const AUTH_SCHEME = "Bearer ";
/** Auth header name — parity กับ Angular AUTH_HEADER_NAME = 'X-Authorization' */
const AUTH_HEADER_NAME = "X-Authorization";

/**
 * สร้าง authentication interceptor ที่แนบ JWT token ใน `X-Authorization` header.
 *
 * parity กับส่วน updateAuthorizationHeader() + jwtIntercept() ของ Angular GlobalHttpInterceptor.
 *
 * Algorithm:
 *   1. ถ้า URL ไม่ใช่ /api/* → ส่งต่อเลย (parity กับ Angular: เฉพาะ API requests เท่านั้น)
 *   2. ถ้า URL เป็น token-based auth entry point (login/refresh/noauth) → ส่งต่อโดยไม่แนบ token
 *   3. ถ้ามี JWT token → clone request พร้อมแนบ `X-Authorization: Bearer <token>` header
 *   4. ถ้าไม่มี JWT token → ส่งต่อเลย (error-handling-interceptor จะจัดการ 401 ที่ตามมา)
 *
 * @param deps - dependencies (getJwtToken function)
 * @returns HttpInterceptor ที่พร้อมใช้ใน chain
 *
 * @example
 * ```ts
 * const authInterceptor = createAuthenticationInterceptor({
 *   getJwtToken: () => storeGet("jwt_token"),
 * });
 * ```
 */
export function createAuthenticationInterceptor(
  deps: AuthInterceptorDependencies,
): HttpInterceptor {
  return (request: Request, next: (req: Request) => Observable<Response>): Observable<Response> => {
    // ขั้นที่ 1: เฉพาะ /api/* requests เท่านั้นที่ต้องแนบ token
    // parity กับ Angular intercept(): if (req.url.startsWith('/api/'))
    if (!request.url.startsWith("/api/")) {
      return next(request);
    }

    // ขั้นที่ 2: ข้าม token-based auth entry points (login, refresh, noauth)
    // parity กับ Angular isTokenBasedAuthEntryPoint()
    // หมายเหตุ: ใน Angular ชื่อฟังก์ชันกลับหน้า (true = "ใช่ต้องแนบ token") แต่ logic กลับกัน
    //   isTokenBasedAuthEntryPoint return TRUE = "ต้องแนบ token"
    //   เราใช้ชื่อ isAuthEntryPoint ที่สื่อความหมายตรง: TRUE = "เป็น entry point ที่ auth จัดการเอง"
    if (isAuthEntryPoint(request.url)) {
      return next(request);
    }

    // ขั้นที่ 3: แนบ JWT token ถ้ามี
    // parity กับ Angular updateAuthorizationHeader()
    const jwtToken = deps.getJwtToken();
    if (!jwtToken) {
      // ไม่มี token → ส่งต่อเลย (error-handling-interceptor จะจัดการ 401)
      // parity กับ Angular: ถ้าไม่มี token และ endpoint ต้อง auth → จะเกิด 401
      return next(request);
    }

    // Clone request พร้อมแนบ X-Authorization header
    // parity กับ Angular: req.clone({ setHeaders: { 'X-Authorization': 'Bearer <token>' } })
    const authenticatedRequest = cloneRequestWithAuthHeader(request, jwtToken);
    return next(authenticatedRequest);
  };
}

/**
 * ตรวจสอบว่า URL เป็น auth entry point ที่จัดการ authentication เอง
 * (จึงไม่ต้องแนบ JWT token).
 *
 * parity กับ Angular isTokenBasedAuthEntryPoint() — แต่กลับ logic:
 *   Angular: return TRUE = "ต้องแนบ token" (ไม่ใช่ entry point)
 *   เรา: return TRUE = "เป็น auth entry point" (ไม่ต้องแนบ token)
 *
 * รายการ entry points ที่ auth จัดการเอง:
 *   - /api/auth/login (login ด้วย username/password)
 *   - /api/auth/token (refresh JWT token)
 *   - /api/noauth* (endpoints สาธารณะ)
 *
 * @param url - request URL
 * @returns true ถ้าเป็น auth entry point (ไม่ต้องแนบ token)
 */
function isAuthEntryPoint(url: string): boolean {
  return (
    url.startsWith(AuthEntryPoint.login) ||
    url.startsWith(AuthEntryPoint.tokenRefresh) ||
    url.startsWith(AuthEntryPoint.nonTokenBased)
  );
}

/**
 * Clone fetch Request พร้อมแนบ `X-Authorization: Bearer <token>` header.
 *
 * parity กับ Angular req.clone({ setHeaders: { [AUTH_HEADER_NAME]: ... } }).
 *
 * ใช้ Headers API ของ fetch แทน Angular HttpRequest.clone() เพราะฝั่ง React
 * ใช้ fetch ภายใต้ HttpClient.
 *
 * @param request - original Request object
 * @param jwtToken - JWT token string
 * @returns Request ใหม่ที่มี X-Authorization header แนบอยู่
 */
function cloneRequestWithAuthHeader(request: Request, jwtToken: string): Request {
  const headers = new Headers(request.headers);
  headers.set(AUTH_HEADER_NAME, `${AUTH_SCHEME}${jwtToken}`);
  // Clone request ด้วย init object — ต้องส่ง method/headers/body ให้ครบ
  // เพราะ Request() constructor ไม่ inherit จาก input request ทั้งหมด
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    mode: request.mode,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer,
    integrity: request.integrity,
  });
}
