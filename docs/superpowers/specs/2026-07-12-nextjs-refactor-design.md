# Design Spec — การ Refactor Frontend ThingsBoard → Next.js 16 + HeroUI

> **เอกสารฉบับสมบูรณ์ (Design Document)**
> วันที่สร้าง: 2026-07-12
> สถานะ: Approved (อนุมัติแล้ว — พร้อมเขียน implementation plan)
> เจ้าของเอกสาร: ทีม Refactor Frontend

เอกสารฉบับนี้เป็นข้อกำหนดการออกแบบ (design specification) สำหรับการแปลงส่วนติดต่อผู้ใช้ (frontend) ของ ThingsBoard จาก Angular 20.3 เป็น Next.js 16 + HeroUI + TypeScript เพื่อให้ทีมพัฒนาใช้เป็นข้อตกลงร่วม (single source of truth) ตลอดการ refactor

---

## 1. เป้าหมายและขอบเขต (Goals & Scope)

### 1.1 เป้าหมายหลัก
1. **เปลี่ยน UI/UX** จาก Angular Material → HeroUI v3 + Tailwind CSS เพื่อให้ดูทันสมัยและสอดคล้องกับ design system ใหม่
2. **รักษาพฤติกรรม (behavior parity) 100%** — ทุกฟังก์ชันการทำงาน (CRUD, dashboard, widget, rule chain, telemetry, auth, i18n) ต้องทำงานเหมือน Angular เดิมจากมุมมองผู้ใช้และฝั่ง protocol/API
3. **เพิ่มเอกสารภาษาไทย** — comment และ JSDoc ภาษาไทยทุกไฟล์ที่ refactor ครอบคลุมทุก symbol พร้อมเหตุผล
4. **เพิ่มภาษาไทยใน UI** — โครงสร้างพร้อมแปลและมี locale ไทยเริ่มต้น

### 1.2 ขอบเขตที่ครอบคลุม
- ส่วน frontend ทั้งหมดของ ThingsBoard (codebase `ui-ngx/` ปัจจุบัน)
- ครอบคลุมทุก layer: app shell, feature pages, shared components, widget engine, rule chain editor, SCADA editor, dashboard editor
- ครอบคลุมทุก subsystem: HTTP services, WebSocket, auth, i18n, theming, notifications

### 1.3 ขอบเขตที่ **ไม่** ครอบคลุม
- Backend Java ของ ThingsBoard — ไม่แตะ API contract ฝั่ง server
- Database schema
- Infrastructure deployment (เว้นแต่ Maven integration ฝั่ง build)

---

## 2. การวิเคราะห์ Codebase ปัจจุบัน (Current State Analysis)

### 2.1 ตัวเลขสำคัญของ Angular codebase
| มิติ | จำนวน | หมายเหตุ |
|---|---|---|
| ไฟล์ TypeScript ทั้งหมด | ~1,672 | ใน `ui-ngx/src/` |
| Angular components | ~967 | `.component.ts` |
| HTML templates | 934 | `.html` |
| SCSS files | 509 | `.scss` |
| บรรทัด TypeScript | ~300,000 | รวม widgets |
| Shared components | ~130 | `shared/components/` |
| Model files | ~210 | `shared/models/` |
| Pipes | 17 | `shared/pipe/` |
| HTTP services | ~40 | `core/http/*.service.ts` |
| Widget engine files | ~500 | `modules/home/components/widget/lib/` |
| Rule chain files | 95 | `pages/rulechain/` + `components/rule-chain/` |
| Feature pages | 30 | `modules/home/pages/` |
| Entity table resolvers | 24 | สำหรับ generic CRUD table |

### 2.2 Stack ปัจจุบัน
- **Framework**: Angular 20.3.17 (module-based, ไม่ใช่ standalone)
- **UI Library**: Angular Material 20.2.14 + CDK
- **State**: NgRx 20.1.0 (ใช้น้อย — เพียง 4 slices: `load`, `auth`, `settings`, `notification`)
- **Data fetching**: RxJS 7.8 services + `@Injectable` HttpClient
- **Styling**: SCSS + Tailwind 3.4.19 (ผสมกับ Angular Material)
- **i18n**: `@ngx-translate/core` 17 + messageformat-compiler
- **Build**: Angular CLI 20.3 + esbuild ผ่าน `@angular-builders/custom-esbuild`
- **Auth**: `@auth0/angular-jwt` (JWT helper)
- **Charting**: ECharts 5.5.2-TB (fork) + Flot (legacy) + canvas-gauges + SVG.js
- **Rule Chain**: `ngx-flowchart` (ThingsBoard fork)
- **Maps**: Leaflet 1.9.4 + maplibre-gl 5.2.0
- **Code editors**: ACE 1.43.6 + TinyMCE 6.8.6

