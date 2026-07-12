/**
 * @fileoverview
 * ตัวเปรียบเทียบ traffic ระหว่าง Angular เดิม กับ Next.js ใหม่ — เป็นหัวใจของ parity testing.
 *
 * @reason
 * "Behavior parity" ของโปรเจกต์นี้คือ ทุก HTTP request และ WebSocket message ที่ Next.js ส่ง
 * ต้องเหมือน Angular เดิม byte-for-byte. คลาสนี้ทำหน้าที่เปรียบเทียบและรายงานความแตกต่าง.
 *
 * @parityEngine
 * ไม่มี equivalent ใน Angular เดิม — เป็น infrastructure ใหม่ที่สร้างขึ้นเพื่อ migration.
 */

/**
 * โครงสร้างของ HTTP request ที่จะเปรียบเทียบ parity.
 */
export interface HttpRequestSnapshot {
  /** HTTP method (GET, POST, PUT, DELETE) */
  readonly method: string;

  /** URL path และ query string */
  readonly url: string;

  /** headers ที่เกี่ยวข้องกับ parity (ignore user-agent, timestamp, etc.) */
  readonly relevantHeaders: Readonly<Record<string, string>>;

  /** request body (JSON object หรือ null ถ้าไม่มี body) */
  readonly body: unknown;
}

/**
 * ผลลัพธ์การเปรียบเทียบ parity ของ HTTP request หนึ่งตัว.
 */
export interface ParityComparisonResult {
  /** true ถ้าเหมือนกันทุก field, false ถ้ามีอย่างน้อยหนึ่ง field แตกต่าง */
  readonly isMatch: boolean;

  /** รายการ field ที่แตกต่าง (empty ถ้า isMatch เป็น true) */
  readonly differences: readonly ParityDifference[];
}

/**
 * ความแตกต่างของ field หนึ่ง field.
 */
export interface ParityDifference {
  /** ชื่อ field ที่แตกต่าง (เช่น "url", "body.deviceName") */
  readonly fieldPath: string;

  /** ค่าจาก Angular (expected) */
  readonly angularValue: unknown;

  /** ค่าจาก Next.js (actual) */
  readonly nextJsValue: unknown;
}

/**
 * รายชื่อ header ที่นำมาเปรียบเทียบ (ที่เหลือ ignore เพราะเป็น implementation detail).
 * สำคัญที่สุด: X-Authorization (parity กับ Angular ที่ใช้ header นี้แทน Authorization มาตรฐาน).
 */
const RELEVANT_HTTP_HEADERS_FOR_PARITY = [
  "X-Authorization",
  "Content-Type",
  "Accept",
] as const;

/**
 * เปรียบเทียบ HTTP request สองตัวเพื่อตรวจสอบ parity.
 *
 * @param angularRequest - request ที่ capture จาก Angular เดิม (baseline)
 * @param nextJsRequest - request ที่ capture จาก Next.js ใหม่
 * @returns ผลลัพธ์การเปรียบเทียบ
 *
 * @example
 * ```typescript
 * const result = compareHttpRequests(angularSnapshot, nextJsSnapshot);
 * if (!result.isMatch) {
 *   console.error("Parity failed:", result.differences);
 * }
 * ```
 */
export function compareHttpRequests(
  angularRequest: HttpRequestSnapshot,
  nextJsRequest: HttpRequestSnapshot,
): ParityComparisonResult {
  const differences: ParityDifference[] = [];

  // เปรียบเทียบ method
  if (angularRequest.method !== nextJsRequest.method) {
    differences.push({
      fieldPath: "method",
      angularValue: angularRequest.method,
      nextJsValue: nextJsRequest.method,
    });
  }

  // เปรียบเทียบ URL (case-sensitive)
  if (angularRequest.url !== nextJsRequest.url) {
    differences.push({
      fieldPath: "url",
      angularValue: angularRequest.url,
      nextJsValue: nextJsRequest.url,
    });
  }

  // เปรียบเทียบเฉพาะ relevant headers
  for (const headerName of RELEVANT_HTTP_HEADERS_FOR_PARITY) {
    const angularHeaderValue = angularRequest.relevantHeaders[headerName];
    const nextJsHeaderValue = nextJsRequest.relevantHeaders[headerName];

    if (angularHeaderValue !== nextJsHeaderValue) {
      differences.push({
        fieldPath: `headers.${headerName}`,
        angularValue: angularHeaderValue,
        nextJsValue: nextJsHeaderValue,
      });
    }
  }

  // เปรียบเทียบ body แบบ deep equality ผ่าน JSON serialization
  const angularBodyJson = JSON.stringify(angularRequest.body);
  const nextJsBodyJson = JSON.stringify(nextJsRequest.body);
  if (angularBodyJson !== nextJsBodyJson) {
    differences.push({
      fieldPath: "body",
      angularValue: angularRequest.body,
      nextJsValue: nextJsRequest.body,
    });
  }

  return {
    isMatch: differences.length === 0,
    differences,
  };
}
