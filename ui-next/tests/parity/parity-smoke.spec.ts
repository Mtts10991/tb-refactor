/**
 * @fileoverview
 * Smoke test ของ parity infrastructure — ยืนยันว่า Playwright + comparator
 * ทำงานได้ถูกต้อง ไม่ได้ทดสอบ parity ของ feature จริง (จะทำใน Phase 1 เป็นต้นไป).
 *
 * @reason
 * Phase 0 ต้องการเพียงยืนยันว่า infrastructure พร้อม ไม่ใช่มี test ครบ —
 * เพราะ fixtures จะถูก capture ใน Phase 1 เมื่อ port services เสร็จ.
 *
 * @note
 * ไฟล์นี้เป็น Playwright spec (import จาก @playwright/test) — ต่างจาก
 * parity-comparator.test.ts ที่เป็น Vitest unit test. การแยก runner ทำให้
 * smoke นี้รันภายใต้ Playwright environment เหมือน parity test จริงในอนาคต.
 */

import { test, expect } from "@playwright/test";
import {
  compareHttpRequests,
  type HttpRequestSnapshot,
} from "./parity-comparator";

test.describe("parity infrastructure smoke test", () => {
  test("compareHttpRequests ทำงานได้และคืนค่า isMatch=true เมื่อเหมือนกัน", () => {
    const identicalRequest: HttpRequestSnapshot = {
      method: "GET",
      url: "/api/health",
      relevantHeaders: {
        "X-Authorization": "Bearer smoke-test-token",
        "Content-Type": "application/json",
      },
      body: null,
    };

    const result = compareHttpRequests(identicalRequest, identicalRequest);

    expect(result.isMatch).toBe(true);
    expect(result.differences).toHaveLength(0);
  });

  test("infrastructure พร้อมสำหรับการเพิ่ม parity test ใน Phase 1", () => {
    // test นี้เป็น marker ว่า infrastructure ครบถ้วน — เมื่อ Phase 1 เริ่ม,
    // จะเพิ่ม fixtures และ assertions ที่เปรียบเทียบกับ Angular จริง
    expect(typeof compareHttpRequests).toBe("function");
  });
});