### 2.3 Subsystems ที่ซับซ้อนสูง (ต้องระวังเป็นพิเศษ)
1. **Widget Engine** (~500 ไฟล์) — runtime rendering + SystemJS module registry ที่ให้ custom widget JS ภายนอก `import` โมดูลภายในแอปได้ตอน runtime
2. **Realtime Telemetry** — `widget-subscription.ts` (1700 บรรทัด) + entity-data-subscription + data-aggregator ที่จัดการ WebSocket paging/aggregation
3. **Rule Chain Editor** — graph editor บน `ngx-flowchart` (95 ไฟล์)
4. **Dashboard Page Editor** — multi-state/multi-layout editor (1842 บรรทัด)
5. **SCADA Symbol Editor** — SVG authoring tool (1965 บรรทัดใน models)
6. **Generic CRUD Framework** — `EntitiesTableComponent` driven by `EntityTableConfig` (24 resolvers)
7. **GlobalHttpInterceptor** — interceptor เดียวทำหลายหน้าที่ (auth + error + retry + loading + notification)
8. **AuthService** — "god service" 657 บรรทัดผสม HTTP + routing + localStorage + dialog + store

---

## 3. Decision Matrix (การตัดสินใจหลัก)

การตัดสินใจทั้งหมดผ่านการปรึกษากับเจ้าของโปรเจกต์แล้ว และถือเป็นข้อตกลง (locked decision)

| มิติ | เลือก | ทางเลือกที่ตัดทิ้ง | เหตุผล |
|---|---|---|---|
| **Framework** | Next.js 16 (App Router, React 19.2) | — | ตาม requirement |
| **UI Library** | HeroUI v3.2.2 (Tailwind + React Aria) | shadcn/ui, MUI, Ant Design | ตาม requirement |
| **Migration Strategy** | Clean break (แทนที่ `ui-ngx`) | Strangler fig, folder ขนาน | ตาม requirement |
| **State/Data Layer** | คง RxJS services + `@react-rxjs/core` bridge | Redux Toolkit, TanStack Query only, Server Components | รักษา logic เดิม → ลดความเสี่ยง parity และลด scope การเขียนใหม่ |
| **Charting/Widgets** | คง ECharts (fork) + Flot + canvas-gauges + SVG.js | Recharts, Visx, Nivo | รักษา widget parity 100% — การเปลี่ยน chart lib เท่ากับ reimplement widget ทุกตัว |
| **Rule Chain Editor** | React Flow (`@xyflow/react`) | AntV X6, ห่อ ngx-flowchart | de-facto React standard, API ใกล้เคียง ngx-flowchart |
| **Testing** | Vitest (unit) + Playwright (E2E + parity) | Jest, Cypress | สมดุล + ใช้ parity tests เป็นเครื่องยืนยัน behavior |
| **i18n** | `next-intl` + เพิ่ม `th_TH` | react-i18next, i18next | ผสานกับ App Router ดีที่สุด |
| **Comment Density** | เข้มข้นเต็ม (ทุก symbol + file + inline) | moderate, minimal | ตาม requirement "ครอบคลุม + เข้าใจง่าย + เหตุผล" |

---

## 4. หลักการสถาปัตยกรรม (Architecture Principles)

### 4.1 Behavior Parity เป็นกฎเหล็ก
**นิยาม**: ทุก interaction ที่ผู้ใช้ทำกับ Angular เดิม ต้องได้ผลลัพธ์เหมือนกันใน Next.js ใหม่ ทั้งที่ฝั่ง UI และฝั่ง protocol (request/response)

**หมวดที่ต้อง parity**:
- **HTTP**: URL, method, headers (`X-Authorization: Bearer <token>` ไม่ใช่ `Authorization` มาตรฐาน), query params, body shape, pagination format (`PageLink.toQuery()`), `Content-Type`
- **WebSocket**: auth command, subscription commands (`EntityDataCmd`, `AlarmDataCmd`, ฯลฯ), reconnect logic, idle timeout (90s), cmdId allocation
- **Auth flow**: login → token storage → refresh → 401 retry → 429 backoff → 409 conflict dialog → logout
- **Error mapping**: HTTP status → user-facing message (ใช้ `serverErrorCodesTranslations` map เดิม)
- **i18n keys**: ทุก translation key คงเดิม (เพิ่มแค่ไฟล์ `th_TH`)
- **Route paths**: URL structure คงเดิม (เพื่อ bookmark/deeplink parity)

### 4.2 Port ตรง (Direct Port) vs Re-implement
- **Port ตรง** (เอา logic มาใช้ใหม่แทบไม่ต้องแก้): pure TS models, HTTP service bodies, WebSocket logic, widget subscription algorithms, error code map
- **Re-implement** (เขียนใหม่บน React idiom): components, templates, forms, routing, DI → React hooks/context

### 4.3 แต่ละ Phase ต้อง "Ship-able"
ทุก phase จบต้องมีแอปรันได้และผู้ใช้ใช้งาน feature ที่ migrate แล้วได้จริง แม้บางส่วนยังเป็นตัวเก่า — กั้นความเสี่ยงไม่ให้ทั้งแอปพังระหว่างทำ

### 4.4 ภาษาไทยเป็น First-Class
- Comment/JSDoc ภาษาไทบทุกไฟล์ (บังคับด้วย ESLint)
- UI i18n ภาษาไทยพร้อมใช้ (ถึงแม้แปลไม่ครบ 100% ตอนเริ่ม)

---

## 5. กฎการตั้งชื่อ (Naming Conventions) — ใช้ทั่วโปรเจกต์

### 5.1 หลักการ
**ตั้งชื่อให้สื่อความหมายเต็มรูปแบบ ห้ามย่อ ห้าม short name**

