# Task Plan — การ Refactor Frontend ThingsBoard → Next.js 16 + HeroUI

> **เอกสารติดตามงานระดับโปรเจกต์ (Master Task Plan)**
> วันที่สร้าง: 2026-07-12
> คู่กับ: [`2026-07-12-nextjs-refactor-design.md`](./2026-07-12-nextjs-refactor-design.md)
> สถานะรวม: **Phase 0 ยังไม่เริ่ม**

เอกสารฉบับนี้รวมทุก phase ของการ refactor ไว้ในไฟล์เดียว พร้อม sub-phase แบบละเอียด ใช้ติดตามความคืบหน้าทั้งโปรเจกต์ — **แต่ละ phase จะมี implementation plan แยก** (เขียนผ่าน `writing-plans` skill ก่อนเริ่ม implement) ที่ลงรายละเอียดขั้นตอนการทำจริง

---

## วิธีใช้เอกสารฉบับนี้

- **Checkbox `- [ ]`** = sub-phase ที่ยังไม่เสร็จ
- **Checkbox `- [x]`** = sub-phase ที่เสร็จแล้ว (อัปเดตเมื่อ implement เสร็จ)
- **`🎯 Acceptance`** = เกณฑ์ที่ต้องผ่านก่อนไป phase ถัดไป
- **`📁 Files`** = ไฟล์/directory หลักที่ phase นี้สร้าง/แก้
- **`🔗 ParityEngine`** = ไฟล์ Angular ต้นทางที่พอร์ตมา (อ้างอิง parity)
- **`⚠️ Risk`** = ความเสี่ยงเฉพาะ phase (ดู risk register เต็มที่ design doc)

---

## สรุป Progress ระดับสูง (Top-Level Progress)

| Phase | ชื่อ | สถานะ | Progress |
|---|---|---|---|
| 0 | Foundation & Tooling | 🟢 เสร็จ | 6/6 |
| 1 | Core Service Layer (RxJS port) | ⬜ ยังไม่เริ่ม | 0/9 |
| 2 | Shared Library & Design System | ⬜ ยังไม่เริ่ม | 0/8 |
| 3 | App Shell, Auth & Device Blueprint | ⬜ ยังไม่เริ่ม | 0/4 |
| 4 | Entity CRUD Pages (24 resolvers) | ⬜ ยังไม่เริ่ม | 0/5 |
| 5 | Dashboard Editor & Widget Engine | ⬜ ยังไม่เริ่ม | 0/6 |
| 6 | Rule Chain Editor (React Flow) | ⬜ ยังไม่เริ่ม | 0/4 |
| 7 | SCADA Editor + i18n ไทย + Polish | ⬜ ยังไม่เริ่ม | 0/6 |

**คำอธิบายสถานะ**: ⬜ ยังไม่เริ่ม / 🟡 กำลังทำ / 🟢 เสร็จ / 🔴 บล็อก

---

## ข้อตกลงหลัก (Locked Decisions)

| มิติ | เลือก |
|---|---|
| Framework | Next.js 16 (App Router, React 19.2) |
| UI Library | HeroUI v3.2.2 |
| Migration | Clean break — แทนที่ `ui-ngx` |
| State/Data | คง RxJS services + `@react-rxjs/core` bridge |
| Charting | คง ECharts (fork) + Flot + canvas-gauges + SVG.js |
| Rule Chain | React Flow (`@xyflow/react`) |
| Testing | Vitest (unit) + Playwright (E2E + parity) |
| i18n | `next-intl` + เพิ่ม `th_TH` |
| Comments | ภาษาไทยเข้มข้นเต็ม (ทุก symbol + file + inline) |
| Naming | Descriptive เต็มรูปแบบ ห้ามย่อ |

---

# Phase 0 — Foundation & Tooling

> **เป้าหมาย**: ตั้งรากฐาน Next.js 16 ที่รันได้ เชื่อม backend ได้ มี parity test infrastructure พร้อม และมี CI rule บังคับ JSDoc ภาษาไทย
>
> **สถานะ**: 🟢 เสร็จสมบูรณ์ (2026-07-12)
>
> **ผลลัพธ์จริง**: ใช้ Tailwind v4 (ไม่ใช่ v3 ตามแผนเดิม) เพราะ HeroUI v3.2.2 peer-requires v4; ใช้ next-intl v4 (ไม่ใช่ v3) เพราะ Next.js 16 ต้องการ v4+
>
> **Estimated files**: ~30 ไฟล์ config + scaffold

### Sub-phases

- [x] **0.1 — สร้าง Next.js 16 scaffold** (commit `6b8c916`, `f2dc3b8`)
  - **งาน**: `create-next-app` ด้วย App Router + TypeScript strict + ESLint + Tailwind v4
  - **📁 Files**: `ui-next/package.json`, `ui-next/tsconfig.json`, `ui-next/.editorconfig`, `ui-next/.gitignore`, `ui-next/README.md`
  - **🎯 Acceptance**: ✅ `npm run dev` รันได้ เห็นหน้า placeholder ที่ `http://localhost:3040`

- [x] **0.2 — ติดตั้ง HeroUI v3 + ตั้งค่า theme** (commit `789621d`, `df18b21`)
  - **งาน**: ติดตั้ง `@heroui/react` + Tailwind v4 CSS-first config + สร้าง TB brand tokens (CSS variables parity กับ `constants.scss`)
  - **📁 Files**: `ui-next/src/styles/brand-tokens.css`, `ui-next/src/app/globals.css` (Tailwind v4 + `@heroui/styles` import)
  - **🔗 ParityEngine**: `ui-ngx/src/scss/constants.scss`, `ui-ngx/src/theme.scss`
  - **🎯 Acceptance**: ✅ Brand colors parity byte-for-byte; HeroUI components ใช้งานผ่าน CSS variables

