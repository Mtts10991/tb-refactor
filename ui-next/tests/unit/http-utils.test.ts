/**
 * @fileoverview
 * Unit tests สำหรับ http-utils.ts + request-metadata.ts
 * — ทดสอบ behavior จริงของ pure functions (defaultHttpOptionsFromConfig, createInterceptorConfig, etc.)
 *
 * @parityEngine Angular — parity กับ ui-ngx/src/app/core/http/http-utils.ts
 */

import { describe, it, expect } from "vitest";
import {
  defaultHttpOptionsFromConfig,
  defaultHttpOptions,
  defaultHttpUploadOptions,
  createDefaultHttpOptions,
  defaultHttpOptionsFromParams,
  hasRequestConfig,
  type RequestConfig,
  type QueryParams,
} from "../../src/core/http/http-utils";
import {
  createInterceptorConfig,
  createHttpRequestOptions,
  getInterceptorConfig,
  INTERCEPTOR_CONFIG_SYMBOL,
  type InterceptorConfig,
} from "../../src/core/http/request-metadata";

// ============================================================
// request-metadata.ts tests
// ============================================================
describe("createInterceptorConfig", () => {
  it("คืนค่า default (ทุก flag = false) เมื่อไม่ส่ง overrides", () => {
    const config = createInterceptorConfig();
    expect(config.ignoreLoading).toBe(false);
    expect(config.ignoreErrors).toBe(false);
    expect(config.ignoreVersionConflict).toBe(false);
    expect(config.resendRequest).toBe(false);
  });

  it("คืนค่าที่ override ได้", () => {
    const config = createInterceptorConfig({
      ignoreLoading: true,
      ignoreErrors: true,
      resendRequest: true,
    });
    expect(config.ignoreLoading).toBe(true);
    expect(config.ignoreErrors).toBe(true);
    expect(config.resendRequest).toBe(true);
  });

  it("ignoreVersionConflict override ได้", () => {
    const config = createInterceptorConfig({ ignoreVersionConflict: true });
    expect(config.ignoreVersionConflict).toBe(true);
  });

  it("partial override — ค่าที่ไม่ส่งเป็น false", () => {
    const config = createInterceptorConfig({ ignoreLoading: true });
    expect(config.ignoreLoading).toBe(true);
    expect(config.ignoreErrors).toBe(false);
  });
});

describe("createHttpRequestOptions", () => {
  it("คืนค่า options ที่มี InterceptorConfig แนบอยู่ (ผ่าน Symbol)", () => {
    const config = createInterceptorConfig({ ignoreLoading: true });
    const options = createHttpRequestOptions({ headers: { "Content-Type": "application/json" } }, config);
    const extracted = getInterceptorConfig(options);
    expect(extracted).toBeDefined();
    expect(extracted!.ignoreLoading).toBe(true);
  });

  it("คืนค่า default InterceptorConfig เมื่อไม่ส่ง", () => {
    const options = createHttpRequestOptions();
    const extracted = getInterceptorConfig(options);
    expect(extracted).toBeDefined();
    expect(extracted!.ignoreLoading).toBe(false);
  });

  it("getInterceptorConfig คืน undefined เมื่อไม่มี config แนบ", () => {
    const emptyOptions = {} as any;
    expect(getInterceptorConfig(emptyOptions)).toBeUndefined();
  });

  it("INTERCEPTOR_CONFIG_SYMBOL เป็น unique symbol", () => {
    expect(typeof INTERCEPTOR_CONFIG_SYMBOL).toBe("symbol");
  });
});

// ============================================================
// http-utils.ts tests
// ============================================================
describe("hasRequestConfig", () => {
  it("คืน true เมื่อมี RequestConfig properties", () => {
    expect(hasRequestConfig({ ignoreLoading: true })).toBe(true);
    expect(hasRequestConfig({ ignoreErrors: true })).toBe(true);
    expect(hasRequestConfig({ resendRequest: true })).toBe(true);
    expect(hasRequestConfig({ queryParams: {} })).toBe(true);
  });

  it("คืน false เมื่อไม่มี RequestConfig properties", () => {
    expect(hasRequestConfig(undefined)).toBe(false);
    expect(hasRequestConfig(null)).toBe(false);
    expect(hasRequestConfig({})).toBe(false);
    expect(hasRequestConfig({ otherKey: "value" })).toBe(false);
  });

  it("คืน false เมื่อ value ไม่ใช่ object", () => {
    expect(hasRequestConfig("string")).toBe(false);
    expect(hasRequestConfig(123)).toBe(false);
  });
});