วัตถุประสงค์: ให้ผู้อ่านโค้ดเข้าใจหน้าที่ของสิ่งนั้นได้ทันทีโดยไม่ต้องสืบค้น ลดความคลุมเครือและการตีความผิด

### 5.2 กฎเฉพาะ
- **Folder / File**: `kebab-case` เต็มรูปแบบ
  - ✅ `entity-table-config.ts`, `rule-chain-editor/`, `widget-subscription-service.ts`
  - ❌ `etc.ts`, `rc-editor/`, `ws-svc.ts`
- **Variable / Function**: `camelCase` เต็มรูปแบบ
  - ✅ `deviceProfileConfiguration`, `websocketReconnectInterval`
  - ❌ `devProfCfg`, `wsRecon`
- **Class / Interface / Type / Component**: `PascalCase` เต็มรูปแบบ
  - ✅ `EntityTableConfig`, `RuleChainEditorComponent`, `WidgetSubscriptionService`
  - ❌ `ETC`, `RCEComp`, `WSSvc`
- **React Component files**: `kebab-case.tsx` (เช่น `entity-table.tsx`) และ component name เป็น `PascalCase` (`EntityTable`)
- **Constants**: `UPPER_SNAKE_CASE` สำหรับค่าคงที่ config-level (`WEBSOCKET_IDLE_TIMEOUT_MS`)

### 5.3 ข้อยกเว้นที่อนุญาต
**Acronyms มาตรฐานอุตสาหกรรม** (ไม่นับว่าเป็นการย่อที่ต้องหลีกเลี่ยง):
- `HTTP`, `HTTPS`, `URL`, `URI`, `API`, `WS` (WebSocket), `UI`, `UX`
- `JWT`, `OAuth`, `SSO`, `2FA`
- `ID` (identifier), `UUID`
- `IoT`, `MQTT`, `CoAP`, `LwM2M`, `SNMP` (protocol ทาง IoT)
- `SVG`, `SCADA`, `RPC`, `OTA`
- `JSON`, `XML`, `CSV`

**Protocol-level terms** ที่ฝั่ง backend/protocol ใช้ — คงเดิมเพื่อ parity แต่ **ต้องมี JSDoc** อธิบาย:
- `cmdId` (command ID ใน WebSocket subscription)
- `subId` (subscription ID)
- `entityId`, `tenantId`, `customerId` (เป็น domain term ที่ทีมคุ้นเคยอยู่แล้ว)

---

## 6. กฎ Comment / JSDoc ภาษาไทย — บังคับทุกไฟล์

### 6.1 File-level JSDoc (ทุกไฟล์ `.ts` / `.tsx`)
วางที่ด้านบนสุดของไฟล์ ก่อน import statements

```typescript
/**
 * @fileoverview
 * ไฟล์นี้ทำหน้าที่จัดการการเชื่อมต่อ WebSocket สำหรับรับ telemetry แบบ realtime
 * จาก backend ของ ThingsBoard (endpoint: /api/ws/plugins/telemetry).
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/ws/telemetry-websocket.service.ts
 * การเปลี่ยนแปลงหลัก: ถอด @Injectable, เปลี่ยน DI เป็น factory function,
 * คง RxJS Observable API ไว้ทั้งหมดเพื่อ parity ของ subscription lifecycle
 *
 * @module core/websocket
 */
```

### 6.2 Symbol-level JSDoc (ทุก exported symbol)
ใช้กับ: `function`, `class`, `interface`, `type`, `enum`, `React component`, `custom hook`

```typescript
/**
 * สร้าง subscription สำหรับรับข้อมูล telemetry แบบ realtime ของ entity ที่ระบุ
 * โดยจะส่ง EntityDataCmd ผ่าน WebSocket และ return Observable ที่ emit ข้อมูล
 * ทุกครั้งที่มี update จาก server
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: TelemetryWebsocketService.subscribeForEntityData()
 *
 * @param entityDataCmd - คำสั่ง subscription ที่จะส่งไปยัง server
 * @param entityDataCmd.cmdId - identifier ของ subscription (ต้อง unique ต่อ connection)
 * @returns Observable ที่ emit EntityDataUpdate ทุกครั้งที่ server push ข้อมูล
 *
 * @reason
 * ใช้ RxJS Subject ภายในเพราะต้องการ multiplex หลาย subscriber ต่อหนึ่ง WebSocket
 * command และทำ cleanup อัตโนมัติเมื่อ subscriber สุดท้าย unsubscribe
 */
```

### 6.3 Inline Comments (ภาษาไทย)
ใส่ทุกที่ที่ logic ซับซ้อน ไม่ชัดเจนจากชื่อตัวแปร หรือเป็น workaround

```typescript
// รอ 90 วินาที ก่อนปิด WebSocket ถ้าไม่มี subscriber มาใช้งาน
// เหตุผล: ลดการเปิด/ปิด connection ถี่เกินไปเมื่อ user สลับ widget ระหว่าง dashboard
const idleTimeoutInMilliseconds = 90_000;
```

### 6.4 CI Enforcement
- **ESLint custom rule**: ไฟล์ `.ts/.tsx` ทุกไฟล์ต้องมี file-level JSDoc ขอตัวน้อย 1 บรรทัด
- **ESLint rule**: exported symbol ทุกตัวต้องมี JSDoc
- **Pre-commit hook**: ตรวจด้วย `lint-staged`
- **Build check**: `next build` จะ fail ถ้า ESLint ไม่ผ่าน