- [x] **0.3 — ตั้งค่า dev proxy ไปยัง backend** (commit `099adb9`)
  - **งาน**: `rewrites()` ใน `next.config.ts` ส่ง `/api/*`, `/oauth2/*`, `/static/*`, `/api/ws` ไป `http://localhost:8080`
  - **📁 Files**: `ui-next/next.config.ts`
  - **🔗 ParityEngine**: `ui-ngx/proxy.conf.js`
  - **🎯 Acceptance**: ✅ Proxy verified (HTTP 500 เมื่อ backend ไม่รัน — แสดงว่า forward ทำงาน)

- [x] **0.4 — สร้าง parity test infrastructure** (commit `d6c79c7`)
  - **งาน**: ติดตั้ง Playwright + สร้าง `parity-comparator.ts` (ตัวเปรียบเทียบ HTTP request) + `parity-test-runner.ts` + smoke test
  - **📁 Files**: `ui-next/tests/parity/`, `ui-next/playwright.config.ts`, `ui-next/tests/parity/fixtures/`
  - **🎯 Acceptance**: ✅ parity runner รันได้ — 2 tests ผ่าน; comparator unit test 5 tests ผ่าน

- [x] **0.5 — สร้าง ESLint rule บังคับ JSDoc ภาษาไทย** (commit `d1646bd`)
  - **งาน**: custom ESLint rule `thingsboard/require-thai-jsdoc` บังคับ file-level JSDoc มีอักขระไทย + flat config
  - **📁 Files**: `ui-next/eslint-rules/require-thai-jsdoc.mjs`, `ui-next/eslint-rules/require-thai-jsdoc.test.mjs`, `ui-next/eslint.config.mjs`, `ui-next/vitest.config.ts`
  - **🎯 Acceptance**: ✅ Rule จับไฟล์ที่ไม่มี JSDoc จริง (verified กับ `postcss.config.mjs`); TDD 4 tests ผ่าน

- [x] **0.6 — ตั้งค่า i18n + locale ไทย starter** (commit `f70c17a`, `3ef6500`)
  - **งาน**: ติดตั้ง `next-intl` v4 + สร้าง routing/request config + `[locale]/layout.tsx` + middleware + `en.json`/`th.json` starter + language switcher
  - **📁 Files**: `ui-next/i18n/routing.ts`, `ui-next/i18n/request.ts`, `ui-next/src/lib/supported-languages.ts`, `ui-next/src/middleware.ts`, `ui-next/src/app/[locale]/layout.tsx`, `ui-next/src/app/[locale]/page.tsx`, `ui-next/src/components/language-switcher.tsx`, `ui-next/public/locale/en.json`, `ui-next/public/locale/th.json`
  - **🔗 ParityEngine**: `ui-ngx/src/assets/locale/locale.constant-en_US.json`, `ui-ngx/esbuild/tb-esbuild-plugins.ts`
  - **🎯 Acceptance**: ✅ `/en` แสดง "Welcome to ThingsBoard", `/th` แสดง "ยินดีต้อนรับสู่ ThingsBoard"

### 🎯 Phase 0 — Acceptance Criteria (ผ่านเมื่อ) — ✅ ผ่านครบ 2026-07-12
1. ✅ `cd ui-next && npm run dev` รันได้ไม่ error — HTTP 200 ที่ `/en` และ `/th`
2. ✅ HeroUI render สี brand ของ TB ถูกต้อง — `--thingsboard-primary-color: #305680` parity กับ SCSS
3. ✅ `/api/*` จาก browser ไปถึง backend ได้ — proxy verified (HTTP 500 จาก backend ที่ไม่ได้รัน)
4. ✅ `npm run test:parity` รันได้ — 2 tests ผ่าน
5. ✅ `npm run test:unit` ผ่าน — 9 tests ผ่าน (4 ESLint rule + 5 parity comparator)
6. ✅ `npm run lint` — 0 errors, 0 warnings (custom rule `thingsboard/require-thai-jsdoc` ทำงานจริง)
7. ✅ สลับภาษาระหว่าง `/en` ↔ `/th` ได้ — เนื้อหาเปลี่ยนภาษาถูกต้อง
8. ✅ ทุกไฟล์ `.ts/.tsx/.js` ที่สร้างใน Phase 0 มี file-level JSDoc ภาษาไทย (verified โดย ESLint rule)

**Note**: ใช้ Tailwind v4 (ไม่ใช่ v3 ตามแผนเดิม) เพราะ HeroUI v3.2.2 peer-requires `tailwindcss >=4.0.0`
**Note**: ใช้ next-intl v4 (ไม่ใช่ v3) เพราะ Next.js 16 ต้องการ next-intl >=4.4.0

---

# Phase 1 — Core Service Layer (RxJS Port)

> **เป้าหมาย**: พอร์ตทุก HTTP service + WebSocket + Auth มาทำงานใน React environment โดยยังไม่มี component — parity test ทุก service ผ่าน byte-for-byte
>
> **สถานะ**: ⬜ ยังไม่เริ่ม
>
> **Estimated files**: ~250 ไฟล์ (210 models + 40 services + ws + auth + i18n + state)

### Sub-phases

