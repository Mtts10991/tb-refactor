/**
 * @fileoverview
 * การตั้งค่า Vitest สำหรับ unit testing ของ ThingsBoard UI.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: karma.conf.js ของ Angular (test runner config)
 *   แต่ Vitest ใช้ Vite ที่เร็วกว่าและรองรับ ESM โดยกำเนิด
 *
 * @reason
 * ใช้ Vitest แทน Jest เพราะ:
 *   1. ผสานกับ Vite/Next.js ได้ดีกว่า
 *   2. เร็วกว่า (ใช้ native ESM ไม่ต้อง transpile)
 *   3. API คล้าย Jest ทำให้ migration ง่าย
 */

import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const vitestConfiguration = defineConfig({
  resolve: {
    alias: {
      // parity กับ tsconfig paths — ทำให้ test file import ผ่าน alias ได้
      "@app": path.resolve(currentDirectory, "./src/app"),
      "@core": path.resolve(currentDirectory, "./src/core"),
      "@shared": path.resolve(currentDirectory, "./src/shared"),
      "@widgets": path.resolve(currentDirectory, "./src/widgets"),
      "@features": path.resolve(currentDirectory, "./src/feature-components"),
      "@styles": path.resolve(currentDirectory, "./src/styles"),
      "@components": path.resolve(currentDirectory, "./src/components"),
      "@lib": path.resolve(currentDirectory, "./src/lib"),
      "@tests": path.resolve(currentDirectory, "./tests"),
    },
  },
  test: {
    environment: "node",
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "eslint-rules/**/*.test.mjs",
      "src/**/*.test.ts",
      // parity comparator unit test (pure logic, no browser — รันผ่าน vitest)
      "tests/parity/**/*.test.ts",
      // parity service specs (ใช้ vitest + mock HttpClientCaptor — ไม่ใช้ Playwright)
      "tests/parity/services-parity.spec.ts",
      // parity WebSocket specs (ใช้ vitest + source-code inspection — ไม่ต้องการ WebSocket server)
      "tests/parity/websocket-parity.spec.ts",
    ],
    // หมายเหตุ: tests/parity/parity-smoke.spec.ts เป็น Playwright spec (import จาก
    // @playwright/test) จึงต้องถูก exclude เพื่อกัน vitest รันผิดตัว.
    // แต่ services-parity + websocket-parity เป็น vitest spec (mock/source-based)
    exclude: [
      "node_modules",
      ".next",
      "tests/end-to-end",
      "tests/parity/parity-smoke.spec.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.*", "src/**/*.stories.*"],
    },
  },
});

export default vitestConfiguration;