---

## 7. โครงสร้าง Directory ของ `ui-next/`

```
thingsboard/
├── ui-ngx/                          # [LEGACY] Angular เดิม — เก็บไว้เป็น read-only parity reference
├── ui-next/                         # [NEW] Next.js 16 app
│   ├── src/
│   │   ├── app/                     # Next.js App Router (file-system routing)
│   │   │   ├── layout.tsx           # Root layout (providers, fonts, theme)
│   │   │   ├── page.tsx             # Root page (redirect ไป /home หรือ /login)
│   │   │   ├── (authentication)/    # Route group: หน้า auth (ไม่มี home shell)
│   │   │   │   ├── login/
│   │   │   │   ├── two-factor/
│   │   │   │   └── oauth-callback/
│   │   │   ├── (main)/              # Route group: home shell + feature pages
│   │   │   │   ├── layout.tsx       # Home shell (sidebar, header, breadcrumb)
│   │   │   │   ├── home/            # Home dashboard / landing
│   │   │   │   ├── devices/         # Device management
│   │   │   │   ├── assets/
│   │   │   │   ├── asset-profiles/
│   │   │   │   ├── device-profiles/
│   │   │   │   ├── customers/
│   │   │   │   ├── tenants/
│   │   │   │   ├── tenant-profiles/
│   │   │   │   ├── users/
│   │   │   │   ├── edges/
│   │   │   │   ├── entity-views/
│   │   │   │   ├── dashboards/
│   │   │   │   ├── rule-chains/
│   │   │   │   ├── alarms/
│   │   │   │   ├── audit-logs/
│   │   │   │   ├── api-usage/
│   │   │   │   ├── notifications/
│   │   │   │   ├── calculated-fields/
│   │   │   │   ├── version-control/
│   │   │   │   ├── scada-symbols/
│   │   │   │   ├── widgets/
│   │   │   │   ├── ota-updates/
│   │   │   │   ├── queues/
│   │   │   │   ├── oauth-clients/
│   │   │   │   ├── two-factor-providers/
│   │   │   │   ├── ai-models/
│   │   │   │   ├── api-keys/
│   │   │   │   ├── mobile-applications/
│   │   │   │   ├── gateways/
│   │   │   │   └── profile/         # User profile + settings
│   │   │   └── dashboard-viewer/    # Public dashboard viewer (ไม่มี shell)
│   │   │
│   │   ├── core/                    # Layer พื้นฐาน (port จาก Angular core/)
│   │   │   ├── http/                # 40 API services (RxJS) — port ตรง
│   │   │   │   ├── http-client-factory.ts    # แทน Angular HttpClient
│   │   │   │   ├── http-utils.ts              # defaultHttpOptionsFromConfig port
│   │   │   │   ├── interceptor-chain.ts       # auth → error → loading → notification
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── authentication-interceptor.ts
│   │   │   │   │   ├── error-handling-interceptor.ts
│   │   │   │   │   ├── loading-indicator-interceptor.ts
│   │   │   │   │   ├── rate-limit-interceptor.ts
│   │   │   │   │   └── entity-conflict-interceptor.ts
│   │   │   │   ├── device.service.ts
│   │   │   │   ├── asset.service.ts
│   │   │   │   ├── ... (40 services)
│   │   │   │   └── README.md
│   │   │   ├── websocket/           # WebSocket services (RxJS) — port + refactor
│   │   │   │   ├── websocket-service.ts           # abstract base port
│   │   │   │   ├── telemetry-websocket-service.ts # concrete WS (รวม notification แล้ว)
│   │   │   │   └── websocket-constants.ts         # WS_IDLE_TIMEOUT_MS, RECONNECT_INTERVAL_MS
│   │   │   ├── authentication/      # AuthService split
│   │   │   │   ├── auth-service.ts              # main orchestrator
│   │   │   │   ├── token-storage.ts             # localStorage static methods แยกออกมา
│   │   │   │   ├── auth-redirect.ts             # redirect URL logic แยกออกมา
│   │   │   │   ├── jwt-helper.ts                # decode JWT
│   │   │   │   ├── public-access.ts             # publicId / deeplink token flow
│   │   │   │   └── two-factor-auth.ts
│   │   │   ├── widget-subscription/  # widget subscription algorithms
│   │   │   │   ├── widget-subscription.ts           # port 1700 บรรทัด
│   │   │   │   ├── entity-data-subscription.ts
│   │   │   │   ├── alarm-data-subscription.ts
│   │   │   │   ├── data-aggregator.ts
│   │   │   │   └── alias-controller.ts
│   │   │   ├── shared-state/        # 4 slices → @react-rxjs/core shared state
│   │   │   │   ├── authentication-state.ts         # auth user/JWT state
│   │   │   │   ├── settings-state.ts               # UI settings
│   │   │   │   ├── loading-indicator-state.ts      # global HTTP loading
│   │   │   │   ├── notification-state.ts           # toast/snackbar queue
│   │   │   │   └── store-context.tsx               # React provider
│   │   │   ├── internationalization/
│   │   │   │   ├── i18n-config.ts                  # next-intl setup
│   │   │   │   ├── locale-loader.ts
│   │   │   │   ├── missing-translation-handler.ts  # parity TbMissingTranslationHandler
│   │   │   │   └── supported-languages.ts          # auto-discovery เหมือน esbuild plugin
│   │   │   ├── error-handling/
│   │   │   │   ├── server-error-codes.ts           # error code → i18n key map
│   │   │   │   └── http-error-parser.ts            # parseHttpErrorMessage port
│   │   │   ├── services/             # cross-cutting services
│   │   │   │   ├── dialog-service.ts              # confirm/alert/forbidden
│   │   │   │   ├── toast-notification-service.ts
│   │   │   │   └── utils-service.ts
│   │   │   └── README.md
│   │   │
│   │   ├── shared/                  # Shared library (port จาก shared/)
│   │   │   ├── components/          # 130 components → HeroUI-based React components
│   │   │   │   ├── button/
│   │   │   │   ├── card/
│   │   │   │   ├── input/
│   │   │   │   ├── dialog/
│   │   │   │   ├── entity-autocomplete/
│   │   │   │   ├── json-editor/
│   │   │   │   ├── javascript-function-editor/
│   │   │   │   ├── css-editor/
│   │   │   │   ├── svg-editor/
│   │   │   │   ├── protobuf-editor/
│   │   │   │   ├── markdown-editor/
│   │   │   │   ├── time-window-picker/
│   │   │   │   ├── aggregation-picker/
│   │   │   │   ├── breadcrumbs/
│   │   │   │   ├── navigation-tree/
│   │   │   │   ├── key-value-map-editor/
│   │   │   │   ├── filters-editor/
│   │   │   │   ├── popover/
│   │   │   │   ├── code-editor-ace/        # ACE wrapper
│   │   │   │   ├── rich-text-editor-tinymce/  # TinyMCE wrapper
│   │   │   │   └── ... (130 components)
│   │   │   ├── entity-framework/    # Generic CRUD framework (หัวใจของทุก list page)
│   │   │   │   ├── entity-table.tsx              # <EntityTable config={...} />
│   │   │   │   ├── entity-details-panel.tsx      # <EntityDetailsPanel config={...} />
│   │   │   │   ├── entity-table-config.ts        # EntityTableConfig type port
│   │   │   │   ├── entity-table-hook.ts          # useEntityTable(config)
│   │   │   │   └── README.md
│   │   │   ├── models/              # 210 model files (pure TS) — port ตรง
│   │   │   │   ├── entity-models/
│   │   │   │   ├── telemetry-models/
│   │   │   │   ├── time-models/
│   │   │   │   ├── widget-models/
│   │   │   │   ├── rule-chain-models/
│   │   │   │   ├── alarm-models/
│   │   │   │   ├── maps-models/
│   │   │   │   └── ...
│   │   │   ├── utilities/           # pure functions (port จาก utils.ts)
│   │   │   ├── pipes-as-hooks/      # 17 pipes → React hooks/utilities
│   │   │   │   ├── use-date-ago.ts
│   │   │   │   ├── use-file-size.ts
│   │   │   │   ├── use-short-number.ts
│   │   │   │   ├── use-highlight.ts
│   │   │   │   └── ...
│   │   │   └── public-api.ts        # barrel export (parity กับ shared/public-api.ts)
│   │   │
│   │   ├── widgets/                 # Widget engine (port + React wrapper)
│   │   │   ├── library/             # 423 widget files port ตรง (เป็น pure TS class ที่ render ผ่าน ref)
│   │   │   │   ├── chart/
│   │   │   │   ├── cards/
│   │   │   │   ├── maps/
│   │   │   │   ├── maps-legacy/
│   │   │   │   ├── rpc/
│   │   │   │   ├── scada/
│   │   │   │   ├── indicator/
│   │   │   │   ├── count/
│   │   │   │   ├── button/
│   │   │   │   ├── entity/
│   │   │   │   ├── date-range-navigator/
│   │   │   │   ├── trip-animation/
│   │   │   │   ├── weather/
│   │   │   │   └── home-page/
│   │   │   ├── subscription/        # widget ↔ subscription bridge
│   │   │   │   ├── widget-component.tsx          # <WidgetComponent widget={...} />
│   │   │   │   ├── widget-lifecycle.ts
│   │   │   │   └── widget-css-variables.ts
│   │   │   ├── runtime-registry/    # SystemJS module registry (จำเป็นสำหรับ custom widget JS)
│   │   │   │   ├── modules-map.ts                # port จาก modules-map.ts (~770 บรรทัด)
│   │   │   │   ├── systemjs-config.ts
│   │   │   │   └── angular-compat-patches.ts     # monkey-patch layer (โครงสร้างเดิม)
│   │   │   └── README.md
│   │   │
│   │   ├── feature-components/      # home components (port จาก modules/home/components/)
│   │   │   ├── dashboard-page/      # Dashboard editor (1842 บรรทัด → แบ่ง sub-component)
│   │   │   ├── rule-chain/          # React Flow-based editor
│   │   │   │   ├── rule-chain-canvas.tsx
│   │   │   │   ├── rule-node-config-dialog.tsx
│   │   │   │   ├── custom-nodes/
│   │   │   │   └── custom-edges/
│   │   │   ├── profile/
│   │   │   ├── filter/
│   │   │   ├── alias/
│   │   │   ├── relation/
│   │   │   ├── attribute/
│   │   │   ├── event/
│   │   │   ├── audit-log/
│   │   │   ├── version-control/
│   │   │   ├── notification/
│   │   │   ├── calculated-fields/
│   │   │   ├── ai-model/
│   │   │   ├── api-key/
│   │   │   ├── alarm-rules/
│   │   │   ├── scada-symbol-editor/
│   │   │   └── ...
│   │   │
│   │   └── styles/                  # Global styles
│   │       ├── globals.css           # Tailwind directives + CSS reset
│   │       ├── brand-tokens.css      # TB brand colors เป็น CSS variables
│   │       ├── heroui-theme.config.ts # HeroUI theme mapping
│   │       └── material-interop.css  # (ถ้าจำเป็น) ความเข้ากันได้กับ component เก่า
│   │
│   ├── public/
│   │   ├── locale/                  # i18n JSON (port + th_TH)
│   │   │   ├── locale.constant-en_US.json   # ~10,000 keys, 587KB
│   │   │   ├── locale.constant-th_TH.json   # ใหม่ — เริ่มจาก copy en_US
│   │   │   └── ... (27 ภาษา)
│   │   ├── static/
│   │   └── images/
│   │
│   ├── tests/
│   │   ├── unit/                    # Vitest specs (*.test.ts / *.test.tsx)
│   │   │   ├── core/
│   │   │   ├── shared/
│   │   │   └── widgets/
│   │   ├── end-to-end/              # Playwright specs (*.spec.ts)
│   │   │   ├── authentication/
│   │   │   ├── devices/
│   │   │   ├── dashboards/
│   │   │   └── rule-chains/
│   │   └── parity/                  # Contract tests (Angular vs Next.js)
│   │       ├── fixtures/            # captured traffic
│   │       ├── http-parity.test.ts
│   │       ├── websocket-parity.test.ts
│   │       └── auth-flow-parity.test.ts
│   │
│   ├── .storybook/                  # (optional) Storybook สำหรับ dev showcase
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts           # HeroUI preset + TB brand tokens
│   ├── tsconfig.json                # strict mode, path aliases
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   └── README.md
│
└── ... (ส่วนอื่นของ ThingsBoard)
```