- [ ] **1.1 — Port 210 model files (pure TypeScript)**
  - **งาน**: copy ไฟล์จาก `ui-ngx/src/app/shared/models/` → `ui-next/src/shared/models/` ถอด Angular decorator (`@Injectable` บน model) และแก้ import path
  - **📁 Files**: `ui-next/src/shared/models/` (210 files)
  - **🔗 ParityEngine**: `ui-ngx/src/app/shared/models/`
  - **⚠️ Risk**: ไฟล์ใหญ่บางไฟล์ — `map.models.ts` (~1600 บรรทัด), `scada-symbol.models.ts` (1965), `time.models.ts` (1534)
  - **🎯 Acceptance**: ทุกไฟล์ compile ผ่าน + JSDoc ภาษาไทยครบ

- [ ] **1.2 — Port `http-utils` + เปลี่ยน `InterceptorHttpParams` → `HttpContext`**
  - **งาน**: พอร์ต `defaultHttpOptionsFromConfig()` + `RequestConfig` interface + แทนที่การแอบซ่อน config ใน `HttpParams` ด้วย `HttpContext` token pattern
  - **📁 Files**: `ui-next/src/core/http/http-utils.ts`, `ui-next/src/core/http/request-context.ts`
  - **🔗 ParityEngine**: `ui-ngx/src/app/core/http/http-utils.ts`, `ui-ngx/src/app/core/interceptors/global-http-interceptor.ts`
  - **🎯 Acceptance**: `defaultHttpOptionsFromConfig({ignoreErrors:true})` สร้าง context ที่ interceptor อ่านได้

- [ ] **1.3 — Port 40 HTTP services (RxJS)**
  - **งาน**: พอร์ตทุกไฟล์ใน `ui-ngx/src/app/core/http/*.service.ts` — ถอด `@Injectable` เปลี่ยนเป็น factory function (`createDeviceService(httpClient)`) คง Observable return type ทุก method
  - **📁 Files**: `ui-next/src/core/http/` (40 services + factory)
  - **🔗 ParityEngine**: `ui-ngx/src/app/core/http/` (40 services)
  - **⚠️ Risk**: `entity.service.ts` ใหญ่ (1578 บรรทัด) — generic entity endpoint
  - **🎯 Acceptance**: parity test แต่ละ service ผ่าน (URL/headers/body matching)

- [ ] **1.4 — Port WebSocket services + merge dead proxy**
  - **งาน**: พอร์ต `WebsocketService` (base), `TelemetryWebsocketService` — merge `NotificationWebsocketService` เข้า telemetry โดยตรง (มัน delegate ทุกอย่างอยู่แล้ว)
  - **📁 Files**: `ui-next/src/core/websocket/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/core/ws/` (4 files)
  - **⚠️ Risk**: idle timeout (90s), reconnect interval (2s) ต้อง parity เป๊ะ
  - **🎯 Acceptance**: parity test WebSocket auth + subscription + reconnect ผ่าน

- [ ] **1.5 — Port AuthService (split + คง behavior)**
  - **งาน**: แยก god service 657 บรรทัดเป็น `token-storage.ts` (localStorage), `auth-redirect.ts` (redirect logic), `auth-service.ts` (orchestrator), `jwt-helper.ts`, `public-access.ts`, `two-factor-auth.ts`
  - **📁 Files**: `ui-next/src/core/authentication/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/core/auth/auth.service.ts` (657 บรรทัด)
  - **⚠️ Risk R3**: behavior ต้องเหมือนเดิม — login/refresh/logout/401 retry/public access
  - **🎯 Acceptance**: parity test auth flow ครบผ่าน (login → token → refresh → logout)

- [ ] **1.6 — HTTP client wrapper + interceptor chain**
  - **งาน**: สร้าง HTTP client (fetch-based หรือ axios) + chain ของ interceptor ที่ทำงานเหมือน `GlobalHttpInterceptor` (auth → error → rate-limit → loading → notification → conflict)
  - **📁 Files**: `ui-next/src/core/http/http-client-factory.ts`, `ui-next/src/core/http/interceptor-chain.ts`, `ui-next/src/core/http/interceptors/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/core/interceptors/global-http-interceptor.ts` (~207 บรรทัด)
  - **⚠️ Risk R1**: split เป็น chain แต่ output ต้องเหมือนเดิม byte-for-byte
  - **🎯 Acceptance**: parity test interceptor chain ผ่าน (401 retry, 429 backoff, 409 conflict, 403 forbidden, 41 entitiesLimitExceeded)

- [ ] **1.7 — Port widget subscription layer**
  - **งาน**: พอร์ต `widget-subscription.ts` (1700 บรรทัด) + `entity-data-subscription.ts` (56KB) + `data-aggregator.ts` + `alarm-data-subscription.ts` + `alias-controller.ts` — pure logic port
  - **📁 Files**: `ui-next/src/core/widget-subscription/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/core/api/`
  - **⚠️ Risk**: paging/aggregation logic ซับซ้อนมาก ต้อง parity 100%
  - **🎯 Acceptance**: parity test telemetry subscription + aggregation ผ่าน

- [ ] **1.8 — Port 4 store slices → `@react-rxjs/core` shared state**
  - **งาน**: แปลง `authReducer`, `settingsReducer`, `loadReducer`, `notificationReducer` เป็น RxJS shared state (`createSignal`/`bind`) ที่ React hook เข้าถึงได้ผ่าน `@react-rxjs/core`
  - **📁 Files**: `ui-next/src/core/shared-state/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/core/core.state.ts`, `ui-ngx/src/app/core/auth/auth.reducer.ts`, `ui-ngx/src/app/core/settings/settings.reducer.ts`, `ui-ngx/src/app/core/notification/notification.reducer.ts`
  - **🎯 Acceptance**: React component อ่าน auth user/loading state/notification queue ผ่าน hook ได้

