/**
 * @fileoverview
 * รายการภาษาที่ ThingsBoard UI รองรับ — parity กับ SUPPORTED_LANGS global
 * ที่ Angular สร้างผ่าน esbuild plugin ใน ui-ngx/esbuild/tb-esbuild-plugins.ts.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/esbuild/tb-esbuild-plugins.ts (ฟังก์ชัน defineTbVariablesPlugin
 * ที่สแกนไฟล์ใน assets/locale/ แล้ว inject เป็น global)
 *
 * @reason
 * ใน Phase 0 ยังไม่มี auto-discovery เหมือน Angular — เก็บเป็นค่าคงที่ไปก่อน.
 * ใน Phase 1.9 จะเปลี่ยนเป็น dynamic import + filesystem scan ใน build time
 * เพื่อ parity กับ Angular's auto-discovery.
 */

/**
 * ข้อมูลของภาษาที่รองรับ.
 */
export interface SupportedLanguage {
  /** รหัสภาษา BCP 47 (เช่น "en", "th") — ใช้กับ next-intl */
  readonly localeCode: string;

  /** รหัสภาษาแบบ Angular legacy (เช่น "en_US", "th_TH") — parity กับ locale.constant-{code}.json */
  readonly angularLegacyCode: string;

  /** ชื่อภาษาในภาษานั้นเอง (เช่น "English", "ไทย") — แสดงใน language switcher */
  readonly nativeName: string;
}

/**
 * รายการภาษาที่ ThingsBoard UI รองรับใน Phase 0.
 * ใน Phase 1.9 จะขยายเป็น 27 ภาษา parity กับ Angular.
 */
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  {
    localeCode: "en",
    angularLegacyCode: "en_US",
    nativeName: "English",
  },
  {
    localeCode: "th",
    angularLegacyCode: "th_TH",
    nativeName: "ไทย",
  },
] as const;

/**
 * locale เริ่มต้น — parity กับ en_US ของ Angular.
 */
export const DEFAULT_LOCALE_CODE = "en" as const;
