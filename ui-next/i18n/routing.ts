/**
 * @fileoverview
 * นิยาม routing configuration ของ next-intl v4 — กำหนด locale prefixes และ pathname strategy.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/settings/settings.utils.ts (ฟังก์ชัน updateUserLang)
 *   และ ui-ngx/esbuild/tb-esbuild-plugins.ts (SUPPORTED_LANGS auto-discovery)
 *
 * @reason
 * next-intl v4 ใช้ locale-as-prefix (/en/home, /th/home) ซึ่ง parity กับ
 * วิธีที่ Angular ใช้ moment.locale() + translate.use(lang).
 * ใน Phase 0 รองรับเพียง 2 ภาษา (en, th) — Phase 1.9 จะขยายเป็น 27 ภาษา parity กับ Angular.
 */

import { defineRouting } from "next-intl/routing";

/**
 * next-intl v4 routing configuration.
 * ใช้สำหรับสร้าง middleware และ locale-aware links ใน Next.js App Router.
 */
export const internationalizationRouting = defineRouting({
  // รายการ locale ที่รองรับ — parity กับ SUPPORTED_LANGS ของ Angular
  // Phase 0: 2 ภาษาเริ่มต้น (en, th)
  locales: ["en", "th"],

  // locale เริ่มต้นเมื่อ user เข้ามาโดยไม่ระบุ — parity กับ en_US ของ Angular
  defaultLocale: "en",

  // ใช้ locale เป็น prefix เสมอ (/en/..., /th/...) เพื่อ SEO และ bookmark parity
  localePrefix: "always",
});
