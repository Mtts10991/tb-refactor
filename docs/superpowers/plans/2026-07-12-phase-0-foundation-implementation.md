# Phase 0 — Foundation & Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างรากฐาน Next.js 16 + HeroUI + TypeScript ที่รันได้ เชื่อม backend ได้ มี parity test infrastructure พร้อม และมี ESLint rule บังคับ JSDoc ภาษาไทย — เป็นพื้นฐานที่ Phase 1 ถึง Phase 7 ต้องพึ่งพาทั้งหมด

**Architecture:** Next.js 16 App Router + HeroUI v3 + Tailwind + TypeScript strict + Vitest (unit) + Playwright (parity) + next-intl (i18n) + custom ESLint rule สำหรับบังคับ JSDoc ภาษาไทย ทุกไฟล์. ทุก brand color ของ ThingsBoard แปลงจาก SCSS variables เป็น CSS custom properties เพื่อ parity และ runtime theme switching.

**Tech Stack:**
- Next.js 16 (App Router, React 19.2)
- HeroUI v3.2.2
- Tailwind CSS v3.4
- TypeScript 5.9 (strict mode)
- Vitest (unit testing)
- Playwright (E2E + parity testing)
- next-intl (internationalization)
- ESLint 9 (flat config) + custom rule

**Reference Spec:** [`docs/superpowers/specs/2026-07-12-nextjs-refactor-design.md`](../specs/2026-07-12-nextjs-refactor-design.md)
**Reference Phase:** Phase 0 ใน [`docs/superpowers/specs/2026-07-12-nextjs-refactor-phases.md`](../specs/2026-07-12-nextjs-refactor-phases.md)

**Naming Convention Reminder:**
- ตั้งชื่อไฟล์/folder/variable/function เต็มรูปแบบ ห้ามย่อ
- ✅ `parityTestRunner`, `webSocketConstants`, `brand-tokens.css`
- ❌ `parityRun`, `wsConst`, `tokens.css`
- Acronyms มาตรฐานที่อนุญาต: `HTTP`, `WS`, `API`, `URL`, `UI`, `i18n`, `JWT`, `CSS`, `ID`

**Comment Rule Reminder:**
- ทุกไฟล์ `.ts/.tsx/.js/.cjs/.mjs` ต้องมี file-level JSDoc ภาษาไทย
- ทุก exported symbol ต้องมี JSDoc
- inline comment ภาษาไทยที่ logic ซับซ้อน

---

## File Structure (ทั้งหมดที่ Phase 0 สร้าง)

```
ui-next/                                      # Next.js project root
├── package.json                              # dependencies + scripts
├── next.config.ts                            # Next.js config + dev proxy (parity ui-ngx/proxy.conf.js)
├── tsconfig.json                             # TypeScript strict + path aliases
├── tailwind.config.ts                        # HeroUI preset + brand tokens
├── postcss.config.mjs                        # Tailwind + autoprefixer
├── next-intl.config.ts                       # next-intl plugin config
├── vitest.config.ts                          # Vitest setup
├── playwright.config.ts                      # Playwright setup
├── eslint.config.mjs                         # ESLint flat config
├── .eslintrc.require-jsdoc.cjs               # custom rule loader (legacy bridge)
├── .gitignore
├── .editorconfig
├── README.md
├── eslint-rules/                             # custom ESLint rules
│   ├── require-thai-jsdoc.js                 # บังคับ file-level + symbol-level JSDoc ภาษาไทย
│   └── require-thai-jsdoc.test.js            # unit test ของ rule (Vitest)
├── i18n/                                     # next-intl routing/config
│   ├── routing.ts                            # locale routing config
│   └── request.ts                            # request-scoped i18n loader
├── public/
│   ├── locale/                               # i18n JSON
│   │   ├── en.json                           # English starter (subset, สำหรับ Phase 0)
│   │   └── th.json                           # Thai starter (subset, สำหรับ Phase 0)
│   └── images/
│       └── thingsboard-logo.svg              # TB logo placeholder
├── src/
│   ├── app/                                  # App Router
│   │   ├── [locale]/                         # locale-prefixed routes
│   │   │   ├── layout.tsx                    # root layout: HeroUI provider + i18n
│   │   │   └── page.tsx                      # home page placeholder
│   │   └── globals.css                       # global CSS (Tailwind + brand tokens)
│   ├── styles/
│   │   ├── brand-tokens.css                  # TB brand colors เป็น CSS variables (parity constants.scss)
│   │   └── heroui-theme.ts                   # HeroUI theme mapping (brand → HeroUI slots)
│   ├── components/
│   │   └── language-switcher.tsx             # component สลับภาษา (parity กับ settings menu)
│   └── lib/
│       └── supported-languages.ts            # auto-discovery list ของ locale files
└── tests/
    ├── parity/                               # parity test infrastructure
    │   ├── parity-test-runner.ts             # runner ที่ execute parity test specs
    │   ├── parity-comparator.ts              # เปรียบเทียบ captured fixture vs actual
    │   ├── fixtures/                          # captured traffic (empty ตอนนี้ — เติมใน Phase 1)
    │   │   └── .gitkeep
    │   └── parity-smoke.spec.ts              # smoke test: ยืนยันว่า infra ทำงานได้
    └── unit/                                 # unit test mirror (Vitest จะ auto-discover *.test.ts)
```

---

## Task 1: ติดตั้ง Next.js 16 scaffold + dependencies หลัก

**Files:**
- Create: `ui-next/package.json` (via create-next-app, แล้วแก้)
- Create: `ui-next/tsconfig.json`
- Create: `ui-next/next.config.ts`
- Create: `ui-next/src/app/[locale]/layout.tsx`
- Create: `ui-next/src/app/[locale]/page.tsx`
- Create: `ui-next/src/app/globals.css`
- Create: `ui-next/.gitignore`
- Create: `ui-next/.editorconfig`
- Create: `ui-next/README.md`

- [ ] **Step 1: ตรวจสอบ working directory**

Run:
```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor" && ls -la
```
Expected: แสดงรายการรวม `ui-ngx/`, `docs/` และไม่มี `ui-next/` อยู่ก่อน

- [ ] **Step 2: สร้าง Next.js 16 project ผ่าน create-next-app**

Run:
```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor" && npx create-next-app@latest ui-next --typescript --app --tailwind --eslint --src-dir --import-alias "@/*" --no-turbopack --use-npm --skip-install
```
Expected: สร้าง directory `ui-next/` พร้อม scaffold Next.js ใหม่ ไม่ติดตั้ง dependencies (จะทำใน step ถัดไป)

หมายเหตุ: ใช้ `--no-turbopack` ตอนสร้างเพื่อ stability แต่จะเปิดใช้ตอน dev ในภายหลัง

- [ ] **Step 3: เขียน `package.json` ทับด้วย dependencies ที่ต้องการจริง**

เขียนไฟล์ `ui-next/package.json` ให้เป็นดังนี้ (อ่านก่อนแล้วเขียนทับ):

```json
{
  "name": "thingsboard-ui-next",
  "version": "0.1.0",
  "private": true,
  "description": "ThingsBoard frontend ที่ refactor จาก Angular 20 เป็น Next.js 16 + HeroUI",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:parity": "playwright test --config=playwright.config.ts --project=parity",
    "test:e2e": "playwright test --config=playwright.config.ts --project=e2e",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\" \"tests/**/*.{ts,tsx}\""
  },
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@heroui/react": "^3.2.2",
    "framer-motion": "^11.0.0",
    "next-intl": "^3.20.0",
    "rxjs": "^7.8.2",
    "@react-rxjs/core": "^0.10.0",
    "tailwindcss": "^3.4.19"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/node": "^22.18.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "eslint": "^9.9.0",
    "eslint-config-next": "^16.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "prettier": "^3.3.0",
    "vitest": "^2.0.0",
    "@vitest/ui": "^2.0.0",
    "@playwright/test": "^1.47.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0"
  },
  "engines": {
    "node": ">=22.15.0"
  }
}
```

- [ ] **Step 4: ติดตั้ง dependencies**

Run:
```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next" && npm install
```
Expected: install สำเร็จไม่มี error (warning เรื่อง peer deps ของ HeroUI ได้)

- [ ] **Step 5: เขียน `tsconfig.json` พร้อม strict mode + path aliases**