### 7.1 Path Aliases (tsconfig.json)
```json
{
  "compilerOptions": {
    "paths": {
      "@app/*":          ["./src/app/*"],
      "@core/*":         ["./src/core/*"],
      "@shared/*":       ["./src/shared/*"],
      "@widgets/*":      ["./src/widgets/*"],
      "@features/*":     ["./src/feature-components/*"],
      "@public-locale":  ["./public/locale"]
    }
  }
}
```
(คง parity กับ Angular aliases `@app`, `@core`, `@shared`, `@modules/@home` → `@features`)

---

## 8. Parity Strategy — หัวใจของ "การทำงานต้องเหมือนเดิม"

### 8.1 สถาปัตยกรรมการทดสอบ Parity

```
┌──────────────────────────────────────────────────────────────┐
│            Parity Test Infrastructure                         │
│                                                              │
│  ┌────────────────┐    ┌────────────────┐                   │
│  │ Angular (old)  │    │ Next.js (new)  │                   │
│  │  ui-ngx/       │    │  ui-next/      │                   │
│  └────────┬───────┘    └────────┬───────┘                   │
│           │                      │                           │
│           ▼                      ▼                           │
│  ┌────────────────────────────────────────┐                  │
│  │     Mock ThingsBoard Backend           │                  │
│  │  (MSW / nock / Playwright route)       │                  │
│  └────────────────┬───────────────────────┘                  │
│                   │                                          │
│                   ▼                                          │
│  ┌────────────────────────────────────────┐                  │
│  │  Parity Comparator                     │                  │
│  │  - HTTP request diff (method/url/      │                  │
│  │    headers/body/params)                │                  │
│  │  - WebSocket message diff              │                  │
│  │  - Auth state transitions              │                  │
│  └────────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 ขั้นตอนการทดสอบ Parity
1. **Capture phase** (Phase 0): รัน Angular เดิม กับ mock backend แล้วบันทึก traffic ทั้งหมดเป็น fixture (HTTP request/response + WebSocket messages)
2. **Replay phase** (ทุก feature phase): รัน Next.js ใหม่ด้วยเหตุการณ์เดียวกัน แล้วเปรียบเทียบ traffic ที่ส่งออกกับ fixture
3. **Assert**: request ทุกตัวต้องเหมือนเดิม (method, URL, headers โดยเฉพาะ `X-Authorization`, query params, body shape)

### 8.3 สิ่งที่ต้อง Parity (checklist)
- [ ] HTTP method + URL path
- [ ] Header `X-Authorization: Bearer <token>` (ไม่ใช่ `Authorization`)
- [ ] Header `Content-Type`
- [ ] Query string format (`PageLink.toQuery()` → `?page=&pageSize=&textSearch=&sortProperty=&sortOrder=`)
- [ ] Request body shape (JSON)
- [ ] Pagination contract (`PageData<T>` shape)
- [ ] Error response parsing (status + `errorCode` + `message` + `timestamp`)
- [ ] WebSocket subscription commands (`cmdId`, `subId`, `entityId`, `keys`, `agg`, `startTs`, `endTs`)
- [ ] WebSocket auth command (`cmdWrapper.setAuth(token)` เป็น command แรก)
- [ ] WebSocket reconnect logic (2s interval) + idle timeout (90s)
- [ ] Auth refresh flow (401 → refresh → retry)
- [ ] Rate limit backoff (429 → `1000 + random*3000` ms)
- [ ] Conflict handling (409 → dialog)
- [ ] Forbidden handling (403 → dialog)
- [ ] i18n key parity (key เดียวกันทั้งสองฝั่ง)

---

## 9. Risk Register (สิ่งที่ต้องระวัง)

| # | ความเสี่ยง | ระดับ | แผนจัดการ |
|---|---|---|---|
| R1 | `GlobalHttpInterceptor` ทำหน้าที่เยอะ (auth + error + retry + loading + notification ในไฟล์เดียว ~207 บรรทัด) | สูง | Split เป็น interceptor chain (auth → error → loading → notification) แต่ **logic เหมือนเดิม byte-for-byte** ที่ฝั่ง output |
| R2 | `InterceptorHttpParams` เป็น hack — config ซ่อนใน `HttpParams` | กลาง | Migrate เป็น `HttpContext` (Angular 15+ pattern) หรือ custom request metadata ในฝั่ง React |
| R3 | `AuthService` god service (657 บรรทัด) | สูง | Split เป็น `token-storage.ts`, `auth-redirect.ts`, `auth-service.ts` — behavior เหมือนเดิม |
| R4 | `NotificationWebsocketService` เป็น dead proxy (delegate ทุกอย่างไป telemetry) | ต่ำ | Merge เข้า `TelemetryWebsocketService` โดยตรง — ไม่มี breaking เพราะทุก call อ้อมไป telemetry อยู่แล้ว |
| R5 | jQuery dependency (toast directive + app.component + `initCustomJQueryEvents`) | กลาง | ถอด jQuery ออก เขียนใหม่ด้วย DOM API / React |
| R6 | Theme เป็น compile-time SCSS (`.tb-default` / `.tb-dark`) | กลาง | แปลงเป็น runtime CSS variables + HeroUI theme provider — รองรับ dynamic toggle |
| R7 | Token expiry คำนวณฝั่ง client (`Date.now() + ttl*1000`) ไม่ sync server clock | ต่ำ | คงไว้เพื่อ parity (risk อยู่ใน Angular เดิมอยู่แล้ว) — แยด issue ใน risk log |
| R8 | Custom widget JS ต้อง SystemJS module registry (`modules-map.ts` ~770 บรรทัด + monkey-patch Angular core) | สูงมาก | **คง SystemJS** ไว้ — เป็นเอกลักษณ์ของ ThingsBoard ที่ custom widget สามารถ `import` โมดูลภายในแอปได้. Port `modules-map.ts` + ปรับ import ให้ export โมดูล React แทน Angular |
| R9 | `refreshTokenAndRetry` infinite loop risk | กลาง | คง logic เดิม + เพิ่ม guard (max retry count) |
| R10 | ขนาด codebase (~300k บรรทัด) → migration ใช้เวลานาน | สูง | แบ่งเป็น 8 phases, แต่ละ phase ship ได้ — ทีมยังใช้งาน Angular เดิมได้ระหว่าง migrate |
| R11 | `Effects` ทั้งหมด `dispatch: false` → debug ยาก | ต่ำ | แปลงเป็น explicit function call ใน React layer (ไม่ใช่ action chain) |
| R12 | URL building ด้วย string template ในบาง service (`/api/users?userIds=${userIds.join(',')}`) | ต่ำ | Migrate ไปใช้ `URLSearchParams` ทุกที่ที่ทำได้ |
| R13 | การส่ง password ใน query param (`loadUser` reads `?username=&password=`) | กลาง | คงไว้เพื่อ parity (embed use case) แต่เพิ่ม warning + JSDoc |

---

## 10. ลำดับการทำงานหลังเขียน Spec (Workflow)

```
[เสร็จสิ้น] Spec Writing & Self-Review
        │
        ▼
