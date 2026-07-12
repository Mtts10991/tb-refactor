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
 * Entity-conflict interceptor — handle HTTP 409 (Conflict) สำหรับ versioned entities
 * (เช่น แก้ไข entity ที่มีคนอื่นแก้ไขไปแล้ว).
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/interceptors/entity-conflict.interceptor.ts (~95 บรรทัด)
 *
 * @reason
 * ใน Angular logic นี้คือ interceptor ตัวแยก (EntityConflictInterceptor) ที่รันก่อน
 * GlobalHttpInterceptor เพื่อ catch 409 ก่อนที่จะถูก treat เป็น generic error.
 *
 * เมื่อเจอ 409:
 *   - ถ้า config.ignoreVersionConflict === true → ข้าม (ส่ง error ต่อ)
 *   - ถ้า request body ไม่ใช่ versioned entity → ข้าม (ส่ง error ต่อ)
 *   - ถ้าเป็น versioned entity → เปิด conflict dialog ให้ user เลือก:
 *     - "overwrite": retry request โดยลบ version field (ใช้ latest)
 *     - "cancel": ส่ง error ต่อไป (และตั้ง ignoreErrors = true)
 *
 * Phase 1: เราแค่ log warning + ส่ง error ต่อ (dialog จะอยู่ใน Phase 2).
 *
 * @module core/http/interceptors
 */

import { Observable, throwError } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";
import type { HttpInterceptor } from "../http-client";

/**
 * HTTP status code สำหรับ Conflict.
 * parity กับ Angular HttpStatusCode.Conflict.
 */
const HTTP_STATUS_CONFLICT = 409;

/**
 * Shape ของ versioned entity body.
 * parity กับ Angular VersionedEntity (มี id และ/หรือ version).
 */
export interface VersionedEntityBody {
  /** Entity id (presence = เป็น versioned entity ที่ต้องจัดการ conflict) */
  readonly id?: unknown;
  /** Rule chain id (กรณี body เป็น RuleChainMetaData) */
  readonly ruleChainId?: unknown;
  /** Version number (server-side optimistic locking) */
  readonly version?: unknown;
  [key: string]: unknown;
}

/**
 * Callbacks สำหรับจัดการ entity conflict (409).
 */
export interface EntityConflictCallbacks {
  /**
   * เปิด conflict dialog ให้ user เลือก overwrite/cancel.
   * parity กับ Angular EntityConflictDialogComponent.
   *
   * Phase 2 จะ wire กับ HeroUI modal จริง. Phase 1 ใช้ stub ที่ return null = "cancel".
   *
   * @param entity - versioned entity ที่เกิด conflict
   * @param message - error message จาก server
   * @returns Observable<boolean | null>:
   *   - true = overwrite (retry โดยลบ version)
   *   - false = cancel (ส่ง error ต่อ)
   *   - null = dialog ถูกปิดโดยไม่เลือก (treat เป็น cancel)
   */
  readonly openConflictDialog: (
    entity: VersionedEntityBody,
    message: string,
  ) => Observable<boolean | null>;
}

/**
 * Dependencies สำหรับ entity-conflict interceptor.
 */
export interface EntityConflictInterceptorDependencies {
  /** Callbacks สำหรับเปิด conflict dialog */
  readonly callbacks: EntityConflictCallbacks;
}

/**
 * สร้าง entity-conflict interceptor ที่จัดการ 409 Conflict สำหรับ versioned entities.
 *
 * parity กับ Angular EntityConflictInterceptor.intercept() + handleConflictError().
 *
 * Algorithm:
 *   1. ส่ง request ผ่าน chain ตามปกติ
 *   2. ถ้าได้ error กลับมา:
 *      - ถ้า status !== 409 → ส่ง error ต่อ (parity)
 *      - ถ้า status === 409:
 *        a. ถ้า config.ignoreVersionConflict === true → ส่ง error ต่อ
 *        b. ถ้า request body ไม่ใช่ versioned entity → ส่ง error ต่อ
 *        c. ถ้าเป็น versioned entity → เปิด dialog:
 *           - true → retry request โดยลบ version field (ใช้ latest)
 *           - false/null → ส่ง error ต่อ
 *
 * @param deps - dependencies (openConflictDialog callback)
 * @returns HttpInterceptor ที่พร้อมใช้ใน chain
 */