- [ ] **1.9 — Port translate layer → `next-intl`**
  - **งาน**: พอร์ต `TranslateDefaultLoader` (load `/locale/locale.constant-{lang}.json`), `TbMissingTranslationHandler`, `TranslateDefaultCompiler` (messageformat) → adapter สำหรับ `next-intl`
  - **📁 Files**: `ui-next/src/core/internationalization/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/core/translate/`
  - **🎯 Acceptance**: translation key ทุก key render ผลเหมือน Angular เดิม รวม plural (messageformat)

### 🎯 Phase 1 — Acceptance Criteria (ผ่านเมื่อ)
1. ✅ parity test HTTP ทุก service ผ่าน (40 services × multiple methods)
2. ✅ parity test WebSocket (auth/sub/reconnect/idle) ผ่าน
3. ✅ parity test auth flow (login/refresh/logout/public/2FA) ผ่าน
4. ✅ parity test interceptor chain (401/429/409/403/41) ผ่าน
5. ✅ parity test telemetry subscription + aggregation ผ่าน
6. ✅ unit test coverage ≥ 80% ของ `src/core/`
7. ✅ JSDoc ภาษาไทยครบทุกไฟล์ใน `src/core/`

---

# Phase 2 — Shared Library & Design System

> **เป้าหมาย**: component library 130 ตัว + 17 pipes (เป็น hooks) + entity table framework พร้อมใช้สำหรับทุก feature page
>
> **สถานะ**: ⬜ ยังไม่เริ่ม
>
> **Estimated files**: ~200 ไฟล์

### Sub-phases

- [ ] **2.1 — Port 17 pipes → React utilities/hooks**
  - **งาน**: แปลง Angular pipe (`dateAgo`, `fileSize`, `shortNumber`, `safe`, `truncate`, `highlight`, `image`, `keyboardShortcut`, ฯลฯ) → pure function + custom hook (`useDateAgo`, `useFileSize`, ...)
  - **📁 Files**: `ui-next/src/shared/pipes-as-hooks/` (17 files)
  - **🔗 ParityEngine**: `ui-ngx/src/app/shared/pipe/` (17 pipes)
  - **🎯 Acceptance**: unit test ทุก pipe-equivalent ผ่าน

- [ ] **2.2 — Foundation components (HeroUI mapping)**
  - **งาน**: สร้าง `Button`, `Card`, `Input`, `Select`, `Modal/Dialog`, `Checkbox`, `Radio`, `Switch`, `Tabs`, `Tooltip` บน HeroUI + ปรับสี brand
  - **📁 Files**: `ui-next/src/shared/components/button/`, `card/`, `input/`, ... (10+ components)
  - **🎯 Acceptance**: Storybook/showcase แสดงทุก foundation component + a11y check ผ่าน

- [ ] **2.3 — Form components**
  - **งาน**: พอร์ต `entity-autocomplete`, `JSON editor`, `JS-function editor`, `CSS editor`, `SVG editor`, `protobuf editor`, `markdown editor`, `image input`, `file input`
  - **📁 Files**: `ui-next/src/shared/components/entity-autocomplete/`, `json-editor/`, ... (9+ components)
  - **🔗 ParityEngine**: `ui-ngx/src/app/shared/components/`
  - **⚠️ Risk**: JSON/JS-func editor ใช้ ACE — wrap ACE ใน React ref + cleanup
  - **🎯 Acceptance**: form component ทุกตัว validate และ emit value ได้

- [ ] **2.4 — Data display components**
  - **งาน**: พอร์ต `time-window picker`, `aggregation picker`, `breadcrumbs`, `navigation-tree`, `key-value-map editor`, `filters editor`
  - **📁 Files**: `ui-next/src/shared/components/time-window-picker/`, `aggregation-picker/`, ... (6+ components)
  - **🔗 ParityEngine**: `ui-ngx/src/app/shared/components/`
  - **🎯 Acceptance**: timewindow/aggregation selection parity กับ Angular

- [ ] **2.5 — Feedback components**
  - **งาน**: พอร์ต `toast` directive → React `<ToastProvider>` + `useToast()` hook, `confirm`/`alert` dialogs, `popover` service
  - **📁 Files**: `ui-next/src/shared/components/toast/`, `confirm-dialog/`, `popover/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/shared/components/toast.directive.ts`, `core/services/dialog.service.ts`
  - **⚠️ Risk R5**: ถอด jQuery ออกจาก toast (`$(...).closest()`)
  - **🎯 Acceptance**: toast แสดงผล parity (info/warn/success/error + position)

- [ ] **2.6 — Code editors (ACE + TinyMCE wrappers)**
  - **งาน**: wrap ACE (`ace-builds`) + TinyMCE (`tinymce`) ใน React component พร้อม lifecycle cleanup
  - **📁 Files**: `ui-next/src/shared/components/code-editor-ace/`, `rich-text-editor-tinymce/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/shared/components/`
  - **⚠️ Risk**: lazy load ทั้งคู่เพื่อลด initial bundle (แต่ละตัว ~500KB+)
  - **🎯 Acceptance**: editor ทำงานได้ + โหลดแบบ lazy

