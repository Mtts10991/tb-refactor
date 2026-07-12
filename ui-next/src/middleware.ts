/**
 * @fileoverview
 * Next.js middleware สำหรับ next-intl v4 — ทำหน้าที่ detect locale จาก URL
 * และ redirect ไปยัง locale-prefixed path ถ้ายังไม่มี.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/app-routing.module.ts (route guard logic)
 *   และ ui-ngx/src/app/core/auth/auth.service.ts (loadUser → setUserLanguage)
 *
 * @reason
 * Next.js App Router ใช้ middleware สำหรับ i18n routing — parity กับ Angular
 * ที่ใช้ APP_INITIALIZER + TranslateService ตั้งภาษาตอน bootstrap.
 */

import createMiddleware from "next-intl/middleware";
import { internationalizationRouting } from "../i18n/routing";

/**
 * next-intl v4 middleware instance.
 * ทำหน้าที่:
 *   1. ตรวจ URL ว่ามี locale prefix หรือไม่
 *   2. ถ้าไม่มี → redirect ไป /{defaultLocale}/...
 *   3. ถ้ามี → set request locale สำหรับ server components
 */
export default createMiddleware(internationalizationRouting);

/**
 * กำหนด paths ที่ middleware ทำงาน.
 * แมตช์ทุก path ยกเว้น: API routes, Next.js internals (_next), static files.
 *
 * หมายเหตุสำคัญ: Next.js ต้องการ export ชื่อ "config" เป็นชื่อ reserved
 * ห้ามเปลี่ยนชื่อเป็นชื่ออื่น เพราะ Next.js จะมองข้ามและทำให้ middleware ทำงานบนทุก path
 * รวมทั้ง /_next/static/* ซึ่งจะทำให้ browser โหลด CSS/JS ไม่ได้ (redirect ไป /en/_next/...)
 *
 * หมายเหตุ: /api/* ผ่าน proxy ของ next.config.ts ไม่ต้องผ่าน middleware
 */
export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
