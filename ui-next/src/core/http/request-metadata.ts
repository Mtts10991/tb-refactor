/**
 * @fileoverview
 * Request metadata สำหรับส่ง InterceptorConfig ผ่าน HTTP request
 * แทน mechanism InterceptorHttpParams ของ Angular ที่ piggyback config บน HttpParams.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก:
 *   - ui-ngx/src/app/core/interceptors/interceptor-http-params.ts (28 บรรทัด)
 *   - ui-ngx/src/app/core/interceptors/interceptor-config.ts (23 บรรทัด)
 *
 * @reason
 * Angular ใช้ InterceptorHttpParams (extends HttpParams) เพื่อซ่อน config ใน params object
 * ทำให้ GlobalHttpInterceptor อ่านได้. ในฝั่ง React/fetch ไม่มี HttpParams จึงใช้
 * Symbol-keyed property บน request options แทน — สะอาดกว่าและ type-safe.
 *
 * @module core/http
 */

/**
 * Config สำหรับควบคุมพฤติกรรม interceptor ต่อ request หนึ่งตัว.
 * parity กับ InterceptorConfig class ของ Angular เดิม (constructor defaults ทั้งหมด false).
 */
export interface InterceptorConfig {
  /** ถ้า true → interceptor ไม่ update loading indicator state */
  readonly ignoreLoading: boolean;

  /** ถ้า true → interceptor ไม่ show error dialog/toast */
  readonly ignoreErrors: boolean;

  /** ถ้า true → interceptor ไม่ show version conflict dialog (สำหรับ 409) */
  readonly ignoreVersionConflict: boolean;

  /** ถ้า true → interceptor จะ retry request โดยอัตโนมัติเมื่อ rate-limited (429) */
  readonly resendRequest: boolean;
}

/**
 * สร้าง InterceptorConfig พร้อมค่า default (ทุก flag = false)
 * parity กับ default constructor ของ Angular InterceptorConfig.
 *
 * @param overrides - ค่าที่ต้องการ override (ที่ไม่ได้ส่งจะเป็น false)
 * @returns InterceptorConfig instance
 */
export function createInterceptorConfig(
  overrides: Partial<InterceptorConfig> = {},
): InterceptorConfig {
  return {
    ignoreLoading: overrides.ignoreLoading ?? false,
    ignoreErrors: overrides.ignoreErrors ?? false,
    ignoreVersionConflict: overrides.ignoreVersionConflict ?? false,
    resendRequest: overrides.resendRequest ?? false,
  };
}

/**
 * Symbol key สำหรับเก็บ InterceptorConfig บน request options object.
 * ใช้ Symbol เพื่อไม่ให้ collide กับ HTTP headers หรือ properties อื่นของ fetch Request.
 */
export const INTERCEPTOR_CONFIG_SYMBOL: unique symbol = Symbol(
  "thingsboard.interceptorConfig",
);

/**
 * Type guard: ดึง InterceptorConfig จาก request options object ถ้ามี.
 *
 * @param requestOptions - request options ที่อาจมี InterceptorConfig attached
 * @returns InterceptorConfig ถ้ามี, มิฉะนั้น undefined
 */
export function getInterceptorConfig(
  requestOptions: HttpRequestOptions,
): InterceptorConfig | undefined {
  const symbolKey = INTERCEPTOR_CONFIG_SYMBOL as unknown as string;
  return (requestOptions as unknown as Record<string, InterceptorConfig>)[symbolKey];
}

/**
 * Request options สำหรับ ThingsBoard HTTP client — parity API กับ Angular HttpRequest
 * แต่เพิ่ม Symbol-keyed InterceptorConfig slot.
 *
 * @parityEngine Angular
 * แทนที่ Angular's { headers, params: InterceptorHttpParams, body } pattern
 */
export interface HttpRequestOptions {
  /** HTTP headers (key-value) — parity กับ Angular HttpHeaders */
  readonly headers?: Readonly<Record<string, string>>;

  /** Query parameters (key-value) — parity กับ Angular HttpParams (ที่ไม่ใช่ InterceptorHttpParams) */
  readonly queryParams?: Readonly<Record<string, string | number | boolean>>;

  /** Request body (JSON object) */
  readonly body?: unknown;

  /** Response type override — parity กับ Angular responseType ('json' default, 'text' สำหรับ string response) */
  readonly responseType?: "json" | "text" | "blob" | "arraybuffer";

  /** InterceptorConfig (attach ผ่าน Symbol — ใช้ createHttpRequestOptions helper) */
  readonly [INTERCEPTOR_CONFIG_SYMBOL]?: InterceptorConfig;
}

/**
 * สร้าง HttpRequestOptions พร้อม InterceptorConfig.
 * ใช้แทนการ spread object ตรง เพื่อให้ Symbol key ถูกตั้งค่าอย่างถูกต้อง.
 *
 * @param baseOptions - options พื้นฐาน (headers, body, ฯลฯ)
 * @param interceptorConfig - config สำหรับ interceptor
 * @returns HttpRequestOptions ที่มี InterceptorConfig attached
 */
export function createHttpRequestOptions(
  baseOptions: Omit<HttpRequestOptions, typeof INTERCEPTOR_CONFIG_SYMBOL> = {},
  interceptorConfig: InterceptorConfig = createInterceptorConfig(),
): HttpRequestOptions {
  return {
    ...baseOptions,
    [INTERCEPTOR_CONFIG_SYMBOL]: interceptorConfig,
  };
}