- [ ] **2.7 — EntityTable framework (`<EntityTable>`)**
  - **งาน**: สร้าง generic `<EntityTable config={entityTableConfig} />` React component ที่รับ `EntityTableConfig` (columns, actions, add/edit dialog) — เป็นหัวใจของทุก CRUD page
  - **📁 Files**: `ui-next/src/shared/entity-framework/entity-table.tsx`, `entity-table-config.ts`, `entity-table-hook.ts`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/components/entity/entities-table.component.ts`, `home/models/entity/entities-table-config.models.ts`
  - **🎯 Acceptance**: render ตารางจาก mock config ได้ + pagination/sort/search ทำงาน

- [ ] **2.8 — EntityDetailsPanel framework**
  - **งาน**: สร้าง `<EntityDetailsPanel config={...} />` สำหรับหน้ารายละเอียด entity (tabs, header, edit mode)
  - **📁 Files**: `ui-next/src/shared/entity-framework/entity-details-panel.tsx`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/components/entity/entity-details-page.component.ts`
  - **🎯 Acceptance**: render detail panel จาก mock config ได้ + tab switching ทำงาน

### 🎯 Phase 2 — Acceptance Criteria (ผ่านเมื่อ)
1. ✅ Storybook/showcase แสดงทุก component ใน `src/shared/`
2. ✅ `<EntityTable>` + `<EntityDetailsPanel>` รันกับ mock data ได้
3. ✅ a11y audit (axe-core) ผ่านทุก component
4. ✅ unit test coverage ≥ 70% ของ `src/shared/`
5. ✅ JSDoc ภาษาไทยครบทุกไฟล์

---

# Phase 3 — App Shell, Auth & Device Blueprint

> **เป้าหมาย**: ใช้งานได้จริงครั้งแรก — login → home shell → navigate → ใช้งาน Device page ครบ flow (เป็น template สำหรับ feature อื่น)
>
> **สถานะ**: ⬜ ยังไม่เริ่ม
>
> **Estimated files**: ~80 ไฟล์

### Sub-phases

- [ ] **3.1 — Authentication pages**
  - **งาน**: สร้างหน้า login (username/password), 2FA verification, OAuth2 callback, public dashboard access (deeplink token)
  - **📁 Files**: `ui-next/src/app/(authentication)/login/`, `two-factor/`, `oauth-callback/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/login/`
  - **🎯 Acceptance**: login → redirect ไป home / mfa setup ถูกต้อง

- [ ] **3.2 — App shell (home layout)**
  - **งาน**: สร้าง `(main)/layout.tsx` ที่มี sidebar menu (จาก menu config), top header, breadcrumb, user menu (profile/logout), theme toggle
  - **📁 Files**: `ui-next/src/app/(main)/layout.tsx`, `ui-next/src/feature-components/home-shell/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/home.component.*`, `ui-ngx/src/app/modules/home/menu/`
  - **🎯 Acceptance**: navigate ระหว่าง menu ได้ + breadcrumb อัปเดต + user menu ทำงาน

- [ ] **3.3 — Device feature page (BLUEPRINT)**
  - **งาน**: สร้าง `devices/` page ครบ flow — table + details panel + add/edit dialog + tabs + table-config (resolver equivalent) — เป็น template ที่ feature อื่นจะทำตาม
  - **📁 Files**: `ui-next/src/app/(main)/devices/`, `ui-next/src/feature-components/device/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/pages/device/`
  - **🎯 Acceptance**: parity test device CRUD ครบผ่าน (list/create/read/update/delete/assign/credentials)

- [ ] **3.4 — Lazy loading ตาม route group**
  - **งาน**: ตั้งค่า `next/dynamic` สำหรับ lazy load หน้าหนัก (เช่น dashboard editor, rule chain) ตาม route group
  - **📁 Files**: `ui-next/next.config.ts`, route files
  - **🎯 Acceptance**: initial bundle ไม่รวม dashboard/rule-chain code

### 🎯 Phase 3 — Acceptance Criteria (ผ่านเมื่อ)
1. ✅ login ด้วย real backend ได้ → redirect ถูกต้อง
2. ✅ navigate ระหว่าง menu ใน home shell ได้ (ถึงแม้บางหน้ายังเป็น placeholder)
3. ✅ Device page ครบ flow parity test ผ่าน
4. ✅ parity test auth flow + device CRUD ผ่าน
5. ✅ JSDoc ภาษาไทยครบ

---

# Phase 4 — Entity CRUD Pages (24 resolvers)

> **เป้าหมาย**: ทุก entity CRUD page ทำงานครบ ใช้ pattern เดียวกับ Device blueprint (Phase 3.3)
>
> **สถานะ**: ⬜ ยังไม่เริ่ม
>
> **Estimated files**: ~150 ไฟล์

### Sub-phases (จัดกลุ่มตามความคล้าย pattern)

- [ ] **4.1 — Asset & Profile pages**
  - **งาน**: Asset, Asset Profile, Device Profile — 3 entity types พร้อม transport config (MQTT/CoAP/LwM2M/SNMP)
  - **📁 Files**: `ui-next/src/app/(main)/assets/`, `asset-profiles/`, `device-profiles/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/pages/asset/`, `device-profile/`, `asset-profile/`
  - **🎯 Acceptance**: parity test 3 entity types ครบผ่าน

