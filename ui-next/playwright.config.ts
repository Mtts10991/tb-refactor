/**
 * @fileoverview
 * การตั้งค่า Playwright สำหรับ ThingsBoard UI — แบ่ง project เป็น parity (contract test)
 * และ e2e (user flow test) เพื่อรันแยกกันได้.
 *
 * @reason
 * parity tests ต้องการ backend ปลอม (mock) ในขณะที่ e2e ต้องการ backend จริง —
 * การแบ่ง project ทำให้ CI รันแยก stage กันได้.
 *
 * ใน Phase 0 ใช้ smoke test เพื่อยืนยันว่า infrastructure พร้อมใช้งาน.
 * parity test จริงจะเริ่มใน Phase 1 เมื่อ port HTTP services เสร็จ.
 */

import { defineConfig, devices } from "@playwright/test";

const playwrightConfiguration = defineConfig({
  testDir: "./tests",

  // parity test ใช้ timeout นานเพราะต้องรอ Angular และ Next.js ทั้งคู่ (ในอนาคต)
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },

  fullyParallel: false, // parity test ต้องรันตามลำดับเพราะแชร์ mock backend
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
  ],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "parity",
      testMatch: "tests/parity/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "e2e",
      testMatch: "tests/end-to-end/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  // dev server ต้องรันอยู่ก่อน — parity test จะไปเปิดใช้ mock backend เอง (ใน Phase 1)
  webServer: process.env.CI
    ? {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});

export default playwrightConfiguration;