[User Review] ขอ user ตรวจทาน spec ─── (ถ้ามี feedback → แก้ → กลับมา review ใหม่)
        │
        ▼
[เสร็จสิ้น] Spec Approved
        │
        ▼
[Writing Plans] เรียก writing-plans skill เพื่อเขียน implementation plan ของ Phase 0
        │       (Phase 0 ก่อน เพราะเป็น foundation ที่ phase อื่นต้องพึ่งพา)
        ▼
[Implement Phase 0] ตาม plan
        │
        ▼
[Verify Phase 0] parity runner รันได้ + dev server รันได้
        │
        ▼
[Writing Plans] เขียน implementation plan ของ Phase 1
        │
        ▼
... (วนซ้ำทุก phase จนครบ Phase 7)
```

**กฎ**: แต่ละ phase มี implementation plan เฉพาะ (เขียนผ่าน `writing-plans` skill) ก่อนเริ่ม implement — spec ฉบับนี้เป็น "umbrella" ครอบทั้งโปรเจกต์ ส่วน plan เฉพาะ phase จะลงรายละเอียดขั้นตอนการทำจริง

---

## 11. Success Criteria (เกณฑ์ความสำเร็จของโปรเจกต์)

โปรเจกต์สำเร็จเมื่อ:

1. ✅ **Phase 0-7 ทำครบ** ตาม acceptance criteria ใน `2026-07-12-nextjs-refactor-phases.md`
2. ✅ **Parity tests ผ่าน 100%** — ทุก HTTP/WebSocket/auth flow ที่ capture จาก Angular ตรงกับ Next.js
3. ✅ **E2E tests ผ่าน** — critical user flows (login, CRUD device, view dashboard, edit rule chain) ทำงานได้
4. ✅ **Unit test coverage ≥ 70%** ของ `src/core/` และ `src/shared/`
5. ✅ **JSDoc ภาษาไทยครบทุกไฟล์** — ESLint ผ่าน
6. ✅ **UI ภาษาไทยใช้ได้** — สลับภาษาไทยได้ แม้แปลยังไม่ครบ 100%
7. ✅ **Production build ผ่าน** — `next build` ไม่มี error/warning
8. ✅ **`ui-ngx/` ลบได้** — ไม่จำเป็นต้องอ้างอิงแล้ว
9. ✅ **Maven integration ทำงาน** — `pom.xml` build frontend ได้
10. ✅ **Performance audit ผ่าน** — Lighthouse score ≥ Angular เดิม

---

## 12. เอกสารอ้างอิง (References)

- ThingsBoard Angular source: `D:\Thingsboard\thingsboard-4.3.1 - refactor\ui-ngx\`
- [Next.js 16 — Official Blog Post](https://nextjs.org/blog/next-16)
- [HeroUI Official Site](https://www.heroui.com/)
- [HeroUI v3 Release Notes](https://www.heroui.com/docs/react/releases/v3-0-0)
- [React Flow (@xyflow/react)](https://reactflow.dev/)
- [@react-rxjs/core](https://react-rxjs.org/)
- [next-intl](https://next-intl-docs.vercel.app/)
- Phase breakdown: [`./2026-07-12-nextjs-refactor-phases.md`](./2026-07-12-nextjs-refactor-phases.md)

---

## ภาคผนวก A — ตัวอย่าง File-level JSDoc แบบเต็ม

```typescript
/**
 * @fileoverview
 * ไฟล์นี้ทำหน้าที่ให้บริการ HTTP สำหรับจัดการข้อมูล Device ในระบบ ThingsBoard
 * (สร้าง/อ่าน/แก้ไข/ลับ Device และ attributes ที่เกี่ยวข้อง).
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/http/device.service.ts
 * การเปลี่ยนแปลงหลัก:
 *   - ถอด @Injectable({providedIn: 'root'}) decorator
 *   - เปลี่ยน constructor injection เป็น factory function ที่รับ HttpClient instance
 *   - คง return type เป็น RxJS Observable ทุก method เพื่อ parity ของ caller code
 *   - คง defaultHttpOptionsFromConfig() pattern สำหรับ interceptor config
 *
 * @reason
 * คง RxJS Observable เพราะทุก component ที่เรียกใช้ (รวมถึง widget subscription layer)
 * อ้างอิงจาก stream lifecycle — การเปลี่ยนเป็น Promise จะกระทบ caller หลายร้อยจุด
 * และเพิ่มความเสี่ยง parity
 *
 * @module core/http
 */