เขียนไฟล์ `ui-next/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@app/*":          ["./src/app/*"],
      "@core/*":         ["./src/core/*"],
      "@shared/*":       ["./src/shared/*"],
      "@widgets/*":      ["./src/widgets/*"],
      "@features/*":     ["./src/feature-components/*"],
      "@styles/*":       ["./src/styles/*"],
      "@components/*":   ["./src/components/*"],
      "@lib/*":          ["./src/lib/*"],
      "@public-locale":  ["./public/locale"],
      "@tests/*":        ["./tests/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

หมายเหตุ: `noUncheckedIndexedAccess: true` และ `noImplicitOverride: true` เป็น strict เกินค่า default เพื่อบังคับ type safety สูงสุด

- [ ] **Step 6: เขียน `.editorconfig`**

เขียนไฟล์ `ui-next/.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 7: เขียน `.gitignore`**

เขียนไฟล์ `ui-next/.gitignore`:

```gitignore
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage
/playwright-report
/test-results

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# IDE
.idea/
.vscode/
*.swp
```

- [ ] **Step 8: เขียน `README.md` สำหรับ `ui-next/`**

เขียนไฟล์ `ui-next/README.md`:

```markdown
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
```

- [ ] **Step 9: Commit**

```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next"
git init 2>/dev/null || true
git add ui-next/
git commit -m "feat(ui-next): สร้าง Next.js 16 scaffold พร้อม dependencies หลัก (Phase 0 Task 1)"
```

หมายเหตุ: ถ้า root project ยังไม่ใช่ git repo ให้ `git init` ที่ root ก่อน (`cd .. && git init`)

---

## Task 2: ตั้งค่า HeroUI v3 + Tailwind + brand tokens

**Files:**
- Create: `ui-next/postcss.config.mjs`
- Create: `ui-next/tailwind.config.ts`
- Create: `ui-next/src/styles/brand-tokens.css`
- Create: `ui-next/src/styles/heroui-theme.ts`
- Modify: `ui-next/src/app/globals.css`

**ParityEngine:** `ui-ngx/src/scss/constants.scss` (ค่า brand color), `ui-ngx/src/theme.scss`

**ค่า brand ที่ต้อง parity** (จาก `constants.scss`):
- `$tb-primary-color: #305680`
- `$tb-secondary-color: #527dad`
- `$tb-hue3-color: #a7c1de`
- `$tb-dark-primary-color: #9fa8da`
- `$tb-primary-color-light: #7986cb`

- [ ] **Step 1: เขียน `postcss.config.mjs`**

เขียนไฟล์ `ui-next/postcss.config.mjs`:

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

- [ ] **Step 2: เขียน `brand-tokens.css` — แปลง SCSS variables เป็น CSS custom properties**

เขียนไฟล์ `ui-next/src/styles/brand-tokens.css`:

```css
/**
 * @fileoverview
 * ไฟล์นี้ประกาศค่าสีหลัก (brand tokens) ของ ThingsBoard ในรูปแบบ CSS custom properties
 * เพื่อใช้ทั้งใน Tailwind และใน components โดยตรง.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/scss/constants.scss (บรรทัด $tb-primary-color ถึง $tb-primary-color-light)
 * การเปลี่ยนแปลงหลัก:
 *   - แปลงจาก SCSS compile-time variables ($variable) เป็น runtime CSS variables (--variable)
 *   - ทำให้สามารถสลับ theme (light/dark) แบบ runtime ได้ โดย override ที่ :root หรือ [data-theme="dark"]
 *   - ค่าสีทุกค่า parity กับ Angular เดิม byte-for-byte
 *
 * @reason
 * ใช้ CSS variables แทน SCSS variables เพราะ:
 *   1. HeroUI และ Tailwind อ่านค่าจาก CSS variables ได้โดยตรง
 *   2. รองรับ dynamic theme switching โดยไม่ต้อง recompile
 *   3. ลดความซับซ้อนของ build pipeline (ไม่ต้องใช้ SCSS preprocessor)
 */

:root {
  /* สีหลักของแบรนด์ ThingsBoard — ใช้ในปุ่ม ลิงก์ และ active state */
  --thingsboard-primary-color: #305680;

  /* สีรอง — ใช้ใน hover state และ accent */
  --thingsboard-secondary-color: #527dad;

  /* สี hue 3 — ใช้ใน gradient และ background ที่ต้องการความนุ่มนวล */
  --thingsboard-hue-three-color: #a7c1de;

  /* สีหลักใน dark mode — indigo อ่อน */
  --thingsboard-dark-primary-color: #9fa8da;

  /* สีหลักแบบ light — ใช้ในส่วนที่ต้องการความโดดเด่น */
  --thingsboard-primary-color-light: #7986cb;
}

/* Dark theme overrides — parity กับ .tb-dark class ใน Angular */
[data-theme="dark"] {
  --thingsboard-primary-color: #9fa8da;
  --thingsboard-secondary-color: #7986cb;
}
```

- [ ] **Step 3: เขียน `heroui-theme.ts` — mapping brand tokens เข้า HeroUI**

เขียนไฟล์ `ui-next/src/styles/heroui-theme.ts`:

```typescript
/**
 * @fileoverview
 * ไฟล์นี้นิยาม theme ของ HeroUI v3 โดยใช้ค่าสีหลักของ ThingsBoard
 * (parity กับ Angular Material theme ใน ui-ngx/src/theme.scss).
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/theme.scss (mat.m2-define-palette สำหรับ $tb-primary, $tb-accent)
 *
 * @reason
 * HeroUI v3 ใช้ Tailwind slots เป็น theme system — เราต้อง map สี ThingsBoard
 * ลงใน HeroUI color slots (focus, foreground, background, etc.) เพื่อให้
 * ทุก HeroUI component แสดงผลสีของ ThingsBoard โดยอัตโนมัติ
 */

import { heroui } from "@heroui/react";

/**
 * สร้าง HeroUI theme ที่ใช้สีหลักของ ThingsBoard.
 *
 * @returns HeroUI theme configuration object ที่ส่งเข้า <HeroUIProvider>
 *
 * @example
 * ```tsx
 * <HeroUIProvider theme={thingsBoardHeroUiTheme}>
 *   <App />
 * </HeroUIProvider>
 * ```
 */
export const thingsBoardHeroUiTheme = heroui({
  themes: {
    light: {
      colors: {
        // HeroUI "primary" slot = สีหลักของ ThingsBoard (#305680)
        primary: {
          DEFAULT: "#305680",
          foreground: "#ffffff",
        },
        // HeroUI "secondary" slot = สีรองของ ThingsBoard (#527dad)
        secondary: {
          DEFAULT: "#527dad",
          foreground: "#ffffff",
        },
        // HeroUI "focus" slot = สี hue 3 ของ ThingsBoard (#a7c1de)
        focus: {
          DEFAULT: "#a7c1de",
          foreground: "#305680",
        },
      },
    },
    dark: {
      colors: {
        // ใน dark mode สีหลักเปลี่ยนเป็น indigo อ่อน (parity กับ .tb-dark)
        primary: {
          DEFAULT: "#9fa8da",
          foreground: "#1a1a1a",
        },
        secondary: {
          DEFAULT: "#7986cb",
          foreground: "#1a1a1a",
        },
        focus: {
          DEFAULT: "#9fa8da",
          foreground: "#1a1a1a",
        },
      },
    },
  },
});
```

- [ ] **Step 4: เขียน `tailwind.config.ts`**

เขียนไฟล์ `ui-next/tailwind.config.ts`:

```typescript
/**
 * @fileoverview
 * การตั้งค่า Tailwind CSS สำหรับ ThingsBoard UI — รวม HeroUI v3 preset
 * และการ map brand tokens ของ ThingsBoard เข้ากับ Tailwind color palette.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/tailwind.config.js (Tailwind 3.4 ที่ใช้ใน Angular เดิม)
 *
 * @reason
 * ตั้งค่า HeroUI เป็น preset เพื่อให้ทุก HeroUI component ใช้ classes ของ Tailwind ได้
 * และกำหนด content paths ให้ครอบคลุมไฟล์ components ทั้งหมด
 */

import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

const tailwindConfig: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // map brand tokens ของ ThingsBoard เข้า Tailwind
        // ใช้ได้เช่น class="text-thingsboard-primary" หรือ "bg-thingsboard-secondary"
        "thingsboard-primary": "var(--thingsboard-primary-color)",
        "thingsboard-secondary": "var(--thingsboard-secondary-color)",
        "thingsboard-hue-three": "var(--thingsboard-hue-three-color)",
        "thingsboard-dark-primary": "var(--thingsboard-dark-primary-color)",
        "thingsboard-primary-light": "var(--thingsboard-primary-color-light)",
      },
    },
  },
  darkMode: ["class", "[data-theme='dark']"],
  plugins: [
    // โหลด HeroUI plugin เพื่อให้ components ใช้ Tailwind classes ของ HeroUI ได้
    heroui(),
  ],
};

export default tailwindConfig;
```

