/**
 * @fileoverview
 * Root layout ของ ThingsBoard UI — ตั้งค่า providers ที่จำเป็นทั้งแอป:
 *   1. NextIntlClientProvider (สำหรับ i18n)
 *   2. HeroUI styles (ผ่าน globals.css import)
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/index.html + ui-ngx/src/app/app.module.ts (providers section)
 *
 * @reason
 * Next.js App Router ใช้ layout.tsx เป็น wrapper ทั้งแอป — ทุก page component
 * จะถูก render ภายใน layout นี้. ใช้ [locale] dynamic segment เพื่อ locale-aware routing.
 *
 * หมายเหตุ HeroUI:
 *   HeroUI v3 ใช้ CSS-based styling (ไม่ต้องใช้ React context provider)
 *   ดังนั้นไม่ต้องห่อด้วย <HeroUIProvider> — styles ทำงานผ่าน CSS classes อย่างเดียว.
 *
 * หมายเหตุ next-intl API:
 *   v4.13.x export `setRequestLocale` จาก `next-intl/server` (ไม่ใช่ `setLocale`).
 *   เป็นการ bind locale เข้ากับ async local storage ของ request ปัจจุบันเพื่อให้
 *   getMessages()/getTranslations() ใน server components ใช้ locale ที่ถูกต้อง.
 */

import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { internationalizationRouting } from "../../../i18n/routing";
import "../globals.css";

/**
 * Metadata ของแอป — parity กับ <title> ใน index.html ของ Angular.
 */
export const metadata: Metadata = {
  title: "ThingsBoard",
  description:
    "Open-source IoT Platform — Device management, data collection, processing, and visualization.",
};

/**
 * กำหนด static params สำหรับ generate ทุก locale ตอน build (static generation).
 *
 * @returns รายการ locale ที่ต้อง pre-render
 */
export function generateStaticParams() {
  return internationalizationRouting.locales.map((locale) => ({ locale }));
}

/**
 * Props สำหรับ RootLayout.
 */
interface RootLayoutProperties {
  /** children components ที่จะ render ใน layout */
  readonly children: React.ReactNode;

  /** locale ที่ได้จาก URL params ([locale] segment) */
  readonly params: Promise<{ readonly locale: string }>;
}

/**
 * Root layout component — ตั้งค่า providers ก่อน render children.
 *
 * @param properties - ดู RootLayoutProperties
 * @returns JSX element ที่ wrap ทั้งแอปด้วย NextIntlClientProvider
 */
export default async function RootLayout(
  properties: RootLayoutProperties,
): Promise<React.ReactElement> {
  const { locale } = await properties.params;

  // ตรวจว่า locale ที่ได้รับมาจาก URL อยู่ในรายการที่รองรับหรือไม่
  // ถ้าไม่ → โยน 404 (Next.js จะ render not-found page)
  if (!hasLocale(internationalizationRouting.locales, locale)) {
    notFound();
  }

  // ตั้ง locale สำหรับ server components ใน request นี้ (next-intl v4 API)
  // ชื่อ: setRequestLocale (v4.13.x) — ไม่ใช่ setLocale
  setRequestLocale(locale);

  // โหลด messages สำหรับ locale นี้
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {properties.children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
