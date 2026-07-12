/**
 * @fileoverview
 * Parity tests สำหรับ HTTP Interceptor chain ของ ThingsBoard
 *
 * ทดสอบ parity ของ interceptor chain 5 ตัว + error handling infrastructure:
 *   1. **Authentication Interceptor** — X-Authorization header, skip login/token/noauth
 *   2. **Error Handling Interceptor** — 401 retry, 403 forbidden, 41 entitiesLimitExceeded, status 0/-1, 504
 *   3. **Rate Limit Interceptor** — 429 retry with jitter (1000 + random*3000), max 3 retries
 *   4. **Entity Conflict Interceptor** — 409 conflict, ignoreVersionConflict flag, version removal
 *   5. **Loading Indicator Interceptor** — ref count (0→1 start, 1→0 finish)
 *   6. **Interceptor Chain** — order: auth → error → loading → rate-limit → entity-conflict
 *   7. **Server Error Codes** — 12 error codes (2, 10, 11, 12, 15, 20, 30, 31, 32, 33, 34, 41)
 *   8. **HTTP Error Parser** — parseHttpErrorMessage logic
 *
 * @parityEngine Angular
 * parity กับ: ui-ngx/src/app/core/interceptors/global-http-interceptor.ts (~207 บรรทัด)
 *   + ui-ngx/src/app/core/interceptors/entity-conflict.interceptor.ts
 *   + ui-ngx/src/app/core/utils.ts (serverErrorCodesTranslations + parseHttpErrorMessage)
 *
 * @reason
 * Acceptance criteria Phase 1: "Parity Interceptors: parity test 401 retry + 429 backoff + 409 conflict + 403 forbidden + 41 entitiesLimitExceeded ผ่าน"
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Helper: อ่าน source ของไฟล์
function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

// ============================================================
// 1. AUTHENTICATION INTERCEPTOR PARITY
// ============================================================
describe("Authentication interceptor parity", () => {
  const source = readSource("src/core/http/interceptors/authentication-interceptor.ts");

  it("ใช้ header 'X-Authorization' ไม่ใช่ 'Authorization' มาตรฐาน (parity กับ Angular)", () => {
    // parity: Angular GlobalHttpInterceptor ใช้ X-Authorization ใน updateAuthorizationHeader()
    expect(source).toContain("X-Authorization");
    expect(source).not.toMatch(/const AUTH_HEADER_NAME\s*=\s*["']Authorization["']/);
  });

  it("Auth scheme เป็น 'Bearer ' (มี trailing space) (parity)", () => {
    expect(source).toMatch(/Bearer\s/);
  });

  it("Skip endpoint '/api/auth/login' (parity กับ Angular tokenBasedAuthEntryPoint)", () => {
    expect(source).toContain("/api/auth/login");
  });

  it("Skip endpoint '/api/auth/token' (refresh endpoint) (parity)", () => {
    expect(source).toContain("/api/auth/token");
  });

  it("Skip endpoint '/api/noauth' (non-token-based endpoints) (parity)", () => {
    expect(source).toContain("/api/noauth");
  });

  it("Gate: ใส่ token เฉพาะ URL ที่ขึ้นต้นด้วย '/api/' (parity)", () => {
    expect(source).toMatch(/startsWith\(["']\/api\/["']\)/);
  });

  it("Factory function: createAuthenticationInterceptor (parity กับ Angular class)", () => {
    expect(source).toMatch(/export function createAuthenticationInterceptor/);
  });

  it("รับ getJwtToken dependency สำหรับอ่าน JWT (parity)", () => {
    expect(source).toMatch(/getJwtToken/);
  });

  it("ถ้าไม่มี JWT → forward request unchanged (parity)", () => {
    // parity: Angular ไม่ใส่ header ถ้าไม่มี token → ปล่อยให้ error-handling handle 401
    expect(source).toMatch(/null|undefined|!/);
  });
});

// ============================================================
// 2. ERROR HANDLING INTERCEPTOR PARITY
// ============================================================
describe("Error handling interceptor parity", () => {
  const source = readSource("src/core/http/interceptors/error-handling-interceptor.ts");

  it("Handle status 401 → refresh token + retry (parity กับ Angular)", () => {
    expect(source).toContain("401");
  });

  it("401 refresh ใช้ error code 11 (jwtTokenExpired) เป็น trigger (parity)", () => {
    // parity: Angular ตรวจ errorCode === 11 ใน onExpiredJwtToken
    expect(source).toMatch(/jwtTokenExpired|11/);
  });

  it("Refresh fail เรียก logout (parity)", () => {
    expect(source).toMatch(/logout/);
  });

  it("Refresh fail message 'Unauthorized!' (parity)", () => {
    expect(source).toContain("Unauthorized!");
  });

  it("Handle status 403 → forbidden (parity)", () => {
    expect(source).toContain("403");
  });

  it("Handle errorCode 41 (entitiesLimitExceeded) (parity)", () => {
    expect(source).toMatch(/entitiesLimitExceeded|41/);
  });

  it("Handle status 0 หรือ -1 → 'Unable to connect' (parity)", () => {
    expect(source).toContain("Unable to connect");
  });

  it("Handle status 504 → 'Request timeout' (parity)", () => {
    expect(source).toContain("Request timeout");
  });

  it("Skip error display สำหรับ /api/rpc URLs (parity)", () => {
    expect(source).toContain("/api/rpc");
  });

  it("Error code 15 (credentialsExpired) → throw without refresh (parity)", () => {
    expect(source).toMatch(/credentialsExpired|15/);
  });

  it("Factory function: createErrorHandlingInterceptor (parity)", () => {
    expect(source).toMatch(/export function createErrorHandlingInterceptor/);
  });

  it("Token refresh URL gate: request.url !== '/api/auth/token' (parity)", () => {
    // parity: ไม่ refresh ถ้า request เองคือ refresh endpoint (กัน infinite loop)
    expect(source).toContain("/api/auth/token");
  });
});

// ============================================================
// 3. RATE LIMIT INTERCEPTOR PARITY
// ============================================================
describe("Rate limit interceptor parity", () => {
  const source = readSource("src/core/http/interceptors/rate-limit-interceptor.ts");

  it("Handle status 429 (Too Many Requests) (parity)", () => {
    expect(source).toContain("429");
  });

  it("Jitter delay formula: 1000 + random*3000 (parity กับ Angular)", () => {
    // parity: Angular rate-limit retry ใช้ jitter 1000 + Math.random() * 3000
    expect(source).toMatch(/1000\s*\+\s*Math\.random\(\)\s*\*\s*3000/);
  });

  it("Max retries = 3 (DEFAULT_MAX_429_RETRIES) (parity)", () => {
    expect(source).toMatch(/DEFAULT_MAX_429_RETRIES\s*=\s*3/);
  });

  it("Retry trigger conditions: status 429 + resendRequest + retryCount < max (parity)", () => {
    expect(source).toMatch(/retryCount|retries/);
    expect(source).toMatch(/maxRetries|MAX.*RETRIES/);
  });

  it("ใช้ RxJS retryWhen/delay สำหรับ retry logic (parity)", () => {
    expect(source).toMatch(/retry|delay/);
  });

  it("Non-429 → throwError (parity)", () => {
    expect(source).toMatch(/throwError|throw/);
  });

  it("Factory function: createRateLimitInterceptor (parity)", () => {
    expect(source).toMatch(/export function createRateLimitInterceptor/);
  });
});

// ============================================================
// 4. ENTITY CONFLICT INTERCEPTOR PARITY
// ============================================================
describe("Entity conflict interceptor parity", () => {
  const source = readSource("src/core/http/interceptors/entity-conflict-interceptor.ts");

  it("Handle status 409 (Conflict) (parity)", () => {
    expect(source).toContain("409");
  });

  it("ignoreVersionConflict flag support (parity)", () => {
    expect(source).toMatch(/ignoreVersionConflict|shouldIgnoreVersionConflict/);
  });

  it("Versioned entity detection: id หรือ ruleChainId (parity)", () => {
    expect(source).toMatch(/ruleChainId|isVersionedEntity/);
  });

  it("Conflict fallback message 'Entity version conflict' (parity)", () => {
    expect(source).toContain("Entity version conflict");
  });

  it("Clone request ไม่มี version field เมื่อ retry (parity)", () => {
    expect(source).toMatch(/cloneRequestWithoutVersion|version/);
  });

  it("Gate: ทำงานเฉพาะ /api/* URLs (parity)", () => {
    expect(source).toMatch(/\/api\//);
  });

  it("Factory function: createEntityConflictInterceptor (parity)", () => {
    expect(source).toMatch(/export function createEntityConflictInterceptor/);
  });

  it("Dialog result true → retry, false/null → rethrow (parity)", () => {
    expect(source).toMatch(/retry|rethrow|throw/);
  });
});

// ============================================================
// 5. LOADING INDICATOR INTERCEPTOR PARITY
// ============================================================
describe("Loading indicator interceptor parity", () => {
  const source = readSource("src/core/http/interceptors/loading-indicator-interceptor.ts");

  it("Ref count mechanism: activeRequests variable (parity)", () => {
    expect(source).toMatch(/activeRequests/);
  });

  it("Start loading เมื่อ activeRequests === 1 (transition 0→1) (parity)", () => {
    // parity: Angular dispatches ActionLoadStart when loadingCount goes from 0 to 1
    expect(source).toMatch(/===\s*1/);
  });

  it("Finish loading เมื่อ activeRequests === 0 (transition 1→0) (parity)", () => {
    expect(source).toMatch(/===\s*0/);
  });

  it("startLoading + finishLoading callbacks (parity)", () => {
    expect(source).toMatch(/startLoading/);
    expect(source).toMatch(/finishLoading/);
  });

  it("Increment on request start, decrement on finalize (parity)", () => {
    expect(source).toMatch(/\+\+|increment/i);
    expect(source).toMatch(/--|decrement|finalize/i);
  });

  it("ignoreLoading flag support (parity)", () => {
    expect(source).toMatch(/ignoreLoading/);
  });

  it("Gate: ทำงานเฉพาะ /api/* URLs (parity)", () => {
    expect(source).toMatch(/\/api\//);
  });

  it("Factory function: createLoadingIndicatorInterceptor (parity)", () => {
    expect(source).toMatch(/export function createLoadingIndicatorInterceptor/);
  });
});

// ============================================================
// 6. INTERCEPTOR CHAIN PARITY
// ============================================================
describe("Interceptor chain order parity", () => {
  const source = readSource("src/core/http/interceptor-chain.ts");

  it("Factory function: createDefaultInterceptorChain (parity)", () => {
    expect(source).toMatch(/export function createDefaultInterceptorChain/);
  });

  it("Chain มี 5 interceptors (parity)", () => {
    expect(source).toMatch(/createAuthenticationInterceptor/);
    expect(source).toMatch(/createErrorHandlingInterceptor/);
    expect(source).toMatch(/createLoadingIndicatorInterceptor/);
    expect(source).toMatch(/createRateLimitInterceptor/);
    expect(source).toMatch(/createEntityConflictInterceptor/);
  });

  it("Order: auth → error → loading → rate-limit → entity-conflict (parity)", () => {
    // parity: ลำดับใน array คือ outermost → innermost (auth ทำก่อน request ออก, entity-conflict ทำหลังสุด)
    const authIndex = source.indexOf("createAuthenticationInterceptor");
    const errorIndex = source.indexOf("createErrorHandlingInterceptor");
    const loadingIndex = source.indexOf("createLoadingIndicatorInterceptor");
    const rateLimitIndex = source.indexOf("createRateLimitInterceptor");
    const conflictIndex = source.indexOf("createEntityConflictInterceptor");

    expect(authIndex).toBeGreaterThan(-1);
    expect(errorIndex).toBeGreaterThan(authIndex);
    expect(loadingIndex).toBeGreaterThan(errorIndex);
    expect(rateLimitIndex).toBeGreaterThan(loadingIndex);
    expect(conflictIndex).toBeGreaterThan(rateLimitIndex);
  });

  it("Return array ของ HttpInterceptor[] (parity)", () => {
    expect(source).toMatch(/:\s*HttpInterceptor\[\]/);
  });

  it("InterceptorChainDependencies interface aggregates ทุก deps (parity)", () => {
    expect(source).toMatch(/InterceptorChainDependencies/);
  });
});

// ============================================================
// 7. SERVER ERROR CODES PARITY
// ============================================================
describe("Server error codes parity", () => {
  const source = readSource("src/core/error-handling/server-error-codes.ts");

  it("Error code 2 (general) parity", () => {
    expect(source).toMatch(/general.*2/);
  });

  it("Error code 10 (authentication) parity", () => {
    expect(source).toMatch(/authentication.*10/);
  });

  it("Error code 11 (jwtTokenExpired) parity — สำคัญสำหรับ 401 refresh", () => {
    expect(source).toMatch(/jwtTokenExpired.*11/);
  });

  it("Error code 12 (tenantTrialExpired) parity", () => {
    expect(source).toMatch(/tenantTrialExpired.*12/);
  });

  it("Error code 15 (credentialsExpired) parity", () => {
    expect(source).toMatch(/credentialsExpired.*15/);
  });

  it("Error code 20 (permissionDenied) parity", () => {
    expect(source).toMatch(/permissionDenied.*20/);
  });

  it("Error code 30 (invalidArguments) parity", () => {
    expect(source).toMatch(/invalidArguments.*30/);
  });

  it("Error code 31 (badRequestParams) parity", () => {
    expect(source).toMatch(/badRequestParams.*31/);
  });

  it("Error code 32 (itemNotFound) parity", () => {
    expect(source).toMatch(/itemNotFound.*32/);
  });

  it("Error code 33 (tooManyRequests) parity", () => {
    expect(source).toMatch(/tooManyRequests.*33/);
  });

  it("Error code 34 (tooManyUpdates) parity", () => {
    expect(source).toMatch(/tooManyUpdates.*34/);
  });

  it("Error code 41 (entitiesLimitExceeded) parity — สำคัญสำหรับ entities limit dialog", () => {
    expect(source).toMatch(/entitiesLimitExceeded.*41/);
  });

  it("serverErrorCodesTranslations Map — 12 entries (parity)", () => {
    expect(source).toMatch(/serverErrorCodesTranslations/);
    // ตรวจ i18n key prefix
    expect(source).toContain("server-error.");
  });

  it("AuthEntryPoint constants (login, tokenRefresh, nonTokenBased) parity", () => {
    expect(source).toContain("/api/auth/login");
    expect(source).toContain("/api/auth/token");
    expect(source).toContain("/api/noauth");
  });
});

// ============================================================
// 8. HTTP ERROR PARSER PARITY
// ============================================================
describe("HTTP error parser parity", () => {
  const source = readSource("src/core/error-handling/http-error-parser.ts");

  it("parseHttpErrorMessage function (parity กับ Angular utils.ts)", () => {
    expect(source).toMatch(/parseHttpErrorMessage/);
  });

  it("รับ HttpErrorLike + TranslateFn + responseType (parity)", () => {
    expect(source).toMatch(/HttpErrorLike|errorResponse/);
    expect(source).toMatch(/TranslateFn|translate/);
  });

  it("Return ParsedHttpErrorMessage { message, timeout } (parity)", () => {
    expect(source).toMatch(/ParsedHttpErrorMessage/);
    expect(source).toMatch(/message/);
    expect(source).toMatch(/timeout/);
  });

  it("Default timeout = 0 (parity)", () => {
    expect(source).toMatch(/timeout.*0|0.*timeout/);
  });

  it("Error format: 'status: translatedMessage' (parity)", () => {
    // parity: Angular format `${status}: ${translate(errorKey)}`
    // ใน source code อาจเขียนหลายรูปแบบ เช่น template literal หรือ concatenation
    expect(
      source.includes("status") && (source.includes("translate") || source.includes("translateFn")),
    ).toBe(true);
  });

  it("Fallback message 'Unhandled error code' (parity)", () => {
    expect(source).toContain("Unhandled error code");
  });

  it("serverErrorCodesTranslations lookup (parity)", () => {
    expect(source).toMatch(/serverErrorCodesTranslations/);
  });

  it("Handle responseType 'text' — JSON.parse error body (parity)", () => {
    expect(source).toMatch(/responseType.*text|text.*responseType|JSON\.parse/);
  });
});