import { Observable } from 'rxjs';
import { HttpClient } from '@core/http/http-client-factory';
import { defaultHttpOptionsFromConfig, RequestConfig } from '@core/http/http-utils';
import { Device, DeviceInfo } from '@shared/models/entity-models/device-model';
import { PageLink } from '@shared/models/page-link-model';
import { PageData } from '@shared/models/page-data-model';

/**
 * Factory function สร้าง device service instance.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก constructor ของ DeviceService (Angular DI)
 *
 * @param httpClient - HTTP client instance ( parity กับ Angular HttpClient API)
 * @returns DeviceService instance
 *
 * @reason
 * React ไม่มี DI แบบ Angular — ใช้ factory + module singleton แทนเพื่อให้
 * ทุก caller ได้ instance เดียวกัน (parity กับ providedIn: 'root')
 */
export function createDeviceService(httpClient: HttpClient): DeviceService {
  return new DeviceService(httpClient);
}

/**
 * ให้บริการ HTTP สำหรับจัดการ Device entities.
 * ทุก method ส่งคำขอไปยัง ThingsBoard REST API (/api/device/*)
 */
export class DeviceService {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * ดึงรายการ Device แบบแบ่งหน้า
   *
   * @param pageLink - พารามิเตอร์การแบ่งหน้า (page, pageSize, textSearch, sort)
   * @param requestConfig - config สำหรับ interceptor (ignoreLoading, ignoreErrors, ฯลฯ)
   * @returns Observable ที่ emit PageData<DeviceInfo> เมื่อได้ response
   */
  public getDevices(
    pageLink: PageLink,
    requestConfig?: RequestConfig
  ): Observable<PageData<DeviceInfo>> {
    return this.httpClient.get<PageData<DeviceInfo>>(
      `/api/devices${pageLink.toQuery()}`,    // ใช้ toQuery() เพื่อ parity ของ query string format
      defaultHttpOptionsFromConfig(requestConfig)
    );
  }

  // ... เมธอดอื่นๆ
}
```