- [ ] **Step 5: เขียน `globals.css`**

เขียนไฟล์ `ui-next/src/app/globals.css`:

```css
/**
 * @fileoverview
 * Global CSS — Tailwind directives + brand tokens ของ ThingsBoard.
 * ไฟล์นี้ถูก import ใน root layout.tsx และมีผลทั้งแอป.
 */

/* import brand tokens ก่อน Tailwind เพื่อให้ Tailwind utilities อ่านค่าได้ */
@import "../styles/brand-tokens.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ค่า default ของ body — parity กับ Angular Material typography token */
html,
body {
  max-width: 100vw;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
}
```

- [ ] **Step 6: Commit**

```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next"
git add src/styles/brand-tokens.css src/styles/heroui-theme.ts tailwind.config.ts postcss.config.mjs src/app/globals.css
git commit -m "feat(ui-next): ตั้งค่า HeroUI v3 + Tailwind + brand tokens (Phase 0 Task 2)"
```

---

## Task 3: ตั้งค่า dev proxy + `next.config.ts` (parity `proxy.conf.js`)

**Files:**
- Create: `ui-next/next.config.ts`
- Create: `ui-next/src/middleware.ts` (placeholder, จะใช้ใน Phase 3)

**ParityEngine:** `ui-ngx/proxy.conf.js`

- [ ] **Step 1: เขียน `next.config.ts`**

เขียนไฟล์ `ui-next/next.config.ts`:

```typescript
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
 *   Next.js rewrites รองรับ WebSocket ตั้งแต่เวอร์ชัน 12+ ผ่านกลไกเดียวกับ HTTP
 *   ดังนั้น /api/ws/* จะถูก forward ไปยัง ws://localhost:8080 อัตโนมัติเมื่อ client เปิด WS connection.
 */

import type { NextConfig } from "next";

/**
 * URL ของ ThingsBoard backend — ใน development คือ localhost:8080
 * ใน production ใช้ reverse proxy ฝั่ง server (served จาก backend เดียวกัน)
 */
const thingsBoardBackendUrl = process.env.THINGSBOARD_BACKEND_URL ?? "http://localhost:8080";

/**
 * Next.js configuration object.
 * rewrites() ทำหน้าที่เทียบเท่า proxy.conf.js ของ Angular.
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
      // OAuth2 endpoints — parity กับ /oauth2 และ /login/oauth2
      {
        source: "/oauth2/:path*",
        destination: `${thingsBoardBackendUrl}/oauth2/:path*`,
      },
      {
        source: "/login/oauth2/:path*",
        destination: `${thingsBoardBackendUrl}/login/oauth2/:path*`,
      },
      // Static resources สำหรับ rule node UI และ widgets
      {
        source: "/static/rulenode/:path*",
        destination: `${thingsBoardBackendUrl}/static/rulenode/:path*`,
      },
      {
        source: "/static/widgets/:path*",
        destination: `${thingsBoardBackendUrl}/static/widgets/:path*`,
      },
      // WebSocket endpoint — parity กับ /api/ws (ws:true)
      // Next.js จะ upgrade เป็น WebSocket อัตโนมัติเมื่อ client เปิด WS connection
      {
        source: "/api/ws/:path*",
        destination: `${thingsBoardBackendUrl}/api/ws/:path*`,
      },
    ];
  },

  // ตั้งค่าให้ Next.js อนุญาตให้ import ไฟล์จากภายนอก src/ ได้ (สำหรับ locale files)
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
```

- [ ] **Step 2: ทดสอบว่า dev server รันได้**

Run:
```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next" && timeout 30 npm run dev 2>&1 | head -40
```
Expected: แสดง "▲ Next.js 16" และ "Ready in XXXX ms" หรือ error ว่าขาด `src/app/page.tsx` (ถ้ายังไม่ได้สร้าง — จะสร้างใน Task 5)

- [ ] **Step 3: Commit**

```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next"
git add next.config.ts
git commit -m "feat(ui-next): ตั้งค่า dev proxy ไปยัง backend ที่ localhost:8080 (Phase 0 Task 3)"
```

---

## Task 4: ตั้งค่า i18n + locale ไทย starter

**Files:**
- Create: `ui-next/next-intl.config.ts`
- Create: `ui-next/i18n/routing.ts`
- Create: `ui-next/i18n/request.ts`
- Create: `ui-next/src/lib/supported-languages.ts`
- Create: `ui-next/public/locale/en.json`
- Create: `ui-next/public/locale/th.json`

**ParityEngine:** `ui-ngx/src/assets/locale/locale.constant-en_US.json`, `ui-ngx/esbuild/tb-esbuild-plugins.ts` (auto-discovery logic)

- [ ] **Step 1: เขียน `next-intl.config.ts`**

เขียนไฟล์ `ui-next/next-intl.config.ts`:

```typescript
/**
 * @fileoverview
 * การตั้งค่า next-intl plugin สำหรับ Next.js 16 — ทำหน้าที่ parity กับ
 * @ngx-translate/core ของ Angular เดิม.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/translate/translate-default-loader.ts
 *   (โหลด /assets/locale/locale.constant-{lang}.json)
 *
 * @reason
 * next-intl ผสานกับ Next.js App Router โดยตรง รองรับ server components
 * และ locale-prefixed routing (/en/..., /th/...).
 */

import type { NextIntlConfig } from "next-intl";

/**
 * ฟังก์ชันโหลดข้อความ locale — อ่านไฟล์ JSON จาก public/locale/{locale}.json
 * parity กับ TranslateDefaultLoader ใน Angular.
 *
 * @param locale - รหัสภาษา (เช่น "en", "th")
 * @returns object ของข้อความ locale สำหรับภาษาที่ระบุ
 */
async function loadLocaleMessages(locale: string): Promise<Record<string, string>> {
  // อ่านไฟล์ JSON จาก filesystem (server-side เท่านั้น — next-intl ทำงานใน server component)
  // ในอนาคต Phase 1.9 จะใช้ messageformat-compiler สำหรับ plural/ICU ด้วย
  try {
    const messagesModule = await import(`../public/locale/${locale}.json`);
    return messagesModule.default ?? messagesModule;
  } catch (error) {
    console.warn(`ไม่พบไฟล์ locale สำหรับภาษา "${locale}" — ใช้ fallback เป็น en`);
    const fallback = await import(`../public/locale/en.json`);
    return fallback.default ?? fallback;
  }
}

/**
 * next-intl configuration object.
 */
const nextIntlConfig: NextIntlConfig = {
  locales: ["en", "th"],
  defaultLocale: "en",
  loader: loadLocaleMessages,
};

export default nextIntlConfig;
```

- [ ] **Step 2: เขียน `routing.ts`**

เขียนไฟล์ `ui-next/i18n/routing.ts`:

```typescript
/**
 * @fileoverview
 * นิยาม routing configuration ของ next-intl — กำหนด locale prefixes และ pathnames.
 *
 * @reason
 * next-intl ใช้รูปแบบ locale-as-prefix (/en/home, /th/home) ซึ่ง parity กับ
 * วิธีที่ Angular ใช้ moment.locale() + translate.use(lang).
 */

import { defineRouting } from "next-intl/routing";

/**
 * next-intl routing configuration.
 */
export const internationalizationRouting = defineRouting({
  // รายการ locale ที่รองรับ — parity กับ SUPPORTED_LANGS ของ Angular
  locales: ["en", "th"],

  // locale เริ่มต้นเมื่อ user เข้ามาโดยไม่ระบุ
  defaultLocale: "en",

  // ใช้ locale เป็น prefix เสมอ (/en/..., /th/...) เพื่อ SEO และ bookmark parity
  localePrefix: "always",
});
```

- [ ] **Step 3: เขียน `request.ts`**

เขียนไฟล์ `ui-next/i18n/request.ts`:

```typescript
/**
 * @fileoverview
 * สร้าง request-scoped next-intl instance สำหรับแต่ละ HTTP request.
 * ทำหน้าที่ parity กับ TranslateService.forRoot() ใน Angular.
 *
 * @reason
 * ใน Next.js App Router ทุก request ต้องการ locale instance แยกกัน
 * เพื่อรองรับ concurrent rendering ที่ถูกต้อง.
 */

import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { internationalizationRouting } from "./routing";

/**
 * next-intl request configuration.
 * อ่าน locale จาก URL cookie หรือ header แล้วโหลดข้อความที่เกี่ยวข้อง.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // รอให้ locale ถูกกำหนดโดย middleware (จะสร้างใน Phase 3)
  const requestedLocale = await requestLocale;
  const locale = hasLocale(internationalizationRouting.locales, requestedLocale)
    ? requestedLocale
    : internationalizationRouting.defaultLocale;

  return {
    locale,
    messages: (await import(`../public/locale/${locale}.json`)).default,
  };
});
```

- [ ] **Step 4: เขียน `supported-languages.ts` — auto-discovery list**

เขียนไฟล์ `ui-next/src/lib/supported-languages.ts`:

```typescript
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
 * ใน Phase 0 ยังไม่มี auto-discovery เหมือน Angular — เก็บเป็นค่าคงที่ไปก่อน
 * ใน Phase 1.9 จะเปลี่ยนเป็น dynamic import + filesystem scan ใน build time
 */

/**
 * รายการภาษาที่รองรับในรูปแบบ BCP 47 ที่ ThingsBoard ใช้
 * (Angular ใช้รูปแบบ xx_XX เช่น en_US, th_TH แต่ next-intl ใช้ xx-XX หรือ xx)
 */
export interface SupportedLanguage {
  /** รหัสภาษา BCP 47 (เช่น "en", "th") */
  readonly localeCode: string;

  /** รหัสภาษาแบบ Angular legacy (เช่น "en_US", "th_TH") — parity กับ locale.constant-{code}.json */
  readonly angularLegacyCode: string;

  /** ชื่อภาษาในภาษานั้นเอง (เช่น "English", "ไทย") */
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
```

- [ ] **Step 5: เขียน `en.json` — starter messages (Phase 0 ใช้แค่ไม่กี่ keys)**

เขียนไฟล์ `ui-next/public/locale/en.json`:

```json
{
  "app.title": "ThingsBoard",
  "common.loading": "Loading...",
  "common.error": "Error",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.confirm": "Confirm",
  "home.welcome": "Welcome to ThingsBoard",
  "home.subtitle": "Open-source IoT Platform",
  "language.switch": "Switch language",
  "language.english": "English",
  "language.thai": "ไทย",
  "parity.smokeTest": "Parity test infrastructure is ready"
}
```

- [ ] **Step 6: เขียน `th.json` — แปลภาษาไทย starter**

เขียนไฟล์ `ui-next/public/locale/th.json`:

```json
{
  "app.title": "ThingsBoard",
  "common.loading": "กำลังโหลด...",
  "common.error": "เกิดข้อผิดพลาด",
  "common.save": "บันทึก",
  "common.cancel": "ยกเลิก",
  "common.delete": "ลบ",
  "common.confirm": "ยืนยัน",
  "home.welcome": "ยินดีต้อนรับสู่ ThingsBoard",
  "home.subtitle": "แพลตฟอร์ม IoT โอเพนซอร์ส",
  "language.switch": "สลับภาษา",
  "language.english": "English",
  "language.thai": "ไทย",
  "parity.smokeTest": "โครงสร้างทดสอบ parity พร้อมใช้งาน"
}
```

หมายเหตุ: Phase 0 แปลเฉพาะ keys ที่ใช้. Phase 1.9 จะ copy `locale.constant-en_US.json` (10,000+ keys) มาแปลทีละส่วน.

- [ ] **Step 7: Commit**

```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next"
git add next-intl.config.ts i18n/ src/lib/supported-languages.ts public/locale/
git commit -m "feat(ui-next): ตั้งค่า next-intl + starter locale ไทย (Phase 0 Task 4)"
```

---

## Task 5: สร้าง root layout + home page placeholder

**Files:**
- Create: `ui-next/src/app/[locale]/layout.tsx`
- Create: `ui-next/src/app/[locale]/page.tsx`
- Create: `ui-next/src/components/language-switcher.tsx`

- [ ] **Step 1: เขียน root layout**

เขียนไฟล์ `ui-next/src/app/[locale]/layout.tsx`:

```typescript
/**
 * @fileoverview
 * Root layout ของ ThingsBoard UI — ตั้งค่า providers ที่จำเป็นทั้งแอป:
 *   1. HeroUIProvider (สำหรับ HeroUI components)
 *   2. NextIntlClientProvider (สำหรับ i18n)
 *   3. Theme (light/dark) — parity กับ .tb-default / .tb-dark ของ Angular
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/index.html + ui-ngx/src/app/app.module.ts (providers section)
 *
 * @reason
 * Next.js App Router ใช้ layout.tsx เป็น wrapper ทั้งแอป — ทุก page component
 * จะถูก render ภายใน layout นี้.
 */

import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { HeroUIProvider } from "@heroui/react";
import { getMessages } from "next-intl/server";
import { thingsBoardHeroUiTheme } from "@styles/heroui-theme";
import "../globals.css";

/**
 * สร้าง metadata ของหน้า — parity กับ <title> ใน index.html ของ Angular.
 */
export const metadata: Metadata = {
  title: "ThingsBoard",
  description: "Open-source IoT Platform — Device management, data collection, processing, and visualization.",
};

/**
 * Props สำหรับ RootLayout.
 */
interface RootLayoutProperties {
  /** children components ที่จะ render ใน layout */
  readonly children: React.ReactNode;

  /** locale ที่ได้จาก URL params */
  readonly params: Promise<{ readonly locale: string }>;
}

/**
 * Root layout component.
 *
 * @param properties - ดู RootLayoutProperties
 * @returns JSX element ที่ wrap ทั้งแอปด้วย providers
 *
 * @reason
 * ตั้งค่า providers ก่อน children เพื่อให้ทุก component ใช้ HeroUI และ i18n ได้
 */
export default async function RootLayout(properties: RootLayoutProperties): Promise<React.ReactElement> {
  const { locale } = await properties.params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <HeroUIProvider theme={thingsBoardHeroUiTheme}>
            {properties.children}
          </HeroUIProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: เขียน home page placeholder**

เขียนไฟล์ `ui-next/src/app/[locale]/page.tsx`:

```typescript
/**
 * @fileoverview
 * หน้า home placeholder ของ ThingsBoard UI — แสดงข้อความต้อนรับและ language switcher.
 * จะถูกแทนที่ด้วย home shell จริงใน Phase 3.2.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/modules/home/pages/home-links/ (home links page)
 *
 * @reason
 * Phase 0 ยังไม่มี auth และ feature pages — ใช้ placeholder เพื่อยืนยันว่า
 * i18n และ HeroUI ทำงานร่วมกันได้.
 */

import { useTranslations } from "next-intl";
import { Card, CardBody, CardHeader, Button } from "@heroui/react";
import { LanguageSwitcher } from "@components/language-switcher";

/**
 * Home page component (placeholder).
 *
 * @returns JSX element ของหน้า home
 */
export default function HomePage(): React.ReactElement {
  const translate = useTranslations();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-thingsboard-primary to-thingsboard-secondary">
      <Card className="max-w-md w-full">
        <CardHeader className="flex flex-col items-center gap-2 pb-0">
          <h1 className="text-2xl font-bold text-thingsboard-primary">
            {translate("home.welcome")}
          </h1>
          <p className="text-sm text-default-500">{translate("home.subtitle")}</p>
        </CardHeader>
        <CardBody className="flex flex-col items-center gap-4">
          <LanguageSwitcher />
          <Button color="primary" variant="shadow">
            {translate("parity.smokeTest")}
          </Button>
        </CardBody>
      </Card>
    </main>
  );
}
```

- [ ] **Step 3: เขียน `language-switcher.tsx`**

เขียนไฟล์ `ui-next/src/components/language-switcher.tsx`:

```typescript
/**
 * @fileoverview
 * Component สลับภาษา UI ของ ThingsBoard — parity กับ language selector
 * ใน user settings menu ของ Angular.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/modules/home/components/profile/ (language selector)
 *
 * @reason
 * ใน Phase 0 ใช้ dropdown อย่างง่าย — ใน Phase 3 จะย้ายไปที่ user menu จริง.
 * การสลับภาษาใช้ next-intl routing (/en → /th) ซึ่ง parity กับ translate.use(lang) ของ Angular.
 */

