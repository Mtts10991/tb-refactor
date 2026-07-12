/**
 * @fileoverview
 * หน้า home placeholder ของ ThingsBoard UI — แสดงข้อความต้อนรับ, language switcher,
 * และปุ่ม HeroUI เพื่อยืนยันว่า i18n + HeroUI ทำงานร่วมกันได้.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/modules/home/pages/home-links/ (home links page)
 *
 * @reason
 * Phase 0 ยังไม่มี auth และ feature pages — ใช้ placeholder เพื่อยืนยันว่า
 * stack ทั้งหมด (Next.js 16 + HeroUI v3 + Tailwind v4 + next-intl v4) ทำงานได้.
 * จะถูกแทนที่ด้วย home shell จริงใน Phase 3.2.
 */

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@components/language-switcher";

/**
 * Home page component (placeholder สำหรับ Phase 0).
 *
 * @returns JSX element ของหน้า home
 */
export default function HomePage(): React.ReactElement {
  const translate = useTranslations();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-thingsboard-primary to-thingsboard-secondary">
      <div className="max-w-md w-full rounded-xl border border-default-200 bg-background p-8 shadow-lg flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold text-thingsboard-primary">
          {translate("home.welcome")}
        </h1>
        <p className="text-sm text-default-500">
          {translate("home.subtitle")}
        </p>

        <LanguageSwitcher />

        {/* ปุ่ม HeroUI — ยืนยันว่า HeroUI render ด้วยสี brand ของ ThingsBoard */}
        {/* HeroUI v3 ใช้ class "button" และ variant "primary" → ดึงสีจาก --accent
            ที่เรา map เป็น --thingsboard-primary-color (#305680) ใน globals.css */}
        <button
          type="button"
          className="button button--primary mt-2"
        >
          {translate("parity.smokeTest")}
        </button>
      </div>
    </main>
  );
}