- [ ] **4.2 — Organization pages**
  - **งาน**: Customer, Tenant, Tenant Profile, User, Edge, Entity View
  - **📁 Files**: `ui-next/src/app/(main)/customers/`, `tenants/`, ... (6 entity types)
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/pages/customer/`, `tenant/`, ...
  - **🎯 Acceptance**: parity test 6 entity types ครบผ่าน

- [ ] **4.3 — Read-mostly pages (logs/usage/alarm)**
  - **งาน**: Audit Log, API Usage, Alarm (read views + filter/sort)
  - **📁 Files**: `ui-next/src/app/(main)/audit-logs/`, `api-usage/`, `alarms/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/pages/audit-log/`, `api-usage/`, `alarm/`
  - **🎯 Acceptance**: parity test list/filter ผ่าน

- [ ] **4.4 — Logic/notification pages**
  - **งาน**: Notification, Calculated Fields, Version Control (vc/git)
  - **📁 Files**: `ui-next/src/app/(main)/notifications/`, `calculated-fields/`, `version-control/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/pages/notification/`, `calculated-fields/`, `vc/`
  - **🎯 Acceptance**: parity test 3 features ผ่าน

- [ ] **4.5 — Admin pages**
  - **งาน**: Queues, OTA Updates, OAuth2 Clients, 2FA Providers, AI Models, API Keys, Mobile Applications, Gateways
  - **📁 Files**: `ui-next/src/app/(main)/queues/`, `ota-updates/`, ... (8 features)
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/pages/admin/queue/`, `ota-update/`, ...
  - **🎯 Acceptance**: parity test admin pages ผ่าน

### 🎯 Phase 4 — Acceptance Criteria (ผ่านเมื่อ)
1. ✅ parity test ทุก CRUD page ผ่าน (24 resolver patterns × CRUD = ~100+ test cases)
2. ✅ ทุก page ใช้ `<EntityTable>` framework (consistency)
3. ✅ JSDoc ภาษาไทยครบ

---

# Phase 5 — Dashboard Editor & Widget Engine

> **เป้าหมาย**: Dashboard editor + viewer ทำงานครบ + widget engine render ทุก widget type ถูกต้อง
>
> **สถานะ**: ⬜ ยังไม่เริ่ม
>
> **Estimated files**: ~550 ไฟล์ (widget engine เป็นส่วนใหญ่ — 423 widget files port ตรง)

### Sub-phases

- [ ] **5.1 — Dashboard viewer (read-only)**
  - **งาน**: render dashboard JSON → states + layouts + widgets (read-only mode)
  - **📁 Files**: `ui-next/src/feature-components/dashboard-page/dashboard-viewer.tsx`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/components/dashboard-page/`
  - **🎯 Acceptance**: dashboard ตัวอย่าง render ผลเหมือน Angular

- [ ] **5.2 — Dashboard editor**
  - **งาน**: พอร์ต editor 1842 บรรทัด → แบ่ง sub-component (toolbar, state-manager, layout-editor, widget-add/edit/move) — เปลี่ยน `angular-gridster2` → `react-grid-layout`
  - **📁 Files**: `ui-next/src/feature-components/dashboard-page/` (multiple files)
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/components/dashboard-page/dashboard-page.component.ts` (1842 บรรทัด)
  - **⚠️ Risk**: การแบ่ง component ต้องรักษา state parity
  - **🎯 Acceptance**: edit/save dashboard → reload → เหมือนเดิม

- [ ] **5.3 — Widget engine core (React bridge)**
  - **งาน**: สร้าง bridge ระหว่าง widget subscription layer (Phase 1.7) กับ React render + lifecycle + CSS variables per-widget
  - **📁 Files**: `ui-next/src/widgets/subscription/widget-component.tsx`, `widget-lifecycle.ts`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/components/widget/widget.component.ts` (1777 บรรทัด)
  - **🎯 Acceptance**: widget รับ telemetry data และ re-render ได้

- [ ] **5.4 — Widget families port (423 files)**
  - **งาน**: port widget library ทั้งหมด — pure TS class ที่ render ผ่าน ref (canvas/SVG/ECharts)
  - **📁 Files**: `ui-next/src/widgets/library/` (chart, cards, maps, maps-legacy, rpc, scada, indicator, count, button, entity, date-range-navigator, trip-animation, weather, home-page)
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/components/widget/lib/` (423 files)
  - **⚠️ Risk**: Flot (legacy, jQuery-based) ต้องห่อและเก็บไว้เพราะ dashboard เก่าใช้อยู่
  - **🎯 Acceptance**: widget ทุก family render ผลถูกต้องเทียบกับ Angular

- [ ] **5.5 — SystemJS runtime registry (custom widget JS)**
  - **งาน**: port `modules-map.ts` (~770 บรรทัด) + monkey-patch layer — จำเป็นเพราะ custom widget JS ที่ผู้ใช้เขียนสามารถ `import` โมดูลภายในแอปได้
  - **📁 Files**: `ui-next/src/widgets/runtime-registry/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/common/modules-map.ts`
  - **⚠️ Risk R8**: สูงสุด — ต้อง export โมดูล React แทน Angular แต่ API ที่ custom widget ใช้ต้อง parity
  - **🎯 Acceptance**: custom widget ตัวอย่าง render ได้

- [ ] **5.6 — Public dashboard viewer**
  - **งาน**: render dashboard สำหรับ public access (ไม่ต้อง login) ที่ `/dashboard-viewer/`
  - **📁 Files**: `ui-next/src/app/dashboard-viewer/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/dashboard/`
  - **🎯 Acceptance**: public dashboard URL ทำงานได้