"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";
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
   * @param targetLocaleCode - รหัสภาษาที่ต้องการสลับไป (เช่น "th")
   */
  function handleLanguageChange(targetLocaleCode: string): void {
    // แทนที่ locale prefix ใน path ปัจจุบัน (/en/home → /th/home)
    const newPath = currentPathname.replace(`/${currentLocale}`, `/${targetLocaleCode}`);
    router.push(newPath);
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="bordered" color="primary">
          {translate("language.switch")}: {currentLocale.toUpperCase()}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={translate("language.switch")}
        selectionMode="single"
        selectedKeys={[currentLocale]}
        onAction={(key) => handleLanguageChange(String(key))}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <DropdownItem key={language.localeCode}>{language.nativeName}</DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
```

- [ ] **Step 4: ทดสอบรัน dev server และเปิดดู**

Run:
```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next" && timeout 60 npm run dev &
sleep 15
curl -s http://localhost:3000/en | head -50
```
Expected: ได้ HTML response ที่มี "Welcome to ThingsBoard" หรือ "ยินดีต้อนรับสู่ ThingsBoard"

- [ ] **Step 5: Commit**

```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next"
git add src/app/ src/components/
git commit -m "feat(ui-next): สร้าง root layout + home page placeholder + language switcher (Phase 0 Task 5)"
```

---

## Task 6: ตั้งค่า ESLint flat config + custom rule บังคับ JSDoc ภาษาไทย

**Files:**
- Create: `ui-next/eslint.config.mjs`
- Create: `ui-next/eslint-rules/require-thai-jsdoc.js`
- Create: `ui-next/eslint-rules/require-thai-jsdoc.test.js`
- Create: `ui-next/vitest.config.ts`

- [ ] **Step 1: เขียน custom ESLint rule**

เขียนไฟล์ `ui-next/eslint-rules/require-thai-jsdoc.js`:

```javascript
/**
 * @fileoverview
 * ESLint custom rule ที่บังคับให้ทุกไฟล์ .ts/.tsx/.js ต้องมี file-level JSDoc
 * ที่เป็นภาษาไทย (มีอักขระ Unicode range ของภาษาไทยอย่างน้อย 1 ตัว).
 *
 * @reason
 * เพื่อให้เอกสารประกอบโค้ดเข้ากับ requirement ของโปรเจกต์ที่กำหนดให้ใช้
 * comment + JSDoc เป็นภาษาไทยครอบคลุมและเข้าใจง่ายในทุกไฟล์ที่ refactor.
 *
 * Rule ID: thingsboard/require-thai-jsdoc
 */

/**
 * ตรวจสอบว่าข้อความมีอักขระภาษาไทยอย่างน้อย 1 ตัวหรือไม่.
 * ช่วง Unicode ของภาษาไทยคือ U+0E00 ถึง U+0E7F.
 *
 * @param text - ข้อความที่ต้องการตรวจสอบ
 * @returns true ถ้ามีอักขระภาษาไทยอย่างน้อย 1 ตัว, false ถ้าไม่มี
 */
function containsThaiCharacter(text) {
  // Unicode range ของภาษาไทย: เกษมถึงอักขระไทยทุกตัว (U+0E00 - U+0E7F)
  const thaiCharacterPattern = /[\u0E00-\u0E7F]/;
  return thaiCharacterPattern.test(text);
}

/**
 * ดึง comment แรกสุดของไฟล์ (หากเป็น Block comment แบบ JSDoc).
 *
 * @param sourceCode - ESLint SourceCode object
 * @returns comment object หรือ undefined ถ้าไม่มี
 */
function getLeadingJSDocComment(sourceCode) {
  const allComments = sourceCode.getAllComments();
  if (allComments.length === 0) {
    return undefined;
  }

  const firstComment = allComments[0];
  // ตรวจว่าเป็น Block comment (ประเภท "Block") — JSDoc เป็น Block comment ที่ขึ้นต้นด้วย /**
  if (firstComment.type !== "Block") {
    return undefined;
  }

  // ตรวจว่าขึ้นต้นด้วย /** (JSDoc marker)
  if (!firstComment.value.startsWith("*")) {
    return undefined;
  }

  return firstComment;
}

/** @type {import('eslint').Rule.RuleModule} */
const requireThaiJsdocRule = {
  meta: {
    type: "problem",
    docs: {
      description: "บังคับให้ทุกไฟล์ต้องมี file-level JSDoc ที่เป็นภาษาไทย",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      missingJsdoc: "ไฟล์นี้ขาด file-level JSDoc — ทุกไฟล์ต้องมี @fileoverview ที่อธิบายหน้าที่ของไฟล์",
      missingThaiContent: "JSDoc บนสุดของไฟล์ต้องมีอักขระภาษาไทยอย่างน้อย 1 ตัว (requirement ของโปรเจกต์)",
    },
    schema: [], // ไม่รับ options
  },

  create(context) {
    // ข้ามไฟล์ที่ไม่ใช่ source code (เช่น config files, type declarations)
    const filename = context.getFilename();
    const skippedFilePatterns = [
      /\.d\.ts$/,           // type declaration files
      /node_modules\//,     // dependencies
      /\.next\//,           // Next.js build output
      /coverage\//,         // test coverage
    ];

    if (skippedFilePatterns.some((pattern) => pattern.test(filename))) {
      return {};
    }

    return {
      // ตรวจที่ Program node (root) — ทำงานครั้งเดียวต่อไฟล์
      Program(node) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        const leadingComment = getLeadingJSDocComment(sourceCode);

        if (!leadingComment) {
          context.report({
            node,
            messageId: "missingJsdoc",
          });
          return;
        }

        // ตรวจว่า JSDoc มีอักขระภาษาไทยอย่างน้อย 1 ตัว
        if (!containsThaiCharacter(leadingComment.value)) {
          context.report({
            node,
            messageId: "missingThaiContent",
          });
        }
      },
    };
  },
};

export default requireThaiJsdocRule;
```

- [ ] **Step 2: เขียน unit test ของ rule (TDD)**

เขียนไฟล์ `ui-next/eslint-rules/require-thai-jsdoc.test.js`:

```javascript
/**
 * @fileoverview
 * Unit test สำหรับ ESLint custom rule require-thai-jsdoc — ทดสอบว่า rule ตรวจจับ
 * ไฟล์ที่ไม่มี JSDoc ภาษาไทย และผ่านไฟล์ที่มีอย่างถูกต้อง.
 */

import { describe, it, expect } from "vitest";
import { RuleTester } from "eslint";
import requireThaiJsdocRule from "./require-thai-jsdoc.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

describe("require-thai-jsdoc rule", () => {
  it("ผ่านไฟล์ที่มี JSDoc ภาษาไทย", () => {
    ruleTester.run("require-thai-jsdoc", requireThaiJsdocRule, {
      valid: [
        {
          code: `/**
 * @fileoverview
 * ไฟล์นี้ทำหน้าที่ทดสอบ rule.
 */
export const testValue = 1;`,
        },
      ],
      invalid: [],
    });
  });

  it("fail ไฟล์ที่ไม่มี JSDoc เลย", () => {
    ruleTester.run("require-thai-jsdoc", requireThaiJsdocRule, {
      valid: [],
      invalid: [
        {
          code: `export const testValue = 1;`,
          errors: [{ messageId: "missingJsdoc" }],
        },
      ],
    });
  });

  it("fail ไฟล์ที่มี JSDoc แต่เป็นภาษาอังกฤษล้วน", () => {
    ruleTester.run("require-thai-jsdoc", requireThaiJsdocRule, {
      valid: [],
      invalid: [
        {
          code: `/**
 * @fileoverview
 * This file tests the rule.
 */
export const testValue = 1;`,
          errors: [{ messageId: "missingThaiContent" }],
        },
      ],
    });
  });

  it("fail ไฟล์ที่มี line comment แทน JSDoc", () => {
    ruleTester.run("require-thai-jsdoc", requireThaiJsdocRule, {
      valid: [],
      invalid: [
        {
          code: `// ไฟล์นี้ทำหน้าที่ทดสอบ rule
export const testValue = 1;`,
          errors: [{ messageId: "missingJsdoc" }],
        },
      ],
    });
  });
});
```

- [ ] **Step 3: เขียน `vitest.config.ts`**

เขียนไฟล์ `ui-next/vitest.config.ts`:

```typescript
/**
 * @fileoverview
 * การตั้งค่า Vitest สำหรับ unit testing ของ ThingsBoard UI.
 * Vitest ทำหน้าที่ parity กับ Karma + Jasmine ที่ Angular ใช้.
 */