describe("defaultHttpOptionsFromConfig", () => {
  it("คืนค่า default options ที่มี Content-Type: application/json", () => {
    const options = defaultHttpOptionsFromConfig();
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("คืนค่า options พร้อม InterceptorConfig (default flags = false)", () => {
    const options = defaultHttpOptionsFromConfig();
    const config = getInterceptorConfig(options);
    expect(config).toBeDefined();
    expect(config!.ignoreLoading).toBe(false);
    expect(config!.ignoreErrors).toBe(false);
    expect(config!.resendRequest).toBe(false);
  });

  it("ส่ง config เพื่อ override flags", () => {
    const options = defaultHttpOptionsFromConfig({ ignoreLoading: true, ignoreErrors: true });
    const config = getInterceptorConfig(options);
    expect(config!.ignoreLoading).toBe(true);
    expect(config!.ignoreErrors).toBe(true);
  });

  it("ส่ง queryParams ผ่าน config", () => {
    const options = defaultHttpOptionsFromConfig({ queryParams: { foo: "bar", count: 42 } });
    expect(options.queryParams).toEqual({ foo: "bar", count: 42 });
  });

  it("handle undefined config", () => {
    const options = defaultHttpOptionsFromConfig(undefined);
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
  });
});

describe("defaultHttpOptions (raw flags)", () => {
  it("คืนค่า default (ทุก flag = false)", () => {
    const options = defaultHttpOptions();
    const config = getInterceptorConfig(options);
    expect(config!.ignoreLoading).toBe(false);
    expect(config!.ignoreErrors).toBe(false);
    expect(config!.resendRequest).toBe(false);
  });

  it("รับ flags เป็น positional arguments", () => {
    const options = defaultHttpOptions(true, false, true);
    const config = getInterceptorConfig(options);
    expect(config!.ignoreLoading).toBe(true);
    expect(config!.ignoreErrors).toBe(false);
    expect(config!.resendRequest).toBe(true);
  });

  it("รับ queryParams เป็น argument ที่ 4", () => {
    const options = defaultHttpOptions(false, false, false, { key: "value" });
    expect(options.queryParams).toEqual({ key: "value" });
  });

  it("cleanQueryParams ลบ null/undefined values แต่เก็บ false/0/empty-string", () => {
    const options = defaultHttpOptions(false, false, false, {
      keepFalse: false,
      keepZero: 0,
      keepEmpty: "",
      dropNull: null,
      dropUndefined: undefined,
    });
    expect(options.queryParams).toEqual({
      keepFalse: false,
      keepZero: 0,
      keepEmpty: "",
    });
  });
});

describe("defaultHttpUploadOptions", () => {
  it("ไม่มี Content-Type header (สำหรับ FormData)", () => {
    const options = defaultHttpUploadOptions();
    expect(options.headers).toBeUndefined();
  });

  it("มี InterceptorConfig", () => {
    const options = defaultHttpUploadOptions(true, true);
    const config = getInterceptorConfig(options);
    expect(config).toBeDefined();
    expect(config!.ignoreLoading).toBe(true);
    expect(config!.ignoreErrors).toBe(true);
  });
});

describe("createDefaultHttpOptions (overload dispatcher)", () => {
  it("dispatch ไป defaultHttpOptionsFromConfig เมื่อส่ง RequestConfig", () => {
    const options = createDefaultHttpOptions({ ignoreLoading: true });
    const config = getInterceptorConfig(options);
    expect(config!.ignoreLoading).toBe(true);
  });

  it("dispatch ไป defaultHttpOptionsFromParams เมื่อส่ง QueryParams", () => {
    const options = createDefaultHttpOptions({ foo: "bar" });
    expect(options.queryParams).toEqual({ foo: "bar" });
  });

  it("handle config เป็น argument ที่ 2 (เมื่อ arg 1 เป็น QueryParams)", () => {
    const options = createDefaultHttpOptions({ foo: "bar" }, { ignoreErrors: true });
    const config = getInterceptorConfig(options);
    expect(config!.ignoreErrors).toBe(true);
    expect(options.queryParams).toEqual({ foo: "bar" });
  });
});

describe("defaultHttpOptionsFromParams", () => {
  it("merge queryParams เข้า config.queryParams", () => {
    const options = defaultHttpOptionsFromParams({ key: "value" }, { ignoreLoading: true });
    const config = getInterceptorConfig(options);
    expect(config!.ignoreLoading).toBe(true);
    expect(options.queryParams).toEqual({ key: "value" });
  });
});