### 🎯 Phase 5 — Acceptance Criteria (ผ่านเมื่อ)
1. ✅ dashboard ตัวอย่างจาก production render เหมือน Angular ทุกหน้า
2. ✅ widget ทุก family (chart/cards/maps/rpc/scada/indicator/count/button/...) แสดงผลถูกต้อง
3. ✅ dashboard editor — create/edit/save/reload ครบ flow
4. ✅ custom widget JS (SystemJS) ทำงานได้
5. ✅ public dashboard viewer ทำงานได้
6. ✅ parity test dashboard + widget rendering ผ่าน

---

# Phase 6 — Rule Chain Editor (React Flow)

> **เป้าหมาย**: rule chain editor + rule node components ทำงานครบ บน React Flow
>
> **สถานะ**: ⬜ ยังไม่เริ่ม
>
> **Estimated files**: ~100 ไฟล์

### Sub-phases

- [ ] **6.1 — React Flow canvas + custom nodes/edges**
  - **งาน**: สร้าง canvas บน `@xyflow/react` + custom node components (95 ไฟร์จาก Angular) + custom edges + handles
  - **📁 Files**: `ui-next/src/feature-components/rule-chain/rule-chain-canvas.tsx`, `custom-nodes/`, `custom-edges/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/components/rule-chain/`, `components/rule-node/`
  - **🎯 Acceptance**: render rule chain graph จาก JSON ได้

- [ ] **6.2 — Rule node config dialogs**
  - **งาน**: พอร์ต config dialog ของ rule node ทุกประเภท (filter, enrichment, transformation, action, external, flow)
  - **📁 Files**: `ui-next/src/feature-components/rule-chain/rule-node-config-dialog.tsx`, `rule-node-configs/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/components/rule-node/`
  - **🎯 Acceptance**: เปิด config dialog ของแต่ละ node type ได้

- [ ] **6.3 — Rule chain page (orchestrator)**
  - **งาน**: พอร์ต rule chain page 1982 บรรทัด → แบ่ง sub-component (save/activate/import/export/test script)
  - **📁 Files**: `ui-next/src/app/(main)/rule-chains/[ruleChainId]/page.tsx`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/pages/rulechain/rulechain-page.component.ts` (1982 บรรทัด)
  - **🎯 Acceptance**: import rule chain จาก JSON + save + activate + export ได้

- [ ] **6.4 — Edge rule chain views**
  - **งาน**: พอร์ต edge-specific rule chain views (root + default)
  - **📁 Files**: `ui-next/src/app/(main)/edges/[edgeId]/rule-chains/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/pages/edge/`
  - **🎯 Acceptance**: edge rule chain view ทำงานได้

### 🎯 Phase 6 — Acceptance Criteria (ผ่านเมื่อ)
1. ✅ import rule chain JSON → render → save → activate → export ครบ flow
2. ✅ rule node config ทุกประเภททำงานได้
3. ✅ parity test rule chain save/activate API ผ่าน
4. ✅ edge rule chain views ทำงานได้

---

# Phase 7 — SCADA Editor + i18n ไทย + Polish

> **เป้าหมาย**: SCADA editor ครบ + ภาษาไทย UI + performance/a11y audit + ลบ Angular เดิมได้
>
> **สถานะ**: ⬜ ยังไม่เริ่ม
>
> **Estimated files**: ~50 ไฟล์ (SCADA) + การแก้ไขทั่วโปรเจกต์

### Sub-phases

- [ ] **7.1 — SCADA symbol editor**
  - **งาน**: พอร์ต SCADA symbol authoring tool (SVG editor + metadata layer 1965 บรรทัดใน models)
  - **📁 Files**: `ui-next/src/feature-components/scada-symbol-editor/`, `ui-next/src/app/(main)/scada-symbols/`
  - **🔗 ParityEngine**: `ui-ngx/src/app/modules/home/pages/scada-symbol/`, `components/widget/lib/scada/scada-symbol.models.ts`
  - **🎯 Acceptance**: create/edit/save SCADA symbol ได้ + render ใน widget ได้

- [ ] **7.2 — แปล `locale.constant-th_TH.json`**
  - **งาน**: แปล priority keys (ที่ใช้ในส่วนที่ ship แล้ว) เป็นภาษาไทย — เริ่มจาก auth/home/device/dashboard
  - **📁 Files**: `ui-next/public/locale/locale.constant-th_TH.json`
  - **🎯 Acceptance**: สลับภาษาไทย → ส่วนที่แปลแล้วเป็นไทย, ส่วนที่ยังไม่แปล fallback อังกฤษ

- [ ] **7.3 — Performance audit**
  - **งาน**: bundle splitting, lazy hydration, code editor lazy load, tree-shaking, image optimization
  - **📁 Files**: `ui-next/next.config.ts` (webpack/turbopack config), route files
  - **🎯 Acceptance**: Lighthouse score ≥ Angular เดิม; initial JS bundle ≤ 300KB

- [ ] **7.4 — Accessibility audit**
  - **งาน**: ตรวจและแก้ a11y ทุกหน้า (keyboard nav, screen reader, contrast, focus management) — ใช้ HeroUI/React Aria ช่วย
  - **📁 Files**: แก้ทั่วโปรเจกต์
  - **🎯 Acceptance**: axe-core ไม่พบ critical issue; keyboard navigation ครบทุกหน้า

- [ ] **7.5 — Migration guide + ลบ `ui-ngx/`**
  - **งาน**: เขียน migration guide สำหรับทีมที่ maintain custom widget JS + ลบ `ui-ngx/` หลัง parity ผ่าน 100%
  - **📁 Files**: `ui-next/MIGRATION.md`, ลบ `ui-ngx/`
  - **⚠️ Risk**: ก่อนลบต้อง (1) commit `ui-ngx/` ในสถานะปัจจุบัน, (2) tag git release `legacy/ui-ngx-final-snapshot-v4.3.1`, (3) สร้าง branch `archive/ui-ngx-pre-decommission` เก็บไว้เทียบในอนาคต
  - **🎯 Acceptance**: `ui-ngx/` ลบแล้ว build ผ่าน + parity test ผ่าน + มี branch สำรองถึง 1 ปี

- [ ] **7.6 — Production build + Maven integration**
  - **งาน**: ตั้งค่า `next build` production + แก้ `ui-ngx/pom.xml` → `ui-next/pom.xml` ที่รัน build และ copy output ไป `target/`
  - **📁 Files**: `ui-next/package.json` (script `build:prod`), `ui-next/pom.xml`
  - **🔗 ParityEngine**: `ui-ngx/pom.xml` (frontend-maven-plugin + Node 22.18 + Yarn 1.22)
  - **🎯 Acceptance**: `mvn install` build frontend ได้ + Java backend serve ได้

### 🎯 Phase 7 — Acceptance Criteria (ผ่านเมื่อ)
1. ✅ SCADA editor ทำงานครบ flow
2. ✅ แปลภาษาไทย priority keys ครบ
3. ✅ Lighthouse score ≥ Angular เดิม; bundle ≤ 300KB
4. ✅ axe-core ไม่มี critical issue
5. ✅ `ui-ngx/` ลบแล้ว build และ parity test ผ่าน
6. ✅ `mvn install` build frontend + serve ผ่าน

---

# Cross-Phase Risk Register

(ดูรายละเอียดเต็มที่ design doc Section 9)

| # | ความเสี่ยง | Phase ที่กระทบ | ระดับ | แผนจัดการ |
|---|---|---|---|---|
| R1 | `GlobalHttpInterceptor` ทำหน้าที่เยอะ | 1.6 | สูง | Split chain, logic parity |
| R2 | `InterceptorHttpParams` hack | 1.2 | กลาง | Migrate → `HttpContext` |
| R3 | `AuthService` god service | 1.5 | สูง | Split, behavior parity |
| R4 | `NotificationWebsocketService` dead proxy | 1.4 | ต่ำ | Merge |
| R5 | jQuery dependency | 2.5 | กลาง | ถอด |
| R6 | Theme compile-time SCSS | 0.2 | กลาง | Runtime CSS variables |
| R7 | Token expiry client-side | 1.5 | ต่ำ | คงไว้ parity |
| R8 | SystemJS module registry | 5.5 | สูงมาก | คงไว้ + port |
| R9 | refresh retry infinite loop | 1.6 | กลาง | Guard + retry count |
| R10 | ขนาด codebase | ทั้งหมด | สูง | Phase ต่อ phase ship-able |
| R11 | Effects dispatch:false | 1.8 | ต่ำ | Explicit call |
| R12 | URL string template | 1.3 | ต่ำ | URLSearchParams |
| R13 | Query param auth | 1.5 | กลาง | คงไว้ + warn |

---

# Workflow — วิธีเริ่มแต่ละ Phase

```
1. เลือก Phase ที่จะเริ่ม (เริ่มจาก Phase 0 เสมอ)

