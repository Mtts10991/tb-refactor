/**
 * @fileoverview
 * การตั้งค่า Next.js 16 ของ ThingsBoard UI — รวม dev proxy ที่ parity กับ
 * ui-ngx/proxy.conf.js เพื่อส่งคำขอไปยัง ThingsBoard backend ที่ localhost:8080.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/proxy.conf.js
 *
 * @reason
 * Next.js ใช้ rewrites() แทน http-proxy middleware ของ Angular CLI —
 * แต่ผลลัพธ์ต้องเหมือนกัน: ทุกคำขอไป /api/*, /oauth2/*, /api/ws ต้องไปถึง backend.
 *
 * หมายเหตุเรื่อง WebSocket:
 *   Next.js rewrites รองรับ WebSocket ผ่านกลไกเดียวกับ HTTP เมื่อ client เปิด WS connection
 *   ดังนั้น /api/ws/* จะถูก forward ไปยัง ws://localhost:8080 อัตโนมัติ.
 */

import type { NextConfig } from "next";

/**
 * URL ของ ThingsBoard backend — ใน development คือ localhost:8080
 * ใน production ใช้ reverse proxy ฝั่ง server (served จาก backend เดียวกัน)
 *
 * ค่านี้อ่านได้จาก environment variable THINGSBOARD_BACKEND_URL
 * เพื่อรองรับกรณีที่ backend รันที่ port อื่น (เช่น เวลาทดสอบ)
 */
const thingsBoardBackendUrl =
  process.env.THINGSBOARD_BACKEND_URL ?? "http://localhost:8080";

/**
 * Next.js configuration object.
 * rewrites() ทำหน้าที่เทียบเท่า proxy.conf.js ของ Angular CLI.
 *
 * @returns NextConfig พร้อม rewrites สำหรับ API/WebSocket proxy
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      // REST API — parity กับ /api proxy ใน proxy.conf.js
      {
        source: "/api/:path*",
        destination: `${thingsBoardBackendUrl}/api/:path*`,
      },
      // OAuth2 endpoints — parity กับ /oauth2 และ /login/oauth2 ใน proxy.conf.js
      {
        source: "/oauth2/:path*",
        destination: `${thingsBoardBackendUrl}/oauth2/:path*`,
      },
      {
        source: "/login/oauth2/:path*",
        destination: `${thingsBoardBackendUrl}/login/oauth2/:path*`,
      },
      // Static resources สำหรับ rule node UI และ widgets ที่ backend serve
      // parity กับ /static/rulenode และ /static/widgets ใน proxy.conf.js
      {
        source: "/static/rulenode/:path*",
        destination: `${thingsBoardBackendUrl}/static/rulenode/:path*`,
      },
      {
        source: "/static/widgets/:path*",
        destination: `${thingsBoardBackendUrl}/static/widgets/:path*`,
      },
      // WebSocket endpoint — parity กับ /api/ws (ws:true) ใน proxy.conf.js
      // Next.js จะ upgrade เป็น WebSocket อัตโนมัติเมื่อ client เปิด WS connection
      {
        source: "/api/ws/:path*",
        destination: `${thingsBoardBackendUrl}/api/ws/:path*`,
      },
    ];
  },

  // อนุญาตให้ import ไฟล์จากภายนอก src/ ได้ (สำหรับ locale files ที่จะอยู่ใน public/locale/)
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
