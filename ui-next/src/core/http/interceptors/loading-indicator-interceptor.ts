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
 * Loading-indicator interceptor — track จำนวน active requests และ dispatch
 * startLoading/finishLoading events ไปยัง UI layer (parity กับ NgRx ActionLoadStart/Finish).
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/interceptors/global-http-interceptor.ts
 *   - updateLoadingState() (private method)
 *   - ส่วน finalize(() => updateLoadingState(config, false)) ใน intercept()
 *   - load.actions.ts: ActionLoadStart, ActionLoadFinish
 *
 * @reason
 * ใน Angular loading state เก็บใน NgRx store (isLoading flag) และ dispatch ผ่าน action.
 * ในฝั่ง React ใช้ callback function แทน — ทำให้สามารถ wire กับ Zustand, Context, หรือ
 * component state อะไรก็ได้โดยไม่ผูกกับ state management library เฉพาะ.
 *
 * Algorithm (parity กับ Angular updateLoadingState):
 *   1. อ่าน InterceptorConfig จาก request — ถ้า ignoreLoading=true ข้ามทั้งหมด
 *   2. นับ activeRequests ด้วย ref count:
 *      - request เริ่ม → activeRequests++
 *      - request จบ (success หรือ error) → activeRequests--
 *   3. Emit events:
 *      - ถ้า activeRequests === 1 และกำลังโหลด → startLoading()
 *      - ถ้า activeRequests === 0 → finishLoading()
 *
 * @module core/http/interceptors
 */

import { Observable } from "rxjs";
import { finalize } from "rxjs/operators";
import type { HttpInterceptor } from "../http-client";
import { getInterceptorConfig } from "../request-metadata";

/**
 * Callbacks สำหรับ report loading state changes ไปยัง UI layer.
 * parity กับ NgRx store.dispatch(new ActionLoadStart() / ActionLoadFinish()).
 */
export interface LoadingIndicatorCallbacks {
  /**
   * เริ่ม loading state (เรียกเมื่อ request แรกเริ่มทำงาน).
   * parity กับ Angular: store.dispatch(new ActionLoadStart()).
   *
   * Phase 2 จะ wire กับ HeroUI loading spinner / global progress bar.
   */
  readonly startLoading: () => void;

  /**
   * จบ loading state (เรียกเมื่อ request สุดท้ายเสร็จ).
   * parity กับ Angular: store.dispatch(new ActionLoadFinish()).
   */
  readonly finishLoading: () => void;
}

/**
 * Dependencies สำหรับ loading-indicator interceptor.
 */
export interface LoadingIndicatorInterceptorDependencies {
  /** Callbacks สำหรับ report loading state */
  readonly callbacks: LoadingIndicatorCallbacks;
}

/**
 * สร้าง loading-indicator interceptor ที่ track active requests และ emit loading events.
 *
 * parity กับส่วน updateLoadingState() + finalize() ของ Angular GlobalHttpInterceptor.
 *
 * ใช้ ref counting เพื่อรองรับ concurrent requests — loading indicator จะหายไป
 * ก็ต่อเมื่อทุก request เสร็จสิ้น (activeRequests === 0).
 *
 * @param deps - dependencies (startLoading + finishLoading callbacks)
 * @returns HttpInterceptor ที่พร้อมใช้ใน chain
 *
 * @example
 * ```ts
 * const loadingInterceptor = createLoadingIndicatorInterceptor({
 *   callbacks: {
 *     startLoading: () => setLoadingCount((n) => n + 1),
 *     finishLoading: () => setLoadingCount((n) => n - 1),
 *   },
 * });
 * ```
 */
export function createLoadingIndicatorInterceptor(
  deps: LoadingIndicatorInterceptorDependencies,
): HttpInterceptor {
  // Ref count ของ active requests (parity กับ Angular GlobalHttpInterceptor.activeRequests)
  // เก็บใน closure ของ interceptor — ทุก request ที่ผ่าน interceptor ตัวเดียวกันจะ share counter
  let activeRequests = 0;

  return (request: Request, next: (req: Request) => Observable<Response>): Observable<Response> => {
    // ขั้นที่ 1: เฉพาะ /api/* requests เท่านั้นที่ track loading
    // parity กับ Angular: if (req.url.startsWith('/api/'))
    if (!request.url.startsWith("/api/")) {
      return next(request);
    }

    // ขั้นที่ 2: อ่าน InterceptorConfig — ถ้า ignoreLoading=true ข้าม tracking
    // parity กับ Angular: updateLoadingState(config, ...) ที่เช็ค config.ignoreLoading ก่อน
    // หมายเหตุ: ฝั่ง fetch เราอ่าน config จาก request metadata (Symbol-keyed),
    // แต่ fetch Request object ไม่มี slot สำหรับ attach metadata โดยตรง.
    // Phase 1.7 จะ wire InterceptorConfig ผ่าน WeakMap<Request, InterceptorConfig>.
    // ตอนนี้ assume ignoreLoading = false เสมอ (parity กับ default config).
    const config = extractInterceptorConfig(request);
    if (config?.ignoreLoading === true) {
      return next(request);
    }

    // ขั้นที่ 3: increment ref count + emit startLoading ถ้าเป็น request แรก
    // parity กับ Angular: activeRequests++; if (activeRequests === 1) dispatch(Start)
    activeRequests++;
    if (activeRequests === 1) {
      deps.callbacks.startLoading();
    }

    // ขั้นที่ 4: decrement ref count + emit finishLoading ถ้าเป็น request สุดท้าย
    // ใช้ finalize() เพื่อให้แน่ใจว่า decrement ทำงานเสมอ แม้จะ error หรือ unsubscribe
    // parity กับ Angular: finalize(() => updateLoadingState(config, false))
    return next(request).pipe(
      finalize(() => {
        activeRequests--;
        if (activeRequests === 0) {
          deps.callbacks.finishLoading();
        }
      }),
    );
  };
}

/**
 * ดึง InterceptorConfig จาก request ถ้ามี.
 *
 * parity กับ Angular: getInterceptorConfig(req) ที่อ่านจาก req.params.interceptorConfig.
 *
 * ฝั่ง fetch: Request object เป็น immutable และไม่สามารถ attach metadata โดยตรงได้.
 * Phase 1.7 จะใช้ WeakMap สำหรับ map Request → InterceptorConfig.
 * ตอนนี้ return undefined (default config = tracking เปิดอยู่).
 */
function extractInterceptorConfig(
  _request: Request,
): { readonly ignoreLoading?: boolean } | undefined {
  // TODO(Phase 1.7): wire กับ WeakMap<Request, InterceptorConfig>
  // ตอนนี้ return undefined → loading tracking ทำงานปกติสำหรับทุก /api/* request
  return undefined;
}
