# ThingsBoard UI (Next.js)

> Next.js 16 + HeroUI + TypeScript frontend สำหรับ ThingsBoard 4.3.1
> แปลงจาก Angular 20 (`../ui-ngx/`) แบบ clean break

## การพัฒนา

ต้องรัน ThingsBoard backend ที่ `http://localhost:8080` ก่อน

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000`

## Scripts

| Script | หน้าที่ |
|---|---|
| `npm run dev` | รัน dev server |
| `npm run build` | build production |
| `npm run lint` | ตรวจ ESLint |
| `npm run test:unit` | รัน unit test (Vitest) |
| `npm run test:parity` | รัน parity test (Playwright) |
| `npm run test:e2e` | รัน E2E test (Playwright) |

## โครงสร้าง

ดูได้ที่ `../docs/superpowers/specs/2026-07-12-nextjs-refactor-design.md`