import { defineConfig } from "vitest/config";
import path from "node:path";

const vitestConfiguration = defineConfig({
  resolve: {
    alias: {
      // parity กับ tsconfig paths — ทำให้ test file import ผ่าน alias ได้
      "@app": path.resolve(__dirname, "./src/app"),
      "@core": path.resolve(__dirname, "./src/core"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@widgets": path.resolve(__dirname, "./src/widgets"),
      "@features": path.resolve(__dirname, "./src/feature-components"),
      "@styles": path.resolve(__dirname, "./src/styles"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@tests": path.resolve(__dirname, "./tests"),
    },
  },
  test: {
    environment: "node",
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "eslint-rules/**/*.test.js",
      "src/**/*.test.ts",
    ],
    exclude: ["node_modules", ".next", "tests/end-to-end", "tests/parity"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.*", "src/**/*.stories.*"],
    },
  },
});

export default vitestConfiguration;
```

- [ ] **Step 4: รัน test ของ custom rule — verify ว่า rule ทำงานถูก**

Run:
```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next" && npx vitest run eslint-rules/require-thai-jsdoc.test.js
```
Expected: ผ่าน 4 tests ครบ

- [ ] **Step 5: เขียน ESLint flat config**

เขียนไฟล์ `ui-next/eslint.config.mjs`:

```javascript
/**
 * @fileoverview
 * ESLint flat config ของ ThingsBoard UI — รวม Next.js config, TypeScript parser,
 * และ custom rule ที่บังคับ JSDoc ภาษาไทย.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/eslint.config.mjs (flat config ของ Angular)
 */

import nextPlugin from "eslint-config-next";
import typescriptParser from "@typescript-eslint/parser";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import requireThaiJsdocRule from "./eslint-rules/require-thai-jsdoc.js";

/**
 * Custom ESLint plugin ที่รวม rules เฉพาะของ ThingsBoard.
 */
const thingsBoardPlugin = {
  meta: {
    name: "thingsboard",
    version: "1.0.0",
  },
  rules: {
    "require-thai-jsdoc": requireThaiJsdocRule,
  },
};

const eslintConfiguration = [
  // ละเว้นไฟล์ที่ไม่จำเป็นต้อง lint
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "public/**",
    ],
  },

  // การตั้งค่าหลักสำหรับไฟล์ TypeScript / JavaScript
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
      thingsboard: thingsBoardPlugin,
      next: nextPlugin,
    },
    rules: {
      // บังคับ JSDoc ภาษาไทยทุกไฟล์
      "thingsboard/require-thai-jsdoc": "error",

      // TypeScript rules — parity กับ strict mode
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",

      // Next.js rules
      "next/core-web-vitals": "error",
    },
  },

  // ไฟล์ config ที่อนุญาต console.log และ CommonJS
  {
    files: ["*.config.{ts,js,mjs,cjs}", "eslint-rules/**/*.js"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfiguration;
```

- [ ] **Step 6: ทดสอบรัน ESLint**

Run:
```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next" && npm run lint
```
Expected: อาจมี error เรื่อง Next.js missing config (ถ้ายัง) แต่ custom rule ต้องทำงาน — ลองสร้างไฟล์ไม่มี JSDoc แล้ว lint ต้องว่า "missingJsdoc"

- [ ] **Step 7: Commit**

```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next"
git add eslint.config.mjs eslint-rules/ vitest.config.ts
git commit -m "feat(ui-next): ตั้งค่า ESLint + custom rule บังคับ JSDoc ภาษาไทย (Phase 0 Task 6)"
```

---

## Task 7: ตั้งค่า Playwright + parity test infrastructure

**Files:**
- Create: `ui-next/playwright.config.ts`
- Create: `ui-next/tests/parity/parity-comparator.ts`
- Create: `ui-next/tests/parity/parity-test-runner.ts`
- Create: `ui-next/tests/parity/parity-smoke.spec.ts`
- Create: `ui-next/tests/parity/fixtures/.gitkeep`

- [ ] **Step 1: เขียน `playwright.config.ts`**

เขียนไฟล์ `ui-next/playwright.config.ts`:

```typescript
/**
 * @fileoverview
 * การตั้งค่า Playwright สำหรับ ThingsBoard UI — แบ่ง project เป็น parity (contract test)
 * และ e2e (user flow test) เพื่อรันแยกกันได้.
 *
 * @reason
 * parity tests ต้องการ backend ปลอม (mock) ในขณะที่ e2e ต้องการ backend จริง —
 * การแบ่ง project ทำให้ CI รันแยก stage กันได้.
 */

import { defineConfig, devices } from "@playwright/test";

const playwrightConfiguration = defineConfig({
  testDir: "./tests",

  // parity test ใช้ timeout นานเพราะต้องรอ Angular และ Next.js ทั้งคู่
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },

  fullyParallel: false, // parity test ต้องรันตามลำดับเพราะแชร backend
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
  ],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "parity",
      testMatch: "tests/parity/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "e2e",
      testMatch: "tests/end-to-end/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  // dev server ต้องรันอยู่ก่อน — parity test จะไปเปิดใช้ mock backend เอง
  webServer: process.env.CI
    ? {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});

export default playwrightConfiguration;
```

- [ ] **Step 2: เขียน `parity-comparator.ts`**

เขียนไฟล์ `ui-next/tests/parity/parity-comparator.ts`:

```typescript
/**
 * @fileoverview
 * ตัวเปรียบเทียบ traffic ระหว่าง Angular เดิม กับ Next.js ใหม่ — เป็นหัวใจของ parity testing.
 *
 * @reason
 * "Behavior parity" ของโปรเจกต์นี้คือ ทุก HTTP request และ WebSocket message ที่ Next.js ส่ง
 * ต้องเหมือน Angular เดิม byte-for-byte. คลาสนี้ทำหน้าที่เปรียบเทียบและรายงานความแตกต่าง.
 *
 * @parityEngine
 * ไม่มี equivalent ใน Angular เดิม — เป็น infrastructure ใหม่ที่สร้างขึ้นเพื่อ migration.
 */

/**
 * โครงสร้างของ HTTP request ที่จะเปรียบเทียบ parity.
 */
export interface HttpRequestSnapshot {
  /** HTTP method (GET, POST, PUT, DELETE) */
  readonly method: string;

  /** URL path และ query string */
  readonly url: string;

  /** headers ที่เกี่ยวข้องกับ parity (ignore user-agent, timestamp, etc.) */
  readonly relevantHeaders: Readonly<Record<string, string>>;

  /** request body (JSON object หรือ string) */
  readonly body: unknown;
}

/**
 * ผลลัพธ์การเปรียบเทียบ parity ของ HTTP request หนึ่งตัว.
 */
export interface ParityComparisonResult {
  /** true ถ้าเหมือนกันทุก field, false ถ้ามีอย่างน้อยหนึ่ง field แตกต่าง */
  readonly isMatch: boolean;

  /** รายการ field ที่แตกต่าง (empty ถ้า isMatch เป็น true) */
  readonly differences: readonly ParityDifference[];
}

/**
 * ความแตกต่างของ field หนึ่ง field.
 */
export interface ParityDifference {
  /** ชื่อ field ที่แตกต่าง (เช่น "url", "body.deviceName") */
  readonly fieldPath: string;

  /** ค่าจาก Angular (expected) */
  readonly angularValue: unknown;

  /** ค่าจาก Next.js (actual) */
  readonly nextJsValue: unknown;
}

/**
 * รายชื่อ header ที่นำมาเปรียบเทียบ (ที่เหลือ ignore เพราะเป็น implementation detail).
 * สำคัญที่สุด: X-Authorization (parity กับ Angular ที่ใช้ header นี้แทน Authorization มาตรฐาน).
 */
const RELEVANT_HTTP_HEADERS_FOR_PARITY = [
  "X-Authorization",
  "Content-Type",
  "Accept",
] as const;

/**
 * เปรียบเทียบ HTTP request สองตัวเพื่อตรวจสอบ parity.
 *
 * @param angularRequest - request ที่ capture จาก Angular เดิม (baseline)
 * @param nextJsRequest - request ที่ capture จาก Next.js ใหม่
 * @returns ผลลัพธ์การเปรียบเทียบ
 *
 * @example
 * ```typescript
 * const result = compareHttpRequests(angularSnapshot, nextJsSnapshot);
 * if (!result.isMatch) {
 *   console.error("Parity failed:", result.differences);
 * }
 * ```
 */
export function compareHttpRequests(
  angularRequest: HttpRequestSnapshot,
  nextJsRequest: HttpRequestSnapshot,
): ParityComparisonResult {
  const differences: ParityDifference[] = [];

  // เปรียบเทียบ method
  if (angularRequest.method !== nextJsRequest.method) {
    differences.push({
      fieldPath: "method",
      angularValue: angularRequest.method,
      nextJsValue: nextJsRequest.method,
    });
  }

  // เปรียบเทียบ URL (case-sensitive)
  if (angularRequest.url !== nextJsRequest.url) {
    differences.push({
      fieldPath: "url",
      angularValue: angularRequest.url,
      nextJsValue: nextJsRequest.url,
    });
  }

  // เปรียบเทียบเฉพาะ relevant headers
  for (const headerName of RELEVANT_HTTP_HEADERS_FOR_PARITY) {
    const angularHeaderValue = angularRequest.relevantHeaders[headerName];
    const nextJsHeaderValue = nextJsRequest.relevantHeaders[headerName];

    if (angularHeaderValue !== nextJsHeaderValue) {
      differences.push({
        fieldPath: `headers.${headerName}`,
        angularValue: angularHeaderValue,
        nextJsValue: nextJsHeaderValue,
      });
    }
  }

  // เปรียบเทียบ body แบบ deep equality
  const angularBodyJson = JSON.stringify(angularRequest.body);
  const nextJsBodyJson = JSON.stringify(nextJsRequest.body);
  if (angularBodyJson !== nextJsBodyJson) {
    differences.push({
      fieldPath: "body",
      angularValue: angularRequest.body,
      nextJsValue: nextJsRequest.body,
    });
  }

  return {
    isMatch: differences.length === 0,
    differences,
  };
}
```

- [ ] **Step 3: เขียน unit test ของ comparator**

เขียนไฟล์ `ui-next/tests/parity/parity-comparator.test.ts`:

```typescript
/**
 * @fileoverview
 * Unit test ของ parity comparator — ทดสอบว่าฟังก์ชันเปรียบเทียบทำงานถูกต้อง
 * ทั้งกรณีที่เหมือนกันและแตกต่างกัน.
 */

import { describe, it, expect } from "vitest";
import { compareHttpRequests, type HttpRequestSnapshot } from "./parity-comparator";

describe("compareHttpRequests", () => {
  const baselineRequest: HttpRequestSnapshot = {
    method: "GET",
    url: "/api/devices?page=0&pageSize=10",
    relevantHeaders: {
      "X-Authorization": "Bearer test-token-123",
      "Content-Type": "application/json",
    },
    body: null,
  };

  it("คืนค่า isMatch=true เมื่อ request ทั้งสองเหมือนกันทุก field", () => {
    const identicalRequest: HttpRequestSnapshot = { ...baselineRequest };

    const result = compareHttpRequests(baselineRequest, identicalRequest);

    expect(result.isMatch).toBe(true);
    expect(result.differences).toHaveLength(0);
  });

  it("ตรวจจับความแตกต่างของ method ได้", () => {
    const differentMethodRequest: HttpRequestSnapshot = {
      ...baselineRequest,
      method: "POST",
    };

    const result = compareHttpRequests(baselineRequest, differentMethodRequest);

    expect(result.isMatch).toBe(false);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]?.fieldPath).toBe("method");
  });

  it("ตรวจจับความแตกต่างของ X-Authorization header ได้", () => {
    const differentTokenRequest: HttpRequestSnapshot = {
      ...baselineRequest,
      relevantHeaders: {
        ...baselineRequest.relevantHeaders,
        "X-Authorization": "Bearer wrong-token-456",
      },
    };

    const result = compareHttpRequests(baselineRequest, differentTokenRequest);

    expect(result.isMatch).toBe(false);
    expect(result.differences[0]?.fieldPath).toBe("headers.X-Authorization");
  });

  it("ignore header ที่ไม่อยู่ใน relevant list", () => {
    const requestWithExtraHeaders: HttpRequestSnapshot = {
      ...baselineRequest,
      relevantHeaders: {
        ...baselineRequest.relevantHeaders,
        "User-Agent": "different-browser",
      },
    };

    const result = compareHttpRequests(baselineRequest, requestWithExtraHeaders);

    expect(result.isMatch).toBe(true);
  });

  it("ตรวจจับความแตกต่างของ body ได้", () => {
    const differentBodyRequest: HttpRequestSnapshot = {
      ...baselineRequest,
      method: "POST",
      body: { deviceName: "different-name" },
    };

    const baselineWithBody: HttpRequestSnapshot = {
      ...baselineRequest,
      method: "POST",
      body: { deviceName: "original-name" },
    };

    const result = compareHttpRequests(baselineWithBody, differentBodyRequest);

    expect(result.isMatch).toBe(false);
    expect(result.differences[0]?.fieldPath).toBe("body");
  });
});
```

- [ ] **Step 4: รัน unit test ของ comparator**

Run:
```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next" && npx vitest run tests/parity/parity-comparator.test.ts
```
Expected: ผ่าน 5 tests ครบ

- [ ] **Step 5: เขียน `parity-test-runner.ts`**

เขียนไฟล์ `ui-next/tests/parity/parity-test-runner.ts`:

```typescript
/**
 * @fileoverview
 * Runner ที่อำนวยความสะดวกในการเขียน parity test — โหลด fixture จาก Angular
 * แล้วรัน comparison กับ Next.js ผ่าน helper functions.
 *
 * @reason
 * ลด boilerplate ของการโหลด fixture และ format error message ในไฟล์ test ทุกไฟล์.
 */

