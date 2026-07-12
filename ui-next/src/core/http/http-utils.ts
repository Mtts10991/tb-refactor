/**
 * @fileoverview
 * Utility functions สำหรับสร้าง HTTP request options — parity กับ ui-ngx/src/app/core/http/http-utils.ts
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/http/http-utils.ts (99 บรรทัด)
 *
 * @reason
 * ทุก HTTP service ของ ThingsBoard เรียก defaultHttpOptionsFromConfig(config) เพื่อสร้าง
 * options ที่มี headers + InterceptorConfig. ในฝั่ง React ใช้ createHttpRequestOptions
 * ที่รองรับ Symbol-keyed InterceptorConfig (แทน InterceptorHttpParams hack).
 *
 * API parity กับ Angular:
 *   - defaultHttpOptionsFromConfig(config?) → HttpRequestOptions
 *   - defaultHttpOptions(ignoreLoading?, ignoreErrors?, resendRequest?, queryParams?) → HttpRequestOptions
 *   - defaultHttpUploadOptions(...) → HttpRequestOptions (ไม่มี Content-Type header)
 *   - createDefaultHttpOptions(queryParamsOrConfig?, config?) → HttpRequestOptions (overload helper)
 *
 * @module core/http
 */

import {
  type InterceptorConfig,
  type HttpRequestOptions,
  createInterceptorConfig,
  createHttpRequestOptions,
  INTERCEPTOR_CONFIG_SYMBOL,
} from "./request-metadata";

/**
 * Query params type — parity กับ Angular's QueryParams (object ที่ value เป็น any).
 */
export type QueryParams = { [param: string]: unknown };

/**
 * Request config — parity กับ Angular's RequestConfig interface.
 * ใช้สำหรับควบคุมพฤติกรรม interceptor แบบ declarative.
 */
export interface RequestConfig {
  /** ถ้า true → interceptor ไม่ update loading indicator */
  readonly ignoreLoading?: boolean;

  /** ถ้า true → interceptor ไม่ show error dialog/toast */
  readonly ignoreErrors?: boolean;

  /** ถ้า true → interceptor ไม่ show version conflict dialog (สำหรับ 409) */
  readonly ignoreVersionConflict?: boolean;

  /** ถ้า true → interceptor จะ retry request เมื่อ rate-limited (429) */
  readonly resendRequest?: boolean;

  /** Query parameters เพิ่มเติม */
  readonly queryParams?: QueryParams;
}

/**
 * ตรวจว่า object ที่ส่งเข้ามาเป็น RequestConfig หรือไม่ (vs QueryParams).
 * parity กับ Angular's hasRequestConfig().
 *
 * @param value - object ที่ต้องการตรวจสอบ
 * @returns true ถ้าเป็น RequestConfig (มีอย่างน้อยหนึ่ง property ของ RequestConfig)
 */
export function hasRequestConfig(value?: unknown): value is RequestConfig {
  if (!value || typeof value !== "object") {
    return false;
  }
  const configKeys = ["ignoreLoading", "ignoreErrors", "ignoreVersionConflict", "resendRequest", "queryParams"];
  return configKeys.some((key) => key in (value as Record<string, unknown>));
}

/**
 * สร้าง HttpRequestOptions จาก QueryParams หรือ RequestConfig — parity กับ Angular's createDefaultHttpOptions.
 * ใช้สำหรับ overloaded save methods ที่ argument ตัวที่สองอาจเป็น QueryParams หรือ RequestConfig.
 *
 * @param queryParamsOrConfig - QueryParams หรือ RequestConfig
 * @param config - RequestConfig เพิ่มเติม (ใช้เมื่อ argument แรกเป็น QueryParams)
 * @returns HttpRequestOptions พร้อม InterceptorConfig + headers
 */
export function createDefaultHttpOptions(
  queryParamsOrConfig?: QueryParams | RequestConfig,
  config?: RequestConfig,
): HttpRequestOptions {
  if (hasRequestConfig(queryParamsOrConfig)) {
    return defaultHttpOptionsFromConfig(queryParamsOrConfig as RequestConfig);
  }
  return defaultHttpOptionsFromParams(queryParamsOrConfig as QueryParams, config);
}

/**
 * สร้าง HttpRequestOptions จาก QueryParams + optional RequestConfig.
 * parity กับ Angular's defaultHttpOptionsFromParams.
 *
 * @param queryParams - query parameters
 * @param config - request config (optional)
 * @returns HttpRequestOptions
 */
