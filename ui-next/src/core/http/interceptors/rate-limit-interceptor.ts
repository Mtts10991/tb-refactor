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
 * Rate-limit interceptor — retry HTTP 429 (Too Many Requests) โดยอัตโนมัติ
 * ด้วย jitter delay.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/interceptors/global-http-interceptor.ts
 *   - retryRequest() (private method)
 *   - ส่วน status === 429 ใน handleResponseError()
 *
 * @reason
 * ใน Angular logic นี้อยู่ใน GlobalHttpInterceptor ตัวเดียวกับ auth + error handling.
 * ในฝั่ง React แยกเป็น interceptor ตัวเล็ก ๆ ที่มีหน้าที่เดียว:
 *   ถ้าเจอ 429 และ config.resendRequest === true → retry หลัง jitter delay
 *
 * Jitter delay formula (parity กับ Angular ทุกประการ):
 *   thisTimeout = 1000 + Math.random() * 3000   // → 1,000 - 4,000 ms
 *
 * ข้อแตกต่างจาก Angular:
 *   - Angular ไม่จำกัด max retries (retry ได้ไม่จำกัดจนกว่าจะสำเร็จหรือ non-429)
 *   - เราเพิ่ม max retries = 3 เพื่อกัน infinite loop (กัน DoS ตัวเองเผื่อ server config ผิด)
 *     แต่ parity formula และ parity การ trigger (เฉพาะเมื่อ resendRequest === true)
 *
 * @module core/http/interceptors
 */

import { Observable, of, throwError } from "rxjs";
import { delay, mergeMap, retryWhen } from "rxjs/operators";
import type { HttpInterceptor } from "../http-client";

/**
 * Default max retries สำหรับ 429.
 * parity กับ Angular: เดิมไม่จำกัด แต่เราจำกัดเพื่อกัน infinite loop.
 */
export const DEFAULT_MAX_429_RETRIES = 3;

/**
 * Dependencies สำหรับ rate-limit interceptor.
 */
export interface RateLimitInterceptorDependencies {
  /**
   * Max จำนวน retries สำหรับ 429 (default: 3).
   * parity: Angular ไม่จำกัด, เราเพิ่มเพื่อ safety.
   */
  readonly maxRetries?: number;
}

/**
 * สร้าง rate-limit interceptor ที่ retry 429 ด้วย jitter delay.
 *
 * parity กับส่วน retryRequest() + status === 429 ของ Angular GlobalHttpInterceptor.
 *
 * Algorithm:
 *   1. ส่ง request ผ่าน chain ตามปกติ
 *   2. ถ้าได้ error response กลับมา → เช็ค status
 *   3. ถ้า status === 429 และ config.resendRequest === true:
 *      - รอ jitter delay = 1000 + random*3000 ms
 *      - retry request (จนกว่าจะสำเร็จ, non-429, หรือถึง maxRetries)
 *   4. ถ้า status อื่น หรือ resendRequest !== true → ส่ง error ต่อไปให้ chain
 *
 * @param deps - dependencies (maxRetries, optional)
 * @returns HttpInterceptor ที่พร้อมใช้ใน chain
 *
 * @example
 * ```ts
 * const rateLimitInterceptor = createRateLimitInterceptor({ maxRetries: 3 });
 * ```
 */
export function createRateLimitInterceptor(
  deps: RateLimitInterceptorDependencies = {},
): HttpInterceptor {
  const maxRetries = deps.maxRetries ?? DEFAULT_MAX_429_RETRIES;

  return (request: Request, next: (req: Request) => Observable<Response>): Observable<Response> => {
    let retryCount = 0;

    return next(request).pipe(
      retryWhen((errors$: Observable<unknown>) =>
        errors$.pipe(
          mergeMap((error: unknown): Observable<unknown> => {
            // เช็คว่า error เป็น 429 หรือไม่
            const status = getErrorStatus(error);
            const shouldResend = shouldResendRequest(request);

            if (status === 429 && shouldResend && retryCount < maxRetries) {
              retryCount++;
              // Jitter delay: 1000 + random*3000 ms
              // parity กับ Angular: const thisTimeout = 1000 + Math.random() * 3000;
              const jitterDelay = 1000 + Math.random() * 3000;
              // ส่ง null ออกไปเพื่อ trigger retry (of(null) + delay)
              return of(null).pipe(delay(jitterDelay));
            }
            // ไม่ใช่ 429 หรือ retry หมดแล้ว → ส่ง error ต่อ (หยุด retry)
            return throwError(() => error);
          }),
        ),
      ),
    );
  };
}

/**
 * ดึง status code จาก error object.
 *
 * parity: Angular HttpErrorResponse.status — ฝั่ง fetch error อาจเป็น custom object
 * ที่มี status field, หรือ Error ธรรมดา (network error → status 0).
 */
function getErrorStatus(error: unknown): number {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    return typeof status === "number" ? status : 0;
  }
  return 0;
}

/**
 * ตรวจสอบว่า request นี้ควร retry เมื่อ 429 หรือไม่ (ตาม InterceptorConfig.resendRequest).
 *
 * parity กับ Angular: config.resendRequest ใน InterceptorConfig.
 *
 * ฝั่ง fetch: Phase 1.7 จะ wire กับ WeakMap<Request, InterceptorConfig>.
 * ตอนนี้ return true (default = retry ทุก request ที่เจอ 429 — ปลอดภัยเพราะมี maxRetries).
 */
function shouldResendRequest(_request: Request): boolean {
  // TODO(Phase 1.7): wire กับ WeakMap ที่อ่าน InterceptorConfig.resendRequest
  // ตอนนี้ default = true เพื่อ parity กับกรณีที่ caller สร้าง InterceptorConfig({ resendRequest: true })
  return true;
}
