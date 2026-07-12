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
 * parseHttpErrorMessage — parse HTTP error response ให้เป็น user-facing message.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/utils.ts (parseHttpErrorMessage + prepareMessageFromData)
 *
 * @reason
 * ใน Angular ฟังก์ชันนี้อยู่ใน utils.ts (3,000+ บรรทัด, มีทุกอย่างปนกัน). ในฝั่ง React
 * แยกเป็น module ของตัวเองเพื่อให้:
 *   1. ค้นหาง่าย — คนหา "error message parser" จะเจอไฟล์นี้
 *   2. import เบา — error-handling-interceptor ไม่ดึง utils ตัวใหญ่ทั้งหมด
 *   3. test ง่าย — เทียบกับ Angular ได้โดยตรง
 *
 * API parity กับ Angular parseHttpErrorMessage(errorResponse, translate, responseType, sanitizer):
 *   - รับ error response + translate function
 *   - คืน { message: string, timeout: number } ที่พร้อมโชว์ให้ user เห็น
 *
 * @module core/error-handling
 */

import { serverErrorCodesTranslations } from "./server-error-codes";

/**
 * Shape ของ HTTP error response ที่ ThingsBoard client ใช้ภายใน.
 * parity กับ Angular HttpErrorResponse (เฉพาะ fields ที่ parser ใช้).
 *
 * ThingsBoard server ส่ง error body ในรูปแบบ:
 *   { message, errorCode, timestamp, status }
 * หรือ plain string ในบางกรณี (เช่น 502 gateway error).
 */
export interface HttpErrorLike {
  /** HTTP status code (เช่น 401, 403, 404, 500) */
  readonly status: number;
  /** HTTP status text (เช่น "Unauthorized", "Not Found") */
  readonly statusText?: string;
  /** URL ที่ request ไป */
  readonly url?: string;
  /** Response body (อาจเป็น JSON object, string, ArrayBuffer หรือ null) */
  readonly error?: unknown;
}

/**
 * ผลลัพธ์จาก parseHttpErrorMessage.
 * parity กับ return type ของ Angular parseHttpErrorMessage.
 */
export interface ParsedHttpErrorMessage {
  /** ข้อความที่จะโชว์ให้ user เห็น (localized ถ้ามี errorCode) */
  readonly message: string;
  /** Delay ในหน่วยมิลลิวินาทีก่อนโชว์ (parity กับ error.timeout) — 0 = โชว์ทันที */
  readonly timeout: number;
}

/**
 * Translate function signature.
 * parity กับ ngx-translate TranslateService.instant(key).
 *
 * @param key - i18n key (เช่น "server-error.jwt-token-expired")
 * @returns message ที่แปลแล้ว หรือ key เดิมถ้าไม่มี translation
 */
export type TranslateFn = (key: string) => string;

/**
 * Parse HTTP error response ให้เป็น user-facing message.
 * parity กับ Angular parseHttpErrorMessage(errorResponse, translate, responseType, sanitizer).
 *
 * Algorithm:
 *   1. ถ้า responseType === 'text' พยายาม JSON.parse error body (parity กับ Angular)
 *   2. ดึง errorMessage จาก: error.message | prepareMessageFromData(error) | fallback
 *   3. ถ้า errorMessage เป็น object ที่มี errorCode → lookup i18n key จาก map
 *   4. คืน { message, timeout }
 *
 * @param errorResponse - HTTP error response (status, statusText, error body)
 * @param translate - function สำหรับแปล i18n key → localized message
 * @param responseType - ถ้า 'text' จะพยายาม JSON.parse error body ก่อน (parity กับ Angular)
 * @returns parsed message + timeout สำหรับโชว์ให้ user
 *
 * @example
 * ```ts
 * const result = parseHttpErrorMessage(
 *   { status: 401, statusText: "Unauthorized", error: { errorCode: 11 } },
 *   (key) => translate(key),
 * );
 * // result.message === "JWT token expired" (หรือ localized equivalent)
 * ```
 */
