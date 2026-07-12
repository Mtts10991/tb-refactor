/**
 * @fileoverview
 * ESLint flat config ของ ThingsBoard UI — รวม Next.js config, TypeScript parser,
 * และ custom rule ที่บังคับ JSDoc ภาษาไทย.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/eslint.config.mjs (flat config ของ Angular)
 *
 * @reason
 * ใช้ ESLint 9 flat config (ไม่ใช่ .eslintrc) เพราะ:
 *   1. เป็น default ของ create-next-app ใหม่
 *   2. รองรับ ESM
 *   3. performance ดีกว่า (ไม่ต้อง resolve config hierarchy)
 *
 * @note
 * `eslint-config-next` เวอร์ชัน 16 export เป็น flat config **array** (ไม่ใช่ plugin object)
 * ดังนั้นจึงใช้ spread syntax `...coreWebVitals` / `...nextTypeScript` เพื่อรวม config
 * ของ Next.js เข้ากับ config ของเรา แทนที่จะประกาศเป็น `plugins: { next: ... }`
 * (รูปแบบหลังใช้ไม่ได้ใน flat config เพราะค่าที่ import มาเป็น array ไม่ใช่ plugin)
 */

import { defineConfig, globalIgnores } from "eslint/config";
import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import requireThaiJsdocRule from "./eslint-rules/require-thai-jsdoc.mjs";

/**
 * Custom ESLint plugin เฉพาะของ ThingsBoard — ประกาศเป็น virtual plugin
 * ตามรูปแบบที่ ESLint flat config แนะนำ (define plugin inline ใน config file).
 *
 * @see https://eslint.org/docs/latest/use/configure/plugins#configure-plugins
 */
const thingsBoardPlugin = {
  meta: {
    name: "thingsboard",
    version: "1.0.0",
  },
  rules: {
    "require-thai-jsdoc": requireThaiJsdocRule,
  },
};

const eslintConfiguration = defineConfig([
  // ละเว้นไฟล์ที่ไม่จำเป็นต้อง lint
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "public/**",
    "next-env.d.ts",
  ]),

  // การตั้งค่าหลักของ Next.js (core-web-vitals + TypeScript rules + type-aware parser)
  // spread เข้ามาเพื่อ parity กับ default ของ create-next-app
  ...coreWebVitals,
  ...nextTypeScript,

  // Custom rule + TypeScript rules ที่เข้มงวดขึ้น
  // ทำเป็น config object แยกต่างหากเพื่อไม่ override config ของ Next.js
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    plugins: {
      thingsboard: thingsBoardPlugin,
    },
    rules: {
      // บังคับ JSDoc ภาษาไทยทุกไฟล์ (custom rule ของ ThingsBoard)
      "thingsboard/require-thai-jsdoc": "error",

      // TypeScript rules — parity กับ strict mode
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // ไฟล์ config และ eslint-rules ที่อนุญาตให้ใช้ console.log และ rules ที่หละหลวมขึ้น
  // eslint-rules เองเป็น ESLint API code ที่ต้องใช้ `any` และ console ได้
  {
    files: ["*.config.{ts,js,mjs,cjs}", "eslint-rules/**/*.js"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfiguration;
