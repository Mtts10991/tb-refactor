/**
 * @fileoverview
 * สร้าง request-scoped next-intl instance สำหรับแต่ละ HTTP request.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/translate/translate-default-loader.ts
 *   (โหลด /assets/locale/locale.constant-{lang}.json)
 *
 * @reason
 * ใน Next.js App Router ทุก request ต้องการ locale instance แยกกัน
 * เพื่อรองรับ concurrent rendering ที่ถูกต้อง. next-intl v4 ใช้ getRequestConfig()
 * เพื่อสร้าง request-scoped config.
 */

import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { internationalizationRouting } from "./routing";

/**
 * next-intl v4 request configuration.
 *
 * อ่าน locale จาก request (ที่ middleware กำหนด) แล้วโหลดข้อความ locale ที่เกี่ยวข้อง.
 * ถ้า locale ไม่ valid จะ fallback ไป defaultLocale (en).
 *
 * @param parameters - { requestLocale } — locale ที่ middleware resolve แล้ว
 * @returns object ที่มี locale และ messages สำหรับ request นี้
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // รอ locale ที่ middleware กำหนด (จะสร้างใน Task 5 หรือ Phase 3)
  const requestedLocale = await requestLocale;
  const locale = hasLocale(internationalizationRouting.locales, requestedLocale)
    ? requestedLocale
    : internationalizationRouting.defaultLocale;

  // โหลด messages จากไฟล์ JSON ใน public/locale/
  // parity กับ TranslateDefaultLoader ของ Angular ที่โหลด locale.constant-{lang}.json
  const messagesModule = await import(`../public/locale/${locale}.json`);

  return {
    locale,
    messages: messagesModule.default ?? messagesModule,
  };
});