import fs from "node:fs";
import path from "node:path";
import { compareHttpRequests, type HttpRequestSnapshot, type ParityComparisonResult } from "./parity-comparator";

// re-export เพื่อให้ test file อื่น import จากที่เดียวได้
export { compareHttpRequests, type HttpRequestSnapshot, type ParityComparisonResult };

/**
 * โหลด HTTP request snapshot ที่ capture จาก Angular เดิมจาก fixture file.
 *
 * @param fixtureName - ชื่อ fixture ไม่รวมนามสกุล (เช่น "device-list-request")
 * @returns HTTP request snapshot ที่เก็บไว้ใน fixture
 *
 * @example
 * ```typescript
 * const fixture = loadAngularFixture("device-list-request");
 * ```
 */
export function loadAngularFixture(fixtureName: string): HttpRequestSnapshot {
  const fixtureFilePath = path.join(process.cwd(), "tests", "parity", "fixtures", `${fixtureName}.json`);

  if (!fs.existsSync(fixtureFilePath)) {
    throw new Error(`ไม่พบ fixture ชื่อ "${fixtureName}" ที่ ${fixtureFilePath}`);
  }

  const fixtureContent = fs.readFileSync(fixtureFilePath, "utf-8");
  return JSON.parse(fixtureContent) as HttpRequestSnapshot;
}

/**
 * รัน parity assertion ระหว่าง Angular fixture กับ Next.js snapshot จริง.
 *
 * @param fixtureName - ชื่อ fixture ของ Angular
 * @param actualNextJsRequest - request ที่ capture จาก Next.js จริง
 * @returns ผลลัพธ์การเปรียบเทียบ (throw error พร้อมรายละเอียด ถ้าไม่ match)
 */
