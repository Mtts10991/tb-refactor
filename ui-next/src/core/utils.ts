/**
 * @fileoverview
 * Stub ชั่วคราวของ @core/utils — utility functions ของ ThingsBoard
 * จะถูก port แบบเต็มใน Phase 1.6 (HTTP client + interceptor chain)
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/utils.ts
 *
 * @reason
 * Models จำนวนหนึ่ง import utility functions จาก @core/utils (เช่น isDefined, isUndefined,
 * isEqual, ฯลฯ). สร้าง stub ชั่วคราวเพื่อให้ tsc ผ่านในขณะที่ยังไม่ได้ port utils เต็มรูปแบบ.
 * ฟังก์ชันในไฟล์นี้ทำงานถูกต้อง (พื้นฐาน) แต่อาจไม่ครอบคลุม edge cases ทั้งหมดของ Angular เดิม.
 */

/** Type guard: ตรวจว่า value ไม่เป็น undefined หรือ null */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== undefined && value !== null;
}

/** Type guard: ตรวจว่า value เป็น undefined หรือ null */
export function isUndefined(value: unknown): value is null | undefined {
  return value === undefined || value === null;
}

/** Type guard: ตรวจว่า value เป็น undefined หรือ null (alias) */
export function isUndefinedOrNull(value: unknown): value is null | undefined {
  return value === undefined || value === null;
}

/** ตรวจว่า value ไม่เป็น undefined/null (parity กับ Angular เดิม) */
export function isDefinedAndNotNull<T>(value: T | null | undefined): value is T {
  return value !== undefined && value !== null;
}

/** ตรวจว่า value เป็น object ที่ไม่ใช่ null */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** ตรวจว่า value เป็น string */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** ตรวจว่า value เป็น number */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/** ตรวจว่า value เป็น numeric (number หรือ string ที่แปลงเป็น number ได้) */
export function isNumeric(value: unknown): boolean {
  if (typeof value === "number") return !isNaN(value);
  if (typeof value === "string") return value.trim() !== "" && !isNaN(Number(value));
  return false;
}

/** ตรวจว่า string ไม่ว่าง (ไม่ใช่ null/undefined/empty/whitespace) */
export function isNotEmptyStr(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** ตรวจว่า string ว่าง */
export function isEmptyStr(value: unknown): boolean {
  return !isNotEmptyStr(value);
}

/** ตรวจว่า array/object ว่าง */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  if (typeof value === "string") return value.length === 0;
  return false;
}

/** Deep equality check (basic) */
export function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Deep equality check ที่ถือว่า undefined === undefined เหมือนกัน */
export function isEqualIgnoreUndefined(a: unknown, b: unknown): boolean {
  const normalize = (v: unknown): unknown => (v === undefined ? null : v);
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

/** เปรียบเทียบ 2 arrays โดยไม่สนใจ undefined elements */
export function isArraysEqualIgnoreUndefined(a: unknown[], b: unknown[]): boolean {
  const filterDefined = (arr: unknown[]): unknown[] => arr.filter((item) => item !== undefined);
  return isEqual(filterDefined(a), filterDefined(b));
}

/** Deep clone ผ่าน JSON parse/stringify */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Merge 2 objects แบบ deep (recursive) */
export function mergeDeep<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source ?? {})) {
    const sourceValue = (source as Record<string, unknown>)[key];
    const targetValue = (target as Record<string, unknown>)[key];
    if (isObject(sourceValue) && isObject(targetValue)) {
      (result as Record<string, unknown>)[key] = mergeDeep(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }
  return result;
}

/** Merge deep โดยไม่ overwrite array values */
export function mergeDeepIgnoreArray<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  return mergeDeep(target, source);
}

/** Generate RFC4122-compliant GUID v4 */
export function guid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const randomValue = (Math.random() * 16) | 0;
    const shiftedValue = character === "x" ? randomValue : (randomValue & 0x3) | 0x8;
    return shiftedValue.toString(16);
  });
}

/** Parse query parameter จาก URL */
export function getQueryParam(name: string, url?: string): string | null {
  if (typeof window === "undefined") return null;
  const searchParams = new URLSearchParams(url ?? window.location.search);
  return searchParams.get(name);
}

/** Generate unique ID (counter-based) */
let uniqueIdCounter = 0;
export function generateUniqueId(prefix = ""): string {
  uniqueIdCounter += 1;
  return `${prefix}${Date.now()}_${uniqueIdCounter}`;
}

/** อ่าน nested property ด้วย dot notation (เช่น "user.profile.name") */
export function getDescendantProp(object: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((accumulator: Record<string, unknown> | unknown, key) => {
    if (isObject(accumulator)) {
      return (accumulator as Record<string, unknown>)[key];
    }
    return undefined;
  }, object);
}

/** Parse function จาก string source */
export function parseFunction(functionSource: string, args: string[] = []): unknown {
  try {
    // eslint-disable-next-line no-new-func
    return new Function(...args, functionSource);
  } catch {
    return undefined;
  }
}

/** แปลง Blob เป็น text */
export function blobToText(blob: Blob): Promise<string> {
  return blob.text();
}

/** Unwrap module (parity กับ Angular เดิม) */
export function unwrapModule<T>(module: { default: T } | T): T {
  if (module && typeof module === "object" && "default" in module) {
    return (module as { default: T }).default;
  }
  return module as T;
}