export function defaultHttpOptionsFromParams(
  queryParams?: QueryParams,
  config?: RequestConfig,
): HttpRequestOptions {
  const mergedConfig: RequestConfig = {
    ...config,
    ...(queryParams ? { queryParams } : {}),
  };
  return defaultHttpOptionsFromConfig(mergedConfig);
}

/**
 * สร้าง HttpRequestOptions จาก RequestConfig — ฟังก์ชันหลักที่ใช้บ่อยที่สุด.
 * parity กับ Angular's defaultHttpOptionsFromConfig (เรียก ~340 ครั้งใน codebase).
 *
 * @param config - request config (optional — default เป็น {})
 * @returns HttpRequestOptions พร้อม Content-Type header + InterceptorConfig
 */
export function defaultHttpOptionsFromConfig(config?: RequestConfig): HttpRequestOptions {
  const safeConfig = config ?? {};
  return defaultHttpOptions(
    safeConfig.ignoreLoading ?? false,
    safeConfig.ignoreErrors ?? false,
    safeConfig.resendRequest ?? false,
    safeConfig.queryParams,
  );
}

/**
 * สร้าง HttpRequestOptions จาก flags แบบ raw — parity กับ Angular's defaultHttpOptions.
 *
 * @param ignoreLoading - ถ้า true จะไม่ update loading indicator (default false)
 * @param ignoreErrors - ถ้า true จะไม่ show error (default false)
 * @param resendRequest - ถ้า true จะ retry เมื่อ rate-limited (default false)
 * @param queryParams - query parameters เพิ่มเติม (optional)
 * @returns HttpRequestOptions พร้อม Content-Type: application/json + InterceptorConfig
 */
export function defaultHttpOptions(
  ignoreLoading = false,
  ignoreErrors = false,
  resendRequest = false,
  queryParams?: QueryParams,
): HttpRequestOptions {
  const cleanedParams = cleanQueryParams(queryParams);
  const interceptorConfig: InterceptorConfig = createInterceptorConfig({
    ignoreLoading,
    ignoreErrors,
    resendRequest,
  });

  const baseOptions: Omit<HttpRequestOptions, typeof INTERCEPTOR_CONFIG_SYMBOL> = {
    headers: { "Content-Type": "application/json" },
  };

  if (cleanedParams) {
    baseOptions.queryParams = cleanedParams as Record<string, string | number | boolean>;
  }

  return createHttpRequestOptions(baseOptions, interceptorConfig);
}

/**
 * สร้าง HttpRequestOptions สำหรับ file upload — parity กับ Angular's defaultHttpUploadOptions.
 * ไม่ใส่ Content-Type header เพราะ browser จะตั้ง multipart/form-data boundary เอง.
 *
 * @param ignoreLoading - default false
 * @param ignoreErrors - default false
 * @param resendRequest - default false
 * @param queryParams - optional
 * @returns HttpRequestOptions ไม่มี Content-Type header (สำหรับ FormData)
 */
export function defaultHttpUploadOptions(
  ignoreLoading = false,
  ignoreErrors = false,
  resendRequest = false,
  queryParams?: QueryParams,
): HttpRequestOptions {
  const cleanedParams = cleanQueryParams(queryParams);
  const interceptorConfig: InterceptorConfig = createInterceptorConfig({
    ignoreLoading,
    ignoreErrors,
    resendRequest,
  });

  const baseOptions: Omit<HttpRequestOptions, typeof INTERCEPTOR_CONFIG_SYMBOL> = {};

  if (cleanedParams) {
    baseOptions.queryParams = cleanedParams as Record<string, string | number | boolean>;
  }

  return createHttpRequestOptions(baseOptions, interceptorConfig);
}

/**
 * ลบ properties ที่เป็น null หรือ undefined ออกจาก QueryParams.
 * parity กับ Angular's cleanQueryParams — รักษา false, 0, '' (เป็น falsy แต่ valid).
 *
 * @param params - query params ต้นฉบับ
 * @returns cleaned params หรือ undefined ถ้าว่าง
 */
function cleanQueryParams(params?: QueryParams): QueryParams | undefined {
  if (!params) {
    return undefined;
  }
  const entries = Object.entries(params);
  const cleanedEntries = entries.filter(([, value]) => value !== null && value !== undefined);
  if (cleanedEntries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(cleanedEntries);
}