export function assertHttpRequestParity(
  fixtureName: string,
  actualNextJsRequest: HttpRequestSnapshot,
): ParityComparisonResult {
  const angularRequest = loadAngularFixture(fixtureName);
  const comparisonResult = compareHttpRequests(angularRequest, actualNextJsRequest);

  if (!comparisonResult.isMatch) {
    const formattedDifferences = comparisonResult.differences
      .map((difference) => {
        return `  - ${difference.fieldPath}: Angular="${JSON.stringify(difference.angularValue)}" vs Next.js="${JSON.stringify(difference.nextJsValue)}"`;
      })
      .join("\n");

    throw new Error(
      `Parity test fail สำหรับ fixture "${fixtureName}" — พบความแตกต่าง:\n${formattedDifferences}`,
    );
  }

  return comparisonResult;
}
```

- [ ] **Step 6: เขียน `parity-smoke.spec.ts`**

เขียนไฟล์ `ui-next/tests/parity/parity-smoke.spec.ts`:

```typescript
/**
 * @fileoverview
 * Smoke test ของ parity infrastructure — ยืนยันว่า runner, comparator, และ fixture loader
 * ทำงานได้ถูกต้อง ไม่ได้ทดสอบ parity ของ feature จริง (จะทำใน Phase 1 เป็นต้นไป).
 *
 * @reason
 * Phase 0 ต้องการเพียงยืนยันว่า infrastructure พร้อม ไม่ใช่มี test ครบ —
 * เพราะ fixtures จะถูก capture ใน Phase 1 เมื่อ port services เสร็จ.
 */

import { describe, it, expect } from "vitest";
import { compareHttpRequests, type HttpRequestSnapshot } from "./parity-comparator";

describe("parity infrastructure smoke test", () => {
  it("compareHttpRequests ทำงานได้และคืนค่า isMatch=true เมื่อเหมือนกัน", () => {
    const identicalRequest: HttpRequestSnapshot = {
      method: "GET",
      url: "/api/health",
      relevantHeaders: {
        "X-Authorization": "Bearer smoke-test-token",
        "Content-Type": "application/json",
      },
      body: null,
    };

    const result = compareHttpRequests(identicalRequest, identicalRequest);

    expect(result.isMatch).toBe(true);
    expect(result.differences).toHaveLength(0);
  });

  it("infrastructure พร้อมสำหรับการเพิ่ม parity test ใน Phase 1", () => {
    // test นี้เป็น marker ว่า infrastructure ครบถ้วน — เมื่อ Phase 1 เริ่ม,
    // จะเพิ่ม fixtures และ assertions ที่เปรียบเทียบกับ Angular จริง
    expect(typeof compareHttpRequests).toBe("function");
  });
});
```

- [ ] **Step 7: สร้าง fixtures directory placeholder**

Run:
```bash
mkdir -p "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next/tests/parity/fixtures" && touch "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next/tests/parity/fixtures/.gitkeep"
```

- [ ] **Step 8: รัน parity smoke test**

Run:
```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next" && npx vitest run tests/parity/parity-smoke.spec.ts
```
Expected: ผ่าน 2 tests

- [ ] **Step 9: Commit**

```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next"
git add playwright.config.ts tests/
git commit -m "feat(ui-next): ตั้งค่า Playwright + parity test infrastructure (Phase 0 Task 7)"
```

---

## Task 8: Final smoke test + update phase tracker

**Files:**
- Modify: `docs/superpowers/specs/2026-07-12-nextjs-refactor-phases.md`

- [ ] **Step 1: รัน lint ทั้งโปรเจกต์**

Run:
```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next" && npm run lint
```
Expected: ผ่าน (อาจมี warning แต่ห้ามมี error)

- [ ] **Step 2: รัน unit tests ทั้งหมด**

Run:
```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next" && npm run test:unit
```
Expected: ผ่านทุก test (custom ESLint rule + parity comparator + smoke)

- [ ] **Step 3: ทดสอบ parity runner**

Run:
```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next" && npm run test:parity -- --list
```
Expected: แสดงรายการ parity specs (smoke test 1 file)

- [ ] **Step 4: ทดสอบ dev server รันได้จริง**

Run:
```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor/ui-next" && timeout 30 npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 12
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/en
```
Expected: HTTP 200

- [ ] **Step 5: ทดสอบ proxy ทำงาน (ถ้า backend รันอยู่)**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/login
```
Expected: HTTP 401 (จาก backend) หรือ HTTP 200 ถ้า backend รันและไม่ require auth สำหรับ endpoint นี้ — แสดงว่า proxy ทำงาน

- [ ] **Step 6: อัปเดต phase tracker — เปลี่ยนสถานะ Phase 0 sub-phases เป็น done**

แก้ไฟล์ `docs/superpowers/specs/2026-07-12-nextjs-refactor-phases.md` — เปลี่ยน `- [ ]` เป็น `- [x]` ในส่วน Phase 0:

- [x] **0.1 — สร้าง Next.js 16 scaffold** (Task 1)
- [x] **0.2 — ติดตั้ง HeroUI v3 + ตั้งค่า theme** (Task 2)
- [x] **0.3 — ตั้งค่า dev proxy ไปยัง backend** (Task 3)
- [x] **0.4 — สร้าง parity test infrastructure** (Task 7)
- [x] **0.5 — สร้าง ESLint rule บังคับ JSDoc ภาษาไทย** (Task 6)
- [x] **0.6 — ตั้งค่า i18n + locale ไทย starter** (Task 4 + Task 5)

และเปลี่ยนสถานะ Phase 0 ใน top-level table เป็น 🟢 เสร็จ พร้อม progress 6/6

- [ ] **Step 7: Commit ขั้นสุดท้ายของ Phase 0**

```bash
cd "D:/Thingsboard/thingsboard-4.3.1 - refactor"
git add docs/superpowers/specs/2026-07-12-nextjs-refactor-phases.md
git commit -m "docs: อัปเดต phase tracker — Phase 0 เสร็จสมบูรณ์"
```

---

## Acceptance Criteria (Phase 0 ผ่านเมื่อ)

สอดคล้องกับ design doc และ phase tracker:

- [ ] `cd ui-next && npm run dev` รันได้ไม่ error → เปิด `http://localhost:3000/en` เห็นหน้า home
- [ ] HeroUI `<Button>` render สี brand ของ ThingsBoard (`#305680`) ถูกต้อง
- [ ] `fetch('/api/auth/login', {method:'POST'})` จาก browser ไปถึง backend ได้ (proxy ทำงาน)
- [ ] `npm run test:parity` รันได้ — smoke test ผ่าน 2 tests
- [ ] `npm run test:unit` ผ่าน — custom ESLint rule + parity comparator tests ผ่าน
- [ ] `npm run lint` fail เมื่อไฟล์ไม่มี JSDoc (verify โดยสร้างไฟล์ทดสอบที่ไม่มี JSDoc)
- [ ] สลับภาษาระหว่าง `/en` ↔ `/th` ได้ — ข้อความ UI เปลี่ยนภาษาถูกต้อง
- [ ] ทุกไฟล์ `.ts/.tsx/.js` ที่สร้างใน Phase 0 มี file-level JSDoc ภาษาไทย
- [ ] ทุกไฟล์มี exported symbol ที่มี JSDoc (เช่น `thingsBoardHeroUiTheme`, `compareHttpRequests`, `loadAngularFixture`)

---

## Self-Review Checklist

ก่อนถือว่า Phase 0 เสร็จ ให้รัน self-review ตามนี้:

1. **Spec coverage** — ทุก sub-phase 0.1-0.6 ใน phase tracker มี task ที่ implement ครบ (ใช่ — Task 1-8 ครอบคลุมทั้งหมด)
2. **Placeholder scan** — ไม่มี TBD/TODO/"fill in later" ในไฟล์ (ตรวจอีกครั้งหลัง implement)
3. **Type consistency** — ชื่อ function/type เหมือนกันทุกที่ที่อ้างถึง:
   - `HttpRequestSnapshot` (ใช้ใน parity-comparator, parity-test-runner, test)
   - `thingsBoardHeroUiTheme` (ใช้ใน heroui-theme.ts และ layout.tsx)
   - `SUPPORTED_LANGUAGES` (ใช้ใน supported-languages.ts และ language-switcher.tsx)
4. **Parity verified** — ค่า brand colors (`#305680`, `#527dad`, `#a7c1de`, `#9fa8da`, `#7986cb`) parity กับ `ui-ngx/src/scss/constants.scss`
5. **Proxy parity verified** — ทุก path ใน `proxy.conf.js` มีใน `next.config.ts` rewrites

---

## Next Phase

เมื่อ Phase 0 ผ่าน acceptance criteria ทั้งหมด → เรียก `writing-plans` skill อีกครั้งเพื่อเขียน **Phase 1 — Core Service Layer (RxJS port)** implementation plan.
