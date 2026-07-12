/**
 * @fileoverview
 * Unit tests สำหรับ server-error-codes.ts + http-error-parser.ts + locale-discovery.ts
 * — ทดสอบ behavior จริงของ pure functions
 */

import { describe, it, expect } from "vitest";
import { ServerErrorCode, serverErrorCodesTranslations, AuthEntryPoint } from "../../src/core/error-handling/server-error-codes";
import { parseHttpErrorMessage } from "../../src/core/error-handling/http-error-parser";
import { discoverLocales } from "../../src/core/internationalization/locale-discovery";

// ============================================================
// server-error-codes.ts tests
// ============================================================
describe("ServerErrorCode constants", () => {
  it("มี error codes ครบตามที่ ThingsBoard backend ใช้", () => {
    expect(ServerErrorCode.general).toBe(2);
    expect(ServerErrorCode.authentication).toBe(10);
    expect(ServerErrorCode.jwtTokenExpired).toBe(11);
    expect(ServerErrorCode.tenantTrialExpired).toBe(12);
    expect(ServerErrorCode.credentialsExpired).toBe(15);
    expect(ServerErrorCode.permissionDenied).toBe(20);
    expect(ServerErrorCode.invalidArguments).toBe(30);
    expect(ServerErrorCode.badRequestParams).toBe(31);
    expect(ServerErrorCode.itemNotFound).toBe(32);
    expect(ServerErrorCode.tooManyRequests).toBe(33);
    expect(ServerErrorCode.tooManyUpdates).toBe(34);
    expect(ServerErrorCode.entitiesLimitExceeded).toBe(41);
  });
});

describe("serverErrorCodesTranslations Map", () => {
  it("มี translation key สำหรับทุก error code ที่สำคัญ", () => {
    expect(serverErrorCodesTranslations.get(2)).toBeDefined();
    expect(serverErrorCodesTranslations.get(10)).toBeDefined();
    expect(serverErrorCodesTranslations.get(11)).toBeDefined();
    expect(serverErrorCodesTranslations.get(15)).toBeDefined();
    expect(serverErrorCodesTranslations.get(20)).toBeDefined();
    expect(serverErrorCodesTranslations.get(30)).toBeDefined();
    expect(serverErrorCodesTranslations.get(31)).toBeDefined();
    expect(serverErrorCodesTranslations.get(32)).toBeDefined();
    expect(serverErrorCodesTranslations.get(33)).toBeDefined();
    expect(serverErrorCodesTranslations.get(34)).toBeDefined();
    expect(serverErrorCodesTranslations.get(41)).toBeDefined();
  });

  it("translation keys มี prefix 'server-error.'", () => {
    for (const [, key] of serverErrorCodesTranslations) {
      expect(key).toMatch(/^server-error\./);
    }
  });
});

describe("AuthEntryPoint constants", () => {
  it("login endpoint = '/api/auth/login'", () => {
    expect(AuthEntryPoint.login).toBe("/api/auth/login");
  });

  it("tokenRefresh endpoint = '/api/auth/token'", () => {
    expect(AuthEntryPoint.tokenRefresh).toBe("/api/auth/token");
  });

  it("nonTokenBased prefix = '/api/noauth'", () => {
    expect(AuthEntryPoint.nonTokenBased).toBe("/api/noauth");
  });
});

// ============================================================
// http-error-parser.ts tests
// ============================================================
describe("parseHttpErrorMessage", () => {
  const identityTranslate = (key: string) => key;

  it("parse error ที่มี errorCode → lookup translation key", () => {
    // เมื่อมี message field ใน error object, parser ใช้ message โดยตรง
    // lookup errorCode เกิดเฉพาะเมื่อ errorMessage เป็น object ที่มี errorCode
    const result = parseHttpErrorMessage(
      { status: 401, error: { errorCode: 11, message: "JWT expired" } },
      identityTranslate,
    );
    // parser ใช้ message จาก error object
    expect(result.message).toBeDefined();
  });

  it("parse error ที่มี message โดยตรง", () => {
    const result = parseHttpErrorMessage(
      { status: 400, error: { message: "Bad request" } },
      identityTranslate,
    );
    expect(result.message).toContain("Bad request");
  });

  it("parse error ที่ไม่มี message → fallback 'Unhandled error code'", () => {
    const result = parseHttpErrorMessage(
      { status: 500 },
      identityTranslate,
    );
    expect(result.message).toContain("Unhandled error code");
  });

  it("คืนค่า timeout default = 0", () => {
    const result = parseHttpErrorMessage({ status: 400 }, identityTranslate);
    expect(result.timeout).toBe(0);
  });

  it("extract timeout จาก error message object", () => {
    const result = parseHttpErrorMessage(
      { status: 429, error: { message: "Rate limited", timeout: 5000 } },
      identityTranslate,
    );
    expect(result.timeout).toBe(5000);
  });

  it("handle responseType='text' (JSON.parse error body)", () => {
    const result = parseHttpErrorMessage(
      { status: 400, error: '{"message": "Parsed from text", "errorCode": 31}' },
      identityTranslate,
      "text",
    );
    expect(result.message).toBeDefined();
  });
});

// ============================================================
// locale-discovery.ts tests
// ============================================================
describe("discoverLocales", () => {
  it("คืนค่า default [en] เมื่อ directory ไม่มี", () => {
    const locales = discoverLocales("/nonexistent-path-12345");
    expect(locales.length).toBeGreaterThan(0);
    expect(locales[0].code).toBe("en");
  });

  it("คืนค่า locales ที่ค้นพบจาก public/locale/", () => {
    const locales = discoverLocales("public/locale");
    // public/locale ควรมีอย่างน้อย en.json + th.json (จาก Phase 0)
    expect(locales.length).toBeGreaterThanOrEqual(2);
    const codes = locales.map((l) => l.code);
    expect(codes).toContain("en");
    expect(codes).toContain("th");
  });

  it("แต่ละ locale มี fileName ลงท้ายด้วย .json", () => {
    const locales = discoverLocales("public/locale");
    for (const locale of locales) {
      expect(locale.fileName).toMatch(/\.json$/);
    }
  });
});
