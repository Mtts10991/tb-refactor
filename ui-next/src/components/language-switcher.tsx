/**
 * @fileoverview
 * Component สลับภาษา UI ของ ThingsBoard — parity กับ language selector
 * ใน user settings menu ของ Angular.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/modules/home/components/profile/ (language selector)
 *
 * @reason
 * ใน Phase 0 ใช้ HTML select อย่างง่าย — ใน Phase 3 จะย้ายไปที่ user menu จริง
 * และใช้ HeroUI dropdown component.
 * การสลับภาษาใช้ next-intl routing (/en → /th) ซึ่ง parity กับ translate.use(lang) ของ Angular.
 */

"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { SUPPORTED_LANGUAGES } from "@lib/supported-languages";

/**
 * Language switcher component ที่ให้ผู้ใช้สลับภาษา UI.
 *
 * @returns JSX element ของ dropdown สลับภาษา
 *
 * @example
 * ```tsx
 * <LanguageSwitcher />
 * ```
 */
export function LanguageSwitcher(): React.ReactElement {
  const currentLocale = useLocale();
  const translate = useTranslations();
  const router = useRouter();
  const currentPathname = usePathname();

  /**
   * ฟังก์ชันสลับภาษา — replace prefix ใน URL.
   *
   * @param event - change event จาก <select>
   */
  function handleLanguageChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ): void {
    const targetLocaleCode = event.target.value;

    // แทนที่ locale prefix ใน path ปัจจุบัน (/en/home → /th/home)
    const newPath = currentPathname.replace(
      `/${currentLocale}`,
      `/${targetLocaleCode}`,
    );
    router.push(newPath);
  }

  return (
    <label className="flex flex-col items-center gap-1 text-sm">
      <span className="text-default-500">{translate("language.switch")}</span>
      <select
        value={currentLocale}
        onChange={handleLanguageChange}
        className="border border-default-300 rounded-md px-3 py-1.5 bg-background"
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language.localeCode} value={language.localeCode}>
            {language.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
