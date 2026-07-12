/**
 * @fileoverview
 * การตั้งค่า PostCSS ของ ThingsBoard UI — ลงทะเบียน Tailwind CSS v4 plugin
 * เพื่อประมวลผล CSS directives (@tailwind, @apply) ในไฟล์ globals.css.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/postcss.config.js (Angular ใช้ Tailwind v3, เราใช้ v4)
 *
 * @reason
 * Tailwind CSS v4 เปลี่ยนจาก JavaScript config (`tailwind.config.js`) เป็น
 * CSS-first config ที่ใช้ `@tailwindcss/postcss` plugin เพียงตัวเดียว —
 * การตั้งค่าทั้งหมด (theme, tokens) ทำในไฟล์ CSS ผ่าน `@theme` directive.
 */

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