export function parseHttpErrorMessage(
  errorResponse: HttpErrorLike,
  translate: TranslateFn,
  responseType?: string,
): ParsedHttpErrorMessage {
  let error: unknown = null;
  let errorMessage: unknown;
  let timeout = 0;

  // ขั้นที่ 1: ดึง error body — ถ้า responseType เป็น 'text' ให้ลอง parse เป็น JSON
  // parity กับ Angular: errorResponse.error อาจเป็น string ที่ห่อ JSON object อยู่ข้างใน
  if (responseType === "text") {
    try {
      error = errorResponse.error ? JSON.parse(errorResponse.error as string) : null;
    } catch {
      // ถ้า parse ไม่ได้ → error ยังเป็น null, จะใช้ errorResponse.error ตรงๆ ในขั้นถัดไป
    }
  } else {
    error = errorResponse.error;
  }

  // ขั้นที่ 2: ดึง errorMessage จาก error body
  if (error && typeof error === "object" && !(error as { message?: unknown }).message) {
    // error เป็น object แต่ไม่มี field message → พยายามสกัดจาก data (เช่น ArrayBuffer)
    errorMessage = prepareMessageFromData(error);
  } else if (error && typeof error === "object" && (error as { message?: unknown }).message) {
    // error มี message field → ใช้ message นั้น + timeout ถ้ามี
    errorMessage = (error as { message: unknown }).message;
    const errorTimeout = (error as { timeout?: unknown }).timeout;
    timeout = typeof errorTimeout === "number" ? errorTimeout : 0;
  } else {
    // ไม่มี error body เลย → fallback ไป status code
    const statusForMsg =
      error && typeof error === "object" && "status" in error
        ? (error as { status: unknown }).status
        : "'Unknown'";
    errorMessage = `Unhandled error code ${statusForMsg}`;
  }

  // ขั้นที่ 3: ถ้า errorMessage เป็น object (server ส่ง error object) ให้ lookup i18n key
  // parity กับ Angular: errorText = `${status}: ` + (errorKey ? translate(errorKey) : statusText)
  if (errorMessage && typeof errorMessage === "object") {
    const errorObj = errorMessage as { errorCode?: number };
    let errorKey: string | null = null;
    if (errorObj.errorCode) {
      errorKey = serverErrorCodesTranslations.get(errorObj.errorCode) ?? null;
    }
    const errorText = `${errorResponse.status}: ${
      errorKey ? translate(errorKey) : errorResponse.statusText ?? ""
    }`;
    errorMessage = errorText;
  }

  // ขั้นที่ 4: cast เป็น string (หลังขั้นที่ 3 errorMessage ต้องเป็น string แล้ว)
  const messageString =
    typeof errorMessage === "string" ? errorMessage : String(errorMessage ?? "");

  return { message: messageString, timeout };
}

/**
 * สกัด message จาก error data ที่อาจเป็น ArrayBuffer หรือ plain value.
 * parity กับ Angular prepareMessageFromData(data) (private function ใน utils.ts).
 *
 * ArrayBuffer case: server ส่ง error เป็น binary JSON (เช่น responseType='arraybuffer')
 * ต้อง decode ก่อนจึงจะอ่าน message ได้.
 *
 * @param data - error body (อาจเป็น ArrayBuffer, object, string, หรืออื่น ๆ)
 * @returns message string (หรือ data เดิมถ้าไม่ใช่ ArrayBuffer)
 */
function prepareMessageFromData(data: unknown): unknown {
  if (
    typeof data === "object" &&
    data !== null &&
    data.constructor === ArrayBuffer
  ) {
    // Decode ArrayBuffer → string → พยายาม JSON.parse เพื่อเอา message
    const bytes = new Uint8Array(data as ArrayBuffer);
    const msg = String.fromCharCode(...Array.from(bytes));
    try {
      const msgObj = JSON.parse(msg) as { message?: unknown };
      if (msgObj.message) {
        return msgObj.message;
      }
      return msg;
    } catch {
      return msg;
    }
  }
  return data;
}