2. เรียก writing-plans skill เพื่อเขียน implementation plan ละเอียดของ phase นั้น
   → output: docs/superpowers/plans/2026-XX-XX-phase-N-implementation.md
   → plan นี้ลงรายละเอียดขั้นตอนทำจริง, file-by-file, code snippet

3. เรียก executing-plans skill เพื่อ implement plan ที่เขียน
   → implement + test + verify ตาม acceptance criteria

4. อัปเดต checkbox ในไฟล์นี้ (- [ ] → - [x])

5. parity test + E2E test ผ่าน → ไป phase ถัดไป
```

---

# Glossary (คำศัพท์เฉพาะ)

| คำ | ความหมาย |
|---|---|
| **ParityEngine** | ไฟล์/component ใน Angular เดิมที่ใช้เป็นต้นแบบในการพอร์ต |
| **Behavior parity** | พฤติกรรมเหมือนเดิม (UI + protocol) |
| **Sub-phase** | หน่วยย่อยใน phase (1 phase มีหลาย sub-phase) |
| **Acceptance criteria** | เกณฑ์ที่ต้องผ่านก่อนถือว่า phase/sub-phase เสร็จ |
| **Clean break** | แทนที่ Angular ทั้งหมด (ไม่ใช่ migration ทีละส่วน) |
| **Bridge** | layer ที่เชื่อม RxJS Observable เข้ากับ React (`@react-rxjs/core`) |
| **Custom widget JS** | widget ที่ผู้ใช้เขียนเป็น JavaScript แล้วใช้ SystemJS โหลด runtime |
| **SystemJS** | module loader ที่ ThingsBoard ใช้สำหรับ custom widget JS |

---

# changelog

| วันที่ | เปลี่ยนแปลง |
|---|---|
| 2026-07-12 | สร้างไฟล์ — ร่าง phase 0-7 พร้อม sub-phase และ acceptance criteria |
| 2026-07-12 | 🟢 Phase 0 เสร็จสมบูรณ์ — ทุก acceptance criteria ผ่าน (Tailwind v4 + next-intl v4 deviations จากแผนเดิม ตามความจำเป็นจริงของ dependencies) |