export function createEntityConflictInterceptor(
  deps: EntityConflictInterceptorDependencies,
): HttpInterceptor {
  return (request: Request, next: (req: Request) => Observable<Response>): Observable<Response> => {
    // เฉพาะ /api/* requests เท่านั้น (parity กับ Angular)
    if (!request.url.startsWith("/api/")) {
      return next(request);
    }

    return next(request).pipe(
      catchError((error: unknown): Observable<Response> => {
        const status = getErrorStatus(error);
        if (status !== HTTP_STATUS_CONFLICT) {
          // ไม่ใช่ 409 → ส่ง error ต่อให้ chain
          return throwError(() => error);
        }
        return handleConflictError(request, next, error);
      }),
    );
  };

  /**
   * จัดการ 409 Conflict ตาม InterceptorConfig + entity type.
   * parity กับ Angular EntityConflictInterceptor.handleConflictError().
   */
  function handleConflictError(
    request: Request,
    next: (req: Request) => Observable<Response>,
    error: unknown,
  ): Observable<Response> {
    // เช็ค config.ignoreVersionConflict
    // parity กับ Angular: getInterceptorConfig(request).ignoreVersionConflict
    if (shouldIgnoreVersionConflict(request)) {
      return throwError(() => error);
    }

    // อ่าน request body เพื่อเช็คว่าเป็น versioned entity หรือไม่
    // parity กับ Angular: isVersionedEntity(request.body)
    const entity = extractEntityBody(request);
    if (!entity || !isVersionedEntity(entity)) {
      // ไม่ใช่ versioned entity → ส่ง error ต่อ
      return throwError(() => error);
    }

    // เปิด conflict dialog
    // parity กับ Angular: openConflictDialog(request.body, error.error.message)
    const message = extractConflictMessage(error);
    console.warn(
      "[entity-conflict-interceptor] 409 Conflict on versioned entity — dialog จะอยู่ใน Phase 2",
      { url: request.url, message, entity },
    );

    return deps.callbacks.openConflictDialog(entity, message).pipe(
      switchMap((result: boolean | null): Observable<Response> => {
        if (result === true) {
          // overwrite → retry request โดยลบ version field (ใช้ latest)
          // parity กับ Angular: next.handle(updateRequestVersion(request))
          const retryRequest = cloneRequestWithoutVersion(request, entity);
          return next(retryRequest);
        }
        // false / null → cancel → ส่ง error ต่อ
        // parity กับ Angular: throwError(() => error)
        return throwError(() => error);
      }),
    );
  }
}

/**
 * ตรวจสอบว่า entity เป็น versioned entity หรือไม่
 * (มี id หรือ ruleChainId — parity กับ Angular isVersionedEntity()).
 */
function isVersionedEntity(entity: VersionedEntityBody): boolean {
  return Boolean(entity.id ?? entity.ruleChainId);
}

/**
 * ดึง status code จาก error object.
 */
function getErrorStatus(error: unknown): number {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    return typeof status === "number" ? status : 0;
  }
  return 0;
}

/**
 * ดึง message จาก 409 error body.
 * parity กับ Angular: error.error.message.
 */
function extractConflictMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "error" in error) {
    const errorBody = (error as { error: unknown }).error;
    if (
      typeof errorBody === "object" &&
      errorBody !== null &&
      "message" in errorBody
    ) {
      const message = (errorBody as { message: unknown }).message;
      return typeof message === "string" ? message : "Entity version conflict";
    }
  }
  return "Entity version conflict";
}

/**
 * ตรวจสอบว่าควร ignore version conflict สำหรับ request นี้หรือไม่.
 * parity กับ Angular: getInterceptorConfig(request).ignoreVersionConflict.
 *
 * ฝั่ง fetch: Phase 1.7 จะ wire กับ WeakMap<Request, InterceptorConfig>.
 * ตอนนี้ return false (default = handle conflict).
 */
function shouldIgnoreVersionConflict(_request: Request): boolean {
  // TODO(Phase 1.7): wire กับ WeakMap ที่อ่าน InterceptorConfig.ignoreVersionConflict
  return false;
}

/**
 * ดึง versioned entity body จาก request.
 * parity กับ Angular: request.body.
 *
 * ฝั่ง fetch: Request.body เป็น ReadableStream — ต้อง cache ไว้ก่อน Phase 1.7.
 * ตอนนี้ return null (ไม่สามารถอ่าน body ได้โดยตรง — Phase 2 จะ wire ผ่าน metadata).
 */
function extractEntityBody(_request: Request): VersionedEntityBody | null {
  // TODO(Phase 1.7): wire กับ WeakMap ที่เก็บ parsed request body
  // ตอนนี้ return null → interceptor จะ pass 409 ผ่านไป (ไม่เปิด dialog)
  // Phase 2 จะเก็บ body ใน metadata ตอนสร้าง request
  return null;
}

/**
 * Clone request โดยลบ version field ออกจาก body (สำหรับ overwrite retry).
 * parity กับ Angular EntityConflictInterceptor.updateRequestVersion():
 *   const body = { ...request.body, version: null };
 *   return request.clone({ body });
 */
function cloneRequestWithoutVersion(
  request: Request,
  entity: VersionedEntityBody,
): Request {
  // สร้าง body ใหม่โดยลบ version field
  const { version: _version, ...bodyWithoutVersion } = entity;
  void _version;

  const headers = new Headers(request.headers);
  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(bodyWithoutVersion),
    mode: request.mode,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer,
    integrity: request.integrity,
  });
}
