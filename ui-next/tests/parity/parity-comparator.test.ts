/**
 * @fileoverview
 * Unit test ของ parity comparator — ทดสอบว่าฟังก์ชันเปรียบเทียบทำงานถูกต้อง
 * ทั้งกรณีที่เหมือนกันและแตกต่างกัน.
 *
 * @parityEngine
 * ไม่มี equivalent ใน Angular — test ใหม่สำหรับ infrastructure ใหม่.
 */

import { describe, it, expect } from "vitest";
import {
  compareHttpRequests,
  type HttpRequestSnapshot,
} from "./parity-comparator";

describe("compareHttpRequests", () => {
  const baselineRequest: HttpRequestSnapshot = {
    method: "GET",
    url: "/api/devices?page=0&pageSize=10",
    relevantHeaders: {
      "X-Authorization": "Bearer test-token-123",
      "Content-Type": "application/json",
    },
    body: null,
  };

  it("คืนค่า isMatch=true เมื่อ request ทั้งสองเหมือนกันทุก field", () => {
    const identicalRequest: HttpRequestSnapshot = { ...baselineRequest };

    const result = compareHttpRequests(baselineRequest, identicalRequest);

    expect(result.isMatch).toBe(true);
    expect(result.differences).toHaveLength(0);
  });

  it("ตรวจจับความแตกต่างของ method ได้", () => {
    const differentMethodRequest: HttpRequestSnapshot = {
      ...baselineRequest,
      method: "POST",
    };

    const result = compareHttpRequests(baselineRequest, differentMethodRequest);

    expect(result.isMatch).toBe(false);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]?.fieldPath).toBe("method");
  });

  it("ตรวจจับความแตกต่างของ X-Authorization header ได้", () => {
    const differentTokenRequest: HttpRequestSnapshot = {
      ...baselineRequest,
      relevantHeaders: {
        ...baselineRequest.relevantHeaders,
        "X-Authorization": "Bearer wrong-token-456",
      },
    };

    const result = compareHttpRequests(baselineRequest, differentTokenRequest);

    expect(result.isMatch).toBe(false);
    expect(result.differences[0]?.fieldPath).toBe("headers.X-Authorization");
  });

  it("ignore header ที่ไม่อยู่ใน relevant list", () => {
    const requestWithExtraHeaders: HttpRequestSnapshot = {
      ...baselineRequest,
      relevantHeaders: {
        ...baselineRequest.relevantHeaders,
        "User-Agent": "different-browser",
      },
    };

    const result = compareHttpRequests(
      baselineRequest,
      requestWithExtraHeaders,
    );

    expect(result.isMatch).toBe(true);
  });

  it("ตรวจจับความแตกต่างของ body ได้", () => {
    const baselineWithBody: HttpRequestSnapshot = {
      ...baselineRequest,
      method: "POST",
      body: { deviceName: "original-name" },
    };
    const differentBodyRequest: HttpRequestSnapshot = {
      ...baselineRequest,
      method: "POST",
      body: { deviceName: "different-name" },
    };

    const result = compareHttpRequests(
      baselineWithBody,
      differentBodyRequest,
    );

    expect(result.isMatch).toBe(false);
    expect(result.differences[0]?.fieldPath).toBe("body");
  });
});
