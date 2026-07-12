/**
 * @fileoverview
 * Unit test สำหรับ ESLint custom rule require-thai-jsdoc — ทดสอบว่า rule ตรวจจับ
 * ไฟล์ที่ไม่มี JSDoc ภาษาไทย และผ่านไฟล์ที่มีอย่างถูกต้อง.
 */

import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import requireThaiJsdocRule from "./require-thai-jsdoc.mjs";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

describe("require-thai-jsdoc rule", () => {
  it("ผ่านไฟล์ที่มี JSDoc ภาษาไทย", () => {
    ruleTester.run("require-thai-jsdoc", requireThaiJsdocRule, {
      valid: [
        {
          code: `/**
 * @fileoverview
 * ไฟล์นี้ทำหน้าที่ทดสอบ rule.
 */
export const testValue = 1;`,
        },
      ],
      invalid: [],
    });
  });

  it("fail ไฟล์ที่ไม่มี JSDoc เลย", () => {
    ruleTester.run("require-thai-jsdoc", requireThaiJsdocRule, {
      valid: [],
      invalid: [
        {
          code: `export const testValue = 1;`,
          errors: [{ messageId: "missingJsdoc" }],
        },
      ],
    });
  });

  it("fail ไฟล์ที่มี JSDoc แต่เป็นภาษาอังกฤษล้วน", () => {
    ruleTester.run("require-thai-jsdoc", requireThaiJsdocRule, {
      valid: [],
      invalid: [
        {
          code: `/**
 * @fileoverview
 * This file tests the rule.
 */
export const testValue = 1;`,
          errors: [{ messageId: "missingThaiContent" }],
        },
      ],
    });
  });

  it("fail ไฟล์ที่มี line comment แทน JSDoc", () => {
    ruleTester.run("require-thai-jsdoc", requireThaiJsdocRule, {
      valid: [],
      invalid: [
        {
          code: `// ไฟล์นี้ทำหน้าที่ทดสอบ rule
export const testValue = 1;`,
          errors: [{ messageId: "missingJsdoc" }],
        },
      ],
    });
  });
});
