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

/**
 * Regression tests สำหรับ middleware bug C1 — ตรวจว่าแอป render ได้จริงใน browser
 * (CSS/JS assets โหลดได้ ไม่ถูก middleware redirect).
 *
 * @reason
 * Bug C1 (middleware export name ผิด) ทำให้ทุก request รวม /_next/static/* ถูก redirect
 * ไป /{locale}/_next/... ทำให้ browser โหลด CSS/JS ไม่ได้ และแอป render เป็น HTML เปล่า.
 * Tests นี้ navigate จริงเพื่อยืนยันว่า:
 *   1. หน้า /en และ /th render ได้ (HTTP 200 จาก page เอง ไม่ใช่ redirect)
 *   2. CSS assets โหลดได้ (status < 400)
 *   3. เนื้อหาภาษาที่ถูกต้องปรากฏใน DOM
 */
test.describe("middleware bug C1 regression — browser render check", () => {
  test("หน้า /en render ได้จริง พร้อม CSS และเนื้อหาภาษาอังกฤษ", async ({ page }) => {
    // ระวัง console errors โดยเฉพาะ 404 ของ CSS/JS assets
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    // ระวัง response ที่เป็น 4xx/5xx โดยเฉพาะ /_next/static/*
    const failedAssetResponses: string[] = [];
    page.on("response", (response) => {
      const requestUrl = response.url();
      if (
        requestUrl.includes("/_next/static/") &&
        response.status() >= 400
      ) {
        failedAssetResponses.push(`${response.status()} ${requestUrl}`);
      }
    });

    await page.goto("/en");

    // ตรวจว่า URL เป็น /en จริง (ไม่ถูก redirect ซ้ำ)
    await expect(page).toHaveURL(/\/en$/);

    // ตรวจว่า h1 มีข้อความ welcome ภาษาอังกฤษ (DOM ถูก render + i18n ทำงาน)
    await expect(page.locator("h1")).toContainText("Welcome to ThingsBoard");

    // ตรวจว่าไม่มี CSS/JS asset ที่โหลดไม่ได้
    expect(failedAssetResponses).toEqual([]);

    // ตรวจว่าไม่มี console error เกี่ยวกับ asset loading
    const assetErrors = consoleErrors.filter((error) =>
      /404|Failed to load|net::ERR/.test(error)
    );
    expect(assetErrors).toEqual([]);
  });

  test("หน้า /th render ได้จริง พร้อมเนื้อหาภาษาไทย", async ({ page }) => {
    await page.goto("/th");

    await expect(page).toHaveURL(/\/th$/);

    // ตรวจว่า h1 มีข้อความ welcome ภาษาไทย
    await expect(page.locator("h1")).toContainText("ยินดีต้อนรับสู่ ThingsBoard");
  });

  test("/api/* path ไม่ถูก middleware redirect (proxy ทำงานได้)", async ({ request }) => {
    // /api/auth/me ควรไปถึง backend ที่ไม่ได้รัน → HTTP 500 (proxy ทำงาน)
    // ไม่ควรเป็น 307 redirect ไป /en/api/auth/me (อาการของ bug C1)
    const response = await request.get("/api/auth/me", {
      maxRedirects: 0,
    });

    // ยอมรับได้ทั้ง 500 (backend ไม่รัน) หรือ 401 (auth ต้องการ)
    // แต่ห้ามเป็น 307 (redirect จาก middleware ที่บั๊ก)
    expect(response.status()).not.toBe(307);
  });
});
