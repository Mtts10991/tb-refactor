/**
 * @fileoverview
 * Mock HttpClient ที่ "capture" ทุก method call (URL, body, options)
 * เพื่อใช้ใน parity tests — ทำให้เราสามารถ verify ได้ว่า Next.js service
 * ส่ง request ที่ตรงกับ fixture ของ Angular เดิม
 *
 * @reason
 * แทนที่จะต้องรัน Angular dev server จริงเพื่อ capture traffic เราใช้วิธี
 * "instrument" HttpClient ของ Next.js ด้วย mock ที่จด call ทั้งหมด
 * แล้วเทียบกับ fixtures ที่เขียนจากการอ่าน source code ของ Angular
 *
 * @parityEngine
 * ไม่มี equivalent ใน Angular — เป็น infrastructure ใหม่สำหรับ migration
 */

import { of, type Observable } from "rxjs";
import type { HttpRequestOptions } from "../../src/core/http/request-metadata";

/**
 * Record ของ HTTP call หนึ่งครั้งที่ถูก capture โดย mock HttpClient
 */
export interface CapturedHttpCall {
  /** HTTP method (GET/POST/PUT/DELETE) */
  readonly method: string;

  /** URL ที่ส่ง */
  readonly url: string;

  /** Body ที่ส่ง (undefined สำหรับ GET/DELETE) */
  readonly body: unknown;

  /** Options ที่ส่ง (มี headers, queryParams, responseType) */
  readonly options: HttpRequestOptions | undefined;
}

/**
 * Mock HttpClient ที่ capture ทุก call แล้ว return Observable ที่ emit ค่าว่าง
 * ใช้สำหรับ parity tests เท่านั้น — ไม่ได้ทำ HTTP request จริง
 */
export class HttpClientCaptor {
  /** รายการ calls ทั้งหมดที่ถูก capture */
  public readonly capturedCalls: CapturedHttpCall[] = [];

  /** ค่า response ที่จะ return สำหรับแต่ละ call (default: empty object) */
  private readonly mockResponse: unknown;

  constructor(mockResponse: unknown = {}) {
    this.mockResponse = mockResponse;
  }

  /** สร้าง HttpClient-compatible object ที่ใช้ captor นี้ */
  public asHttpClient(): {
    get: <T>(url: string, options?: HttpRequestOptions) => Observable<T>;
    post: <T>(url: string, body: unknown, options?: HttpRequestOptions) => Observable<T>;
    put: <T>(url: string, body: unknown, options?: HttpRequestOptions) => Observable<T>;
    delete: <T>(url: string, options?: HttpRequestOptions) => Observable<T>;
  } {
    return {
      get: <T>(url: string, options?: HttpRequestOptions): Observable<T> => {
        this.capturedCalls.push({ method: "GET", url, body: undefined, options });
        return of(this.mockResponse as T);
      },
      post: <T>(url: string, body: unknown, options?: HttpRequestOptions): Observable<T> => {
        this.capturedCalls.push({ method: "POST", url, body, options });
        return of(this.mockResponse as T);
      },
      put: <T>(url: string, body: unknown, options?: HttpRequestOptions): Observable<T> => {
        this.capturedCalls.push({ method: "PUT", url, body, options });
        return of(this.mockResponse as T);
      },
      delete: <T>(url: string, options?: HttpRequestOptions): Observable<T> => {
        this.capturedCalls.push({ method: "DELETE", url, body: undefined, options });
        return of(this.mockResponse as T);
      },
    };
  }

  /** ดึง call ล่าสุด */
  public getLastCall(): CapturedHttpCall | undefined {
    return this.capturedCalls[this.capturedCalls.length - 1];
  }

  /** ล้าง calls ทั้งหมด */
  public reset(): void {
    this.capturedCalls.length = 0;
  }
}
