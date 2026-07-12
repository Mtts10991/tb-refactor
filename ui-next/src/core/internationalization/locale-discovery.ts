/**
 * @fileoverview
 * Auto-discovery ของ locale files ใน public/locale/ — parity กับ esbuild plugin
 * ของ Angular ที่สแกนไฟล์แล้ว inject SUPPORTED_LANGS global
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/esbuild/tb-esbuild-plugins.ts (defineTbVariablesPlugin)
 */

import fs from "node:fs";
import path from "node:path";

/** ข้อมูล locale ที่ค้นพบ */
export interface DiscoveredLocale {
  readonly code: string;
  readonly fileName: string;
}

/**
 * สแกน directory public/locale/ เพื่อหา locale JSON files
 * @param localeDirectory path ไปยัง locale directory (default: public/locale)
 * @returns รายการ locale ที่ค้นพบ
 */
export function discoverLocales(localeDirectory = "public/locale"): DiscoveredLocale[] {
  try {
    const files = fs.readdirSync(localeDirectory);
    return files
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const code = path.basename(file, ".json");
        return { code, fileName: file };
      });
  } catch {
    return [{ code: "en", fileName: "en.json" }];
  }
}
