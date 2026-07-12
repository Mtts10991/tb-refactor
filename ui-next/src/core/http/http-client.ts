/**
 * @fileoverview
 * HTTP client สำหรับเรียก ThingsBoard REST API — parity API กับ Angular HttpClient
 * แต่ใช้ fetch ภายใต้ และเชื่อมกับ interceptor chain.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: @angular/common/http HttpClient (เฉพาะ API ที่ ThingsBoard ใช้)
 *
 * @reason
 * ใช้ fetch แทน Angular HttpClient เพราะ:
 *   1. ไม่ต้อง polyfill ใน Next.js
 *   2. รองรับ server components ได้
 *   3. ลด bundle size (ไม่ต้องโหลด @angular/common/http)
 *
 * API parity กับ Angular HttpClient:
 *   - get<T>(url, options?) → Observable<T>
 *   - post<T>(url, body, options?) → Observable<T>
 *   - put<T>(url, body, options?) → Observable<T>
 *   - delete<T>(url, options?) → Observable<T>
 *   - ทุก method คืน Observable (parity กับ Angular — caller ไม่ต้องแก้)
 *
 * @module core/http
 */

import { Observable } from "rxjs";
import { type HttpRequestOptions } from "./request-metadata";

/**
 * ฟังก์ชัน type สำหรับ interceptor หนึ่งตัวใน chain.
 * parity กับ Angular HttpInterceptor interface.
 *
 * @param request - ปรับแต่งแล้ว Request object ที่จะส่ง
 * @param next - ฟังก์ชันเรียก interceptor ตัวถัดไป (หรือ fetch ถ้าเป็นตัวสุดท้าย)
 * @returns Observable ที่ emit Response เมื่อ request สำเร็จ
 */
export type HttpInterceptor = (
  request: Request,
  next: (request: Request) => Observable<Response>,
) => Observable<Response>;

/**
 * HTTP client สำหรับเรียก ThingsBoard REST API.
 * API parity กับ Angular HttpClient — ทุก method คืน Observable<T>.
 */
export class HttpClient {
  /**
   * @param interceptors - ลำดับของ interceptors ที่จะ execute ก่อน fetch
   *   (เรียงจาก outermost ไป innermost — outermost ทำงานก่อน)
   */
  constructor(private readonly interceptors: readonly HttpInterceptor[] = []) {}

  /** ส่ง HTTP GET request */
  public get<T>(url: string, options?: HttpRequestOptions): Observable<T> {
    return this.executeRequest<T>("GET", url, undefined, options);
  }

  /** ส่ง HTTP POST request */
  public post<T>(url: string, body: unknown, options?: HttpRequestOptions): Observable<T> {
    return this.executeRequest<T>("POST", url, body, options);
  }

  /** ส่ง HTTP PUT request */
  public put<T>(url: string, body: unknown, options?: HttpRequestOptions): Observable<T> {
    return this.executeRequest<T>("PUT", url, body, options);
  }

  /** ส่ง HTTP DELETE request */
  public delete<T>(url: string, options?: HttpRequestOptions): Observable<T> {
    return this.executeRequest<T>("DELETE", url, undefined, options);
  }

  /** Execute HTTP request ผ่าน interceptor chain */
  private executeRequest<T>(
    method: string,
    url: string,
    body: unknown,
    options: HttpRequestOptions | undefined,
  ): Observable<T> {
    const finalUrl = this.buildUrl(url, options?.queryParams);
    const request = this.buildRequest(method, finalUrl, body, options);
    const chainExecutor = this.buildInterceptorChain();

    return new Observable<T>((subscriber) => {
      const subscription = chainExecutor(request).subscribe({
        next: (response: Response) => {
          this.parseResponseBody(response, options)
            .then((parsedBody) => {
              if (!response.ok) {
                subscriber.error({
                  status: response.status,
                  statusText: response.statusText,
                  url: response.url,
                  error: parsedBody,
                });
                return;
              }
              subscriber.next(parsedBody as T);
              subscriber.complete();
            })
            .catch((parseError: unknown) => subscriber.error(parseError));
        },
        error: (error: unknown) => subscriber.error(error),
      });

      return () => subscription.unsubscribe();
    });
  }

  /** สร้าง interceptor chain — interceptor สุดท้ายคือ fetch */
  private buildInterceptorChain(): (request: Request) => Observable<Response> {
    const fetchAsObservable = (request: Request): Observable<Response> => {
      return new Observable<Response>((subscriber) => {
        const abortController = new AbortController();
        fetch(request, { signal: abortController.signal })
          .then((response) => {
            subscriber.next(response);
            subscriber.complete();
          })
          .catch((error: unknown) => subscriber.error(error));
        return () => abortController.abort();
      });
    };

    return this.interceptors.reduceRight(
      (next, interceptor) => (request: Request) => interceptor(request, next),
      fetchAsObservable,
    );
  }

  /** สร้าง URL พร้อม query string */
  private buildUrl(
    baseUrl: string,
    queryParams?: Readonly<Record<string, string | number | boolean>>,
  ): string {
    if (!queryParams || Object.keys(queryParams).length === 0) {
      return baseUrl;
    }
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      searchParams.append(key, String(value));
    }
    const queryString = searchParams.toString();
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}${queryString}`;
  }

  /** สร้าง fetch Request object */
  private buildRequest(
    method: string,
    url: string,
    body: unknown,
    options: HttpRequestOptions | undefined,
  ): Request {
    const headers = new Headers(options?.headers);
    const requestBody = body !== undefined ? JSON.stringify(body) : undefined;
    return new Request(url, { method, headers, body: requestBody });
  }

  /** Parse response body ตาม responseType */
  private async parseResponseBody(
    response: Response,
    options: HttpRequestOptions | undefined,
  ): Promise<unknown> {
    const responseType = options?.responseType ?? "json";
    switch (responseType) {
      case "text":
        return await response.text();
      case "blob":
        return await response.blob();
      case "arraybuffer":
        return await response.arrayBuffer();
      case "json":
      default: {
        const text = await response.text();
        if (!text) return null;
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }
    }
  }
}
