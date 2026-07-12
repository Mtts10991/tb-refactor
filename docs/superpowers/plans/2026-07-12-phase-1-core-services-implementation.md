# Phase 1 — Core Service Layer (RxJS Port) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port ทุก HTTP service + WebSocket + Auth + widget subscription + NgRx state จาก Angular มาทำงานใน React environment โดยยังไม่มี UI component — parity test ทุก service ผ่าน byte-for-byte

**Architecture:** คง RxJS Observable API ทั้งหมด (caller ไม่ต้องแก้), ถอด Angular decorator/DI เป็น factory function, แทน `InterceptorHttpParams` hack ด้วย custom request metadata, แปลง NgRx store เป็น `@react-rxjs/core` shared state

**Tech Stack:**
- RxJS 7.8 (คงเดิม — parity)
- `@react-rxjs/core` 0.10 (bridge เข้า React)
- `jwt-decode` (แทน `@auth0/angular-jwt`)
- `rxjs/webSocket` (คงเดิม)
- fetch-based HTTP client (แทน Angular HttpClient)

**Reference Spec:** [`docs/superpowers/specs/2026-07-12-nextjs-refactor-design.md`](../specs/2026-07-12-nextjs-refactor-design.md)
**Reference Phase:** Phase 1 ใน [`docs/superpowers/specs/2026-07-12-nextjs-refactor-phases.md`](../specs/2026-07-12-nextjs-refactor-phases.md)

**Naming Convention:** descriptive เต็มรูปแบบ ห้ามย่อ (ยกเว้น acronyms HTTP/WS/API/URL/JWT/ID/CSS/JSON)
**Comment Rule:** file-level JSDoc + `@parityEngine Angular` + symbol-level JSDoc + inline ภาษาไทยทุกไฟล์

---

## File Structure (สรุปไฟล์ที่ Phase 1 สร้าง)

```
ui-next/src/
├── core/
│   ├── http/
│   │   ├── http-client.ts                    # Task 2 — fetch-based HttpClient (parity Angular HttpClient)
│   │   ├── http-utils.ts                     # Task 2 — defaultHttpOptionsFromConfig port
│   │   ├── request-metadata.ts               # Task 2 — แทน InterceptorHttpParams (custom symbol)
│   │   ├── interceptor-chain.ts              # Task 6 — chain orchestration
│   │   ├── interceptors/
│   │   │   ├── authentication-interceptor.ts
│   │   │   ├── error-handling-interceptor.ts
│   │   │   ├── loading-indicator-interceptor.ts
│   │   │   ├── rate-limit-interceptor.ts
│   │   │   └── entity-conflict-interceptor.ts
│   │   ├── services/                         # Task 3 — 41 services
│   │   │   ├── admin.service.ts
│   │   │   ├── ai-model.service.ts
│   │   │   ├── ... (41 services, 1 file each)
│   │   │   ├── entity.service.ts             # 1579 บรรทัด — orchestrator
│   │   │   └── public-api.ts                 # barrel export
│   │   └── service-factory.ts                # factory: createServiceInstance(httpClient)
│   ├── websocket/
│   │   ├── websocket-service.ts              # Task 4 — abstract base
│   │   ├── telemetry-websocket-service.ts    # Task 4 — concrete (merge notification)
│   │   ├── websocket-constants.ts            # RECONNECT_INTERVAL_MS, IDLE_TIMEOUT_MS
│   │   └── cmd-wrapper.ts                    # TelemetryPluginCmdsWrapper
│   ├── authentication/
│   │   ├── auth-token-store.ts               # Task 5 — localStorage static methods
│   │   ├── auth-token-refresher.ts           # Task 5 — refresh JWT dedupe
│   │   ├── auth-api.ts                       # Task 5 — login/logout/activate HTTP
│   │   ├── auth-session.ts                   # Task 5 — orchestrator
│   │   ├── auth-navigation.ts                # Task 5 — redirect URL logic (pure)
│   │   ├── auth-providers.ts                 # Task 5 — 2FA + OAuth2 discovery
│   │   └── jwt-decode-wrapper.ts             # Task 5 — jwt-decode wrapper
│   ├── widget-subscription/                  # Task 7
│   │   ├── widget-subscription.ts            # 1690 บรรทัด port
│   │   ├── entity-data-subscription.ts       # 1340 บรรทัด port
│   │   ├── data-aggregator.ts                # 490 บรรทัด port
│   │   ├── alarm-data-subscription.ts        # 195 บรรทัด port
│   │   └── alias-controller.ts               # 490 บรรทัด port
│   ├── shared-state/                         # Task 8
│   │   ├── authentication-state.ts           # auth slice
│   │   ├── settings-state.ts                 # settings slice
│   │   ├── loading-indicator-state.ts        # load slice
│   │   ├── notification-state.ts             # notification slice
│   │   └── store-context.tsx                 # React provider
│   ├── internationalization/                 # Task 9
│   │   ├── message-format-compiler.ts        # messageformat wrapper
│   │   ├── missing-translation-handler.ts    # parity TbMissingTranslationHandler
│   │   └── locale-discovery.ts               # auto-discovery (scan public/locale/)
│   └── error-handling/
│       ├── server-error-codes.ts             # error code → i18n key map
│       └── http-error-parser.ts              # parseHttpErrorMessage port
└── shared/
    └── models/                               # Task 1 — 205 model files port
        ├── (mirror ui-ngx/src/app/shared/models/ structure)
```

---

## Task 1: Port 205 model files (จัดกลุ่มตาม domain)

**ParityEngine:** `ui-ngx/src/app/shared/models/` (205 files)
**Target:** `ui-next/src/shared/models/` (mirror structure)

### Sub-tasks (จัดกลุ่มตาม domain)

- [ ] **1.1 — ID models (39 files)** — `id/*.ts`
  - ไฟล์ entity ID types (`EntityId`, `CustomerId`, `DeviceId`, ฯลฯ)
  - **Pattern:** pure interface/class ไม่มี decorator — port ตรง
  - **Acceptance:** tsc --noEmit ผ่าน + import path ถูกต้อง

- [ ] **1.2 — Page + Query + Time models (6 files)** — `page/*.ts`, `query/*.ts`, `time/*.ts`
  - `PageLink` (สำคัญ! มี `toQuery()` ที่ใช้ในทุก service)
  - `PageData<T>`, `TimePageLink`, `EntityDataQuery`
  - **Pattern:** pure class มี method — port ตรง
  - **Acceptance:** `PageLink.toQuery()` คืน query string ถูกต้อง

- [ ] **1.3 — Telemetry + WebSocket + Widget models (4 files)** — `telemetry/*.ts`, `websocket/*.ts`, `widget/*.ts`
  - `TelemetrySubscriber`, `NotificationSubscriber`, cmd classes, `WidgetType`
  - **Pattern:** pure class/interface — port ตรง
  - **Acceptance:** tsc ผ่าน

- [ ] **1.4 — ACE editor models (5 files)** — `ace/*.ts`
  - Code editor completion models
  - **Note:** ข้าม `.js` files (worker/mode) — port เฉพาะ `.ts`
  - **Acceptance:** tsc ผ่าน

- [ ] **1.5 — Units models (87 files)** — `units/*.ts`
  - Widget unit definitions (temperature, pressure, ฯลฯ)
  - **Pattern:** pure const objects — port ตรง ใช้เวลานานแต่ mechanical
  - **Acceptance:** tsc ผ่าน

- [ ] **1.6 — Root model files (64 files)** — `*.ts` ใน root
  - รวมไฟล์สำคัญ: `alarm.models.ts`, `device.models.ts`, `dashboard.models.ts`, `entity.models.ts`, `authority.enum.ts`, `base-data.ts`, `constants.ts`, `contact-based.model.ts`
  - **Pattern:** ส่วนใหญ่ pure interface/class — port ตรง
  - **จุดระวัง:**
    - `calculated-field.models.ts` (35KB) — ใหญ่
    - ไฟล์ที่ import Angular decorators หรือ `@shared/*` paths → แก้ import
  - **Acceptance:** tsc ผ่าน + JSDoc ภาษาไทยครบ

### ขั้นตอนทั่วไปสำหรับทุก sub-task
1. **Copy ไฟล์** จาก `ui-ngx/src/app/shared/models/{path}` → `ui-next/src/shared/models/{path}`
2. **แก้ imports:**
   - `@shared/models/*` → `@shared/models/*` (คงเดิม เพราะ path alias ตั้งไว้)
   - `@angular/*` → ลบ (ไม่มี model ใช้ Angular จริง ยกเว้น import type บางตัว)
   - `@core/*` → `@core/*` (คงเดิม)
3. **ถอด Angular decorators** ที่หลงเหลือ (`@Injectable` บน model class — ไม่ควรมี)
4. **เพิ่ม file-level JSDoc** ภาษาไทย (ถ้ายังไม่มี)
5. **Commit:** `feat(models): port {domain} models จาก Angular (Phase 1.1.{N})`

---

## Task 2: Port http-utils + แทน InterceptorHttpParams ด้วย request metadata

**Files:**
- Create: `ui-next/src/core/http/http-client.ts`
- Create: `ui-next/src/core/http/http-utils.ts`
- Create: `ui-next/src/core/http/request-metadata.ts`

**ParityEngine:**
- `ui-ngx/src/app/core/http/http-utils.ts` (99 บรรทัด)
- `ui-ngx/src/app/core/interceptors/interceptor-config.ts` (23 บรรทัด)
- `ui-ngx/src/app/core/interceptors/interceptor-http-params.ts` (28 บรรทัด)

- [ ] **2.1 — สร้าง `request-metadata.ts` (แทน InterceptorHttpParams)**

```typescript
/**
 * @fileoverview
 * Request metadata สำหรับส่ง InterceptorConfig ผ่าน HTTP request
 * แทน mechanism InterceptorHttpParams ของ Angular ที่ piggyback config บน HttpParams.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: ui-ngx/src/app/core/interceptors/interceptor-http-params.ts
 *   + ui-ngx/src/app/core/interceptors/interceptor-config.ts
 *
 * @reason
 * Angular ใช้ InterceptorHttpParams (extends HttpParams) เพื่อซ่อน config ใน params object
 * ทำให้ GlobalHttpInterceptor อ่านได้. ในฝั่ง React/fetch ไม่มี HttpParams จึงใช้
 * Symbol-keyed property บน request object แทน — สะอาดกว่าและ type-safe.
 */

/** Config สำหรับควบคุมพฤติกรรม interceptor ต่อ request */
export interface InterceptorConfig {
  readonly ignoreLoading: boolean;
  readonly ignoreErrors: boolean;
  readonly ignoreVersionConflict: boolean;
  readonly resendRequest: boolean;
}

/** Symbol key สำหรับเก็บ InterceptorConfig บน request (ไม่ collide กับ HTTP headers) */
export const INTERCEPTOR_CONFIG_SYMBOL: unique symbol = Symbol("thingsboard.interceptorConfig");

/** Type guard: request มี InterceptorConfig หรือไม่ */
export function getInterceptorConfig(request: Request): InterceptorConfig | undefined {
  return (request as unknown as Record<symbol, InterceptorConfig>)[INTERCEPTOR_CONFIG_SYMBOL];
}
```

- [ ] **2.2 — สร้าง `http-utils.ts` (port จาก Angular)**

Port `defaultHttpOptionsFromConfig()`, `defaultHttpOptions()`, `defaultHttpUploadOptions()`, `createDefaultHttpOptions()`, `hasRequestConfig()`, `cleanQueryParams()`, `RequestConfig`, `QueryParams` type

แทนการสร้าง `{ headers, params: InterceptorHttpParams }` ให้สร้าง `HttpRequestOptions` object ที่มี:
- `headers: Record<string, string>`
- `queryParams?: QueryParams` (cleaned)
- `interceptorConfig: InterceptorConfig`
- `body?: unknown`

- [ ] **2.3 — สร้าง `http-client.ts` (fetch-based wrapper)**

```typescript
/**
 * @fileoverview
 * HTTP client สำหรับเรียก ThingsBoard REST API — parity API กับ Angular HttpClient
 * แต่ใช้ fetch ภายใต้ และเชื่อมกับ interceptor chain.
 *
 * @parityEngine Angular
 * พอร์ตมาจาก: @angular/common/http HttpClient (เฉพาะ API ที่ใช้)
 *
 * @reason
 * ใช้ fetch แทน Angular HttpClient เพราะ:
 *   1. ไม่ต้อง polyfill ใน Next.js
 *   2. รองรับ server components ได้
 *   3. ลด bundle size
 *
 * API parity:
 *   - get<T>(url, options?) → Observable<T>
 *   - post<T>(url, body, options?) → Observable<T>
 *   - put<T>(url, body, options?) → Observable<T>
 *   - delete<T>(url, options?) → Observable<T>
 *   - ทุก method คืน Observable (parity กับ Angular — caller ไม่ต้องแก้)
 */
```

สร้าง `HttpClient` class ที่:
- รับ `interceptorChain: InterceptorChain` ใน constructor
- แต่ละ method (`get/post/put/delete`) สร้าง Request + apply options + ส่งผ่าน chain → fetch → parse response → Observable
- URL relative `/api/...` (proxy จัดการ destination)

- [ ] **2.4 — Commit**

```bash
git add ui-next/src/core/http/http-client.ts ui-next/src/core/http/http-utils.ts ui-next/src/core/http/request-metadata.ts
git commit -m "feat(http): port http-utils + แทน InterceptorHttpParams ด้วย request metadata (Phase 1.2)"
```

**Acceptance:** unit test `defaultHttpOptionsFromConfig({ignoreErrors:true})` สร้าง options ที่มี InterceptorConfig ถูกต้อง

---

## Task 3: Port 41 HTTP services

**ParityEngine:** `ui-ngx/src/app/core/http/*.service.ts` (41 ไฟล์, ~503 methods)
**Target:** `ui-next/src/core/http/services/*.service.ts`

### Strategy
- 90% methods = mechanical port (URL template + Observable<T>)
- ใช้ factory function pattern: `export function createDeviceService(httpClient: HttpClient): DeviceService`
- ถอด `@Injectable`, เปลี่ยน `constructor(private http: HttpClient)` → constructor รับ `httpClient` parameter
- คง return type `Observable<T>` ทุก method
- แก้ import path `@shared/models/*` → `@shared/models/*`

### Sub-tasks (จัดกลุ่มตาม complexity + dependency)

- [ ] **3.1 — Simple services batch 1 (~15 services)**
  - Services ที่มีเฉพาะ HttpClient dep: `ai-model`, `alarm-comment`, `api-key`, `customer`, `domain`, `event`, `git-hub`, `mobile-application`, `tenant`, `tenant-profile`, `trendz-settings`, `ui-settings`, `usage-info`, `audit-log`, `oauth2`
  - **Pattern:** 100% mechanical port
  - **Acceptance:** tsc ผ่าน + parity smoke test URL/headers

- [ ] **3.2 — Simple services batch 2 (~10 services)**
  - `alarm`, `asset`, `asset-profile`, `calculated-fields`, `component-descriptor`, `edge`, `entity-relation`, `entity-view`, `queue`, `user-settings`
  - **Pattern:** mechanical + บางตัวมี overloaded save (`createDefaultHttpOptions`)
  - **Acceptance:** tsc ผ่าน + parity test

- [ ] **3.3 — Services with extra deps (~10 services)**
  - `device-profile` (OtaPackageService dep), `device` (ResourcesService + sync XHR!), `image` (DomSanitizer), `ota-package` (Translate + Dialog), `resource` (ResourcesService), `rule-chain` (ComponentDescriptor + Resources + Translate), `widget` (Store + Resources), `mobile-app`, `user`, `admin` (EntitiesVersionControl)
  - **Note:** `device.service.getDeviceCredentials` มี sync XHR → แปลงเป็น async Observable (breaking change ที่จำเป็น)
  - **Note:** deps ที่เป็น Angular service (Translate, Dialog, Store) → ใช้ adapter ที่จะสร้างใน Task 5/8
  - **Acceptance:** tsc ผ่าน + parity test critical flows

- [ ] **3.4 — Notification service (192 บรรทัด, 30 methods)**
  - ใหญ่ + complex query building
  - **Acceptance:** parity test notification CRUD ผ่าน

- [ ] **3.5 — Entities version control (191 บรรทัด + 4 deps)**
  - Deps: HttpClient + Translate + DomSanitizer + Store
  - **Acceptance:** parity test VC operations ผ่าน

- [ ] **3.6 — Dashboard service (205 บรรทัด, 24 methods, 3 deps)**
  - มี `getServerTimeDiff()` caching (publishReplay/refCount)
  - มี `getPublicDashboardLink()` (window.location)
  - **Acceptance:** parity test dashboard CRUD + serverTimeDiff ผ่าน

- [ ] **3.7 — Entity service (1579 บรรทัด, 25 methods, 26 deps) — ORCHESTRATOR**
  - **ไม่ใช่ thin HTTP wrapper** — เป็น domain logic orchestrator
  - dispatch table ตาม EntityType × operation
  - RxJS `expand`/`concatMap`/`toArray` pagination
  - **Note:** port ทยอย — สำคัญที่สุดคือ `getEntity`, `getEntities`, `saveEntity`, `deleteEntity` dispatchers
  - **Acceptance:** parity test entity dispatch ผ่าน (5 entity types × CRUD)

- [ ] **3.8 — Service factory + public-api barrel**
  - `service-factory.ts`: สร้าง singleton instances ทั้งหมด
  - `public-api.ts`: barrel export ทุก service
  - **Acceptance:** `import { DeviceService } from '@core/http/services/public-api'` ทำงานได้

- [ ] **3.9 — Commit ทุก batch**

---

## Task 4: Port WebSocket services + merge dead proxy

**Files:**
- Create: `ui-next/src/core/websocket/websocket-service.ts`
- Create: `ui-next/src/core/websocket/telemetry-websocket-service.ts`
- Create: `ui-next/src/core/websocket/websocket-constants.ts`
- Create: `ui-next/src/core/websocket/cmd-wrapper.ts`

**ParityEngine:**
- `ui-ngx/src/app/core/ws/websocket.service.ts` (268 บรรทัด)
- `ui-ngx/src/app/core/ws/telemetry-websocket.service.ts` (181 บรรทัด)
- `ui-ngx/src/app/core/ws/notification-websocket.service.ts` (60 บรรทัด — **DEAD PROXY → merge**)

- [ ] **4.1 — Port `websocket-constants.ts`**

```typescript
export const WEBSOCKET_RECONNECT_INTERVAL_MS = 2000;
export const WEBSOCKET_IDLE_TIMEOUT_MS = 90000;
export const MAX_PUBLISH_COMMANDS_PER_FRAME = 10;
```

- [ ] **4.2 — Port `cmd-wrapper.ts`** (TelemetryPluginCmdsWrapper)
Port จาก `ui-ngx/src/app/shared/models/telemetry/telemetry.models.ts` — cmd collection + setAuth

- [ ] **4.3 — Port `websocket-service.ts`** (abstract base, 268 บรรทัด)
- ถอด Angular DI → factory function
- แทน `store.select(selectIsAuthenticated)` → รับ `isAuthenticated$: Observable<boolean>` parameter
- แทน `authService.refreshJwtToken()` → รับ `refreshToken: () => Promise<string>` parameter
- คง `rxjs/webSocket` webSocket() ไว้
- คง state machine: `isActive/isOpening/isOpened/isReconnect` + `subscribersMap` + `reconnectSubscribers`
- คง `RECONNECT_INTERVAL`/`WS_IDLE_TIMEOUT`/`MAX_PUBLISH_COMMANDS` logic

- [ ] **4.4 — Port `telemetry-websocket-service.ts`** + **merge notification**
- รวม NotificationWebsocketService (dead proxy) เข้ามา — ไม่มี breaking เพราะทุก call อยู่ที่ telemetry อยู่แล้ว
- port `subscribe/update/unsubscribe/processOnMessage`
- cmdId allocation logic

- [ ] **4.5 — Unit tests**
- Test reconnect logic
- Test idle timeout
- Test subscriber map cmdId routing

- [ ] **4.6 — Commit**

**Acceptance:** parity test WebSocket auth + subscribe + reconnect ผ่าน

---

## Task 5: Port AuthService (split god service)

**Files (split 6 ไฟล์ + jwt wrapper):**
- Create: `ui-next/src/core/authentication/auth-token-store.ts`
- Create: `ui-next/src/core/authentication/auth-token-refresher.ts`
- Create: `ui-next/src/core/authentication/auth-api.ts`
- Create: `ui-next/src/core/authentication/auth-session.ts`
- Create: `ui-next/src/core/authentication/auth-navigation.ts`
- Create: `ui-next/src/core/authentication/auth-providers.ts`
- Create: `ui-next/src/core/authentication/jwt-decode-wrapper.ts`

**ParityEngine:** `ui-ngx/src/app/core/auth/auth.service.ts` (657 บรรทัด)

- [ ] **5.1 — `auth-token-store.ts`** (Group 1: localStorage static methods)
Port: `getJwtToken()`, `isJwtTokenValid()`, `clearJwtToken()`, `setJwtToken()`, token + expiration storage
**Pure module functions** — ไม่มี DI

- [ ] **5.2 — `jwt-decode-wrapper.ts`**
แทน `@auth0/angular-jwt` JwtHelperService ด้วย `jwt-decode` (pure function)

- [ ] **5.3 — `auth-token-refresher.ts`** (Group 4: refresh logic)
Port: `validateJwtToken()`, `refreshJwtToken()`, `refreshTokenPending()`, `procceedJwtTokenValidate()`
- `refreshTokenSubject: ReplaySubject<LoginResponse>` dedupe → RxJS `shareReplay`
- parity กับ Angular 100%

- [ ] **5.4 — `auth-api.ts`** (Group 2: login/activate/password HTTP)
Port: `login()`, `checkTwoFaVerificationCode()`, `publicLogin()`, `sendResetPasswordLink()`, `activate()`, `resetPassword()`, `changePassword()`, `getUserPasswordPolicy()`, `activateByEmailCode()`, `resendEmailActivation()`, `loginAsUser()`

- [ ] **5.5 — `auth-navigation.ts`** (Group 6: redirect logic — pure functions)
Port: `gotoDefaultPlace()`, `forceDefaultPlace()`, `defaultUrl()`
**Pure functions** — ใช้ใน Next.js route guard

- [ ] **5.6 — `auth-providers.ts`** (Group 7: 2FA + OAuth2)
Port: `getAvailableTwoFaLoginProviders()`, `getAvailableTwoFaProviders()`, `loadOAuth2Clients()`

- [ ] **5.7 — `auth-session.ts`** (orchestrator)
Compose token-store + refresher + api + navigation เป็น `AuthSession` class
Port: `logout()`, `loadUser()`, `reloadUser()`, `setUserFromJwtToken()` (Group 3 + 5)

- [ ] **5.8 — Unit tests**
- Test token validity check
- Test refresh dedupe (concurrent calls share one refresh)
- Test login flow → token storage
- Test logout → clear tokens

- [ ] **5.9 — Commit**

**Acceptance:** parity test auth flow (login → refresh → logout → public access) ผ่าน

---

## Task 6: HTTP interceptor chain

**Files:**
- Create: `ui-next/src/core/http/interceptor-chain.ts`
- Create: `ui-next/src/core/http/interceptors/authentication-interceptor.ts`
- Create: `ui-next/src/core/http/interceptors/error-handling-interceptor.ts`
- Create: `ui-next/src/core/http/interceptors/loading-indicator-interceptor.ts`
- Create: `ui-next/src/core/http/interceptors/rate-limit-interceptor.ts`
- Create: `ui-next/src/core/http/interceptors/entity-conflict-interceptor.ts`
- Create: `ui-next/src/core/error-handling/server-error-codes.ts`
- Create: `ui-next/src/core/error-handling/http-error-parser.ts`

**ParityEngine:** `ui-ngx/src/app/core/interceptors/global-http-interceptor.ts` (~207 บรรทัด, ทำหลายหน้าที่)

- [ ] **6.1 — `server-error-codes.ts` + `http-error-parser.ts`**
Port `serverErrorCodesTranslations` map + `parseHttpErrorMessage()` จาก `ui-ngx/src/app/core/utils.ts`
- error codes: 2, 10, 11, 15, 20, 30, 31, 32, 33, 34, 41, 45

- [ ] **6.2 — `interceptor-chain.ts`**
Chain orchestration: รับ array ของ interceptors, แต่ละ interceptor รับ `(request, next) → Observable<Response>`
คล้าย RxJS `concatMap` pipe แต่ type-safe

- [ ] **6.3 — `authentication-interceptor.ts`**
- ใส่ `X-Authorization: Bearer <token>` (ไม่ใช่ `Authorization`)
- ข้าม token-based endpoints (`/api/auth/login`, `/api/auth/token`, `/api/noauth*`)

- [ ] **6.4 — `error-handling-interceptor.ts`**
- 401 → refresh token + retry
- 403 → forbidden dialog
- 409 → entity conflict (delegate)
- 429 → rate limit retry (with jitter `1000 + random*3000` ms)
- 41 error code → entitiesLimitExceeded dialog
- status 0/-1 → "Unable to connect"

- [ ] **6.5 — `loading-indicator-interceptor.ts`**
- Ref count active requests → emit loading state changes (parity load slice)

- [ ] **6.6 — `rate-limit-interceptor.ts`** (extracted from error handler)
- 429 retry logic เฉพาะเมื่อ `resendRequest=true`

- [ ] **6.7 — `entity-conflict-interceptor.ts`**
- 409 → dialog (overwrite/cancel) — parity EntityConflictDialogComponent

- [ ] **6.8 — Integration test**
- parity test 401 retry, 429 backoff, 409 conflict, 403 forbidden, 41 entitiesLimitExceeded ผ่าน

- [ ] **6.9 — Commit**

**Acceptance:** parity test interceptor chain ผ่าน byte-for-byte

---

## Task 7: Port widget subscription layer

**Files:**
- Create: `ui-next/src/core/widget-subscription/widget-subscription.ts`
- Create: `ui-next/src/core/widget-subscription/entity-data-subscription.ts`
- Create: `ui-next/src/core/widget-subscription/data-aggregator.ts`
- Create: `ui-next/src/core/widget-subscription/alarm-data-subscription.ts`
- Create: `ui-next/src/core/widget-subscription/alias-controller.ts`

**ParityEngine:**
- `ui-ngx/src/app/core/api/widget-subscription.ts` (1690 บรรทัด)
- `ui-ngx/src/app/core/api/entity-data-subscription.ts` (1340 บรรทัด)
- `ui-ngx/src/app/core/api/data-aggregator.ts` (490 บรรทัด)
- `ui-ngx/src/app/core/api/alarm-data-subscription.ts` (195 บรรทัด)
- `ui-ngx/src/app/core/api/alias-controller.ts` (490 บรรทัด)

**Total:** ~4205 บรรทัด (sub-phase ใหญ่สุดของ Phase 1)

- [ ] **7.1 — `data-aggregator.ts`** (490 บรรทัด — port ก่อนเพราะ dependency ของคนอื่น)
- Port class `DataAggregator` + private `AggregationMap` (BTree-backed)
- คง BTree dependency (ใช้ `btree-js` หรือ polyfill)
- Public API: `updateOnDataCb`, `reset(subsTw)`, `destroy()`, `onData(data, update, history, detectChanges)`

- [ ] **7.2 — `entity-data-subscription.ts`** (1340 บรรทัด)
- Port class `EntityDataSubscription`
- รับ `TelemetryWebsocketService` instance (factory function ไม่ใช่ DI)
- Public: `subscribe()`, `unsubscribe()`, `start()`
- จัดการ realtime/history/floating timewindows

- [ ] **7.3 — `alarm-data-subscription.ts`** (195 บรรทัด)
- Port class `AlarmDataSubscription`
- Public: `subscribe()`, `unsubscribe()`

- [ ] **7.4 — `alias-controller.ts`** (490 บรรทัด)
- Port class `AliasController`
- รับ `EntityService` instance (factory)
- Key methods: `resolveDatasources`, `resolveAlarmSource`, `updateAliases`

- [ ] **7.5 — `widget-subscription.ts`** (1690 บรรทัด — orchestrator)
- Port class `WidgetSubscription`
- รับ `WidgetSubscriptionContext` (มี telemetryService, entityService, utils, ฯลฯ)
- Branches: `rpc` / `alarm` / timeseries+latest (default)
- คง `init$: ReplaySubject<IWidgetSubscription>` pattern
- Public: `subscribe()`, `unsubscribe()`, `destroy()`, `update()`, RPC methods

- [ ] **7.6 — Unit tests critical paths**
- Test data subscription lifecycle
- Test alarm subscription
- Test aggregation

- [ ] **7.7 — Commit**

**Acceptance:** parity test telemetry subscription + aggregation ผ่าน

---

## Task 8: Port 4 NgRx slices → @react-rxjs/core

**Files:**
- Create: `ui-next/src/core/shared-state/authentication-state.ts`
- Create: `ui-next/src/core/shared-state/settings-state.ts`
- Create: `ui-next/src/core/shared-state/loading-indicator-state.ts`
- Create: `ui-next/src/core/shared-state/notification-state.ts`
- Create: `ui-next/src/core/shared-state/store-context.tsx`

**ParityEngine:**
- `ui-ngx/src/app/core/auth/auth.{models,actions,reducer,effects,selectors}.ts`
- `ui-ngx/src/app/core/settings/settings.*.ts`
- `ui-ngx/src/app/core/notification/notification.*.ts`
- `ui-ngx/src/app/core/interceptors/load.*.ts`

- [ ] **8.1 — `loading-indicator-state.ts`** (load slice — ง่ายสุด)
- `createSignal<boolean>` for isLoading
- Parity `ActionLoadStart`/`ActionLoadFinish` → `startLoading()`/`finishLoading()`
- Parity `selectIsLoading` → `bind(isLoading$)`

- [ ] **8.2 — `notification-state.ts`** (notification slice)
- `createSignal<NotificationMessage | null>` for current notification
- `createSignal<HideNotification | null>` for hide notification
- Parity `ActionNotificationShow`/`ActionNotificationHide`
- Effects (dispatch:false) → `subscribe` pipelines ที่เรียก toast service

- [ ] **8.3 — `settings-state.ts`** (settings slice)
- `createSignal<string>` for userLang
- Parity `ActionSettingsChangeLanguage` → `changeLanguage(userLang)`
- Effects → `subscribe` ที่ persist localStorage + update document.title

- [ ] **8.4 — `authentication-state.ts`** (auth slice — ซับซ้อนสุด)
- `createSignal<AuthState>` for full auth state
- Parity 11 actions → signal updaters
- Parity selectors → `bind(authState$, selector => ...)`
- Effects (persistOpenedMenuSections, putUserSettings, deleteUserSettings) → subscribe

- [ ] **8.5 — `store-context.tsx`** (React provider)
- `<StoreProvider>` component ที่รวม state ทั้งหมด
- Hooks: `useAuthState()`, `useIsAuthenticated()`, `useUserDetails()`, `useSettings()`, `useIsLoading()`, `useNotification()`

- [ ] **8.6 — Unit tests**
- Test state transitions parity กับ reducer
- Test selector parity

- [ ] **8.7 — Commit**

**Acceptance:** React component อ่าน auth user/loading state/notification queue ผ่าน hook ได้

---

## Task 9: Port translate layer → next-intl adapter

**Files:**
- Create: `ui-next/src/core/internationalization/message-format-compiler.ts`
- Create: `ui-next/src/core/internationalization/missing-translation-handler.ts`
- Create: `ui-next/src/core/internationalization/locale-discovery.ts`

**ParityEngine:**
- `ui-ngx/src/app/core/translate/translate-default-loader.ts`
- `ui-ngx/src/app/core/translate/missing-translation-handler.ts`
- `ui-ngx/src/app/core/translate/translate-default-compiler.ts` (messageformat)
- `ui-ngx/esbuild/tb-esbuild-plugins.ts` (auto-discovery)

- [ ] **9.1 — `locale-discovery.ts`**
- Port auto-discovery: scan `public/locale/*.json` → list supported locales
- Parity กับ esbuild plugin ที่สร้าง SUPPORTED_LANGS

- [ ] **9.2 — `message-format-compiler.ts`**
- Port `TranslateDefaultCompiler` ที่ใช้ `@messageformat/core`
- รองรับ plural tokens (`{count, plural, ...}`)
- ใช้เป็น next-intl message processor

- [ ] **9.3 — `missing-translation-handler.ts`**
- Port `TbMissingTranslationHandler` — console.warn + auto-register key เป็น fallback
- Adapter สำหรับ next-intl missing key event

- [ ] **9.4 — Migrate Phase 0 locale files**
- Copy `locale.constant-en_US.json` (587KB, 10,000+ keys) → แปลงจาก flat keys เป็น nested (next-intl format)
- Copy → `locale.constant-th_TH.json` (starter, ยังเป็น en fallback)
- Note: flat→nested conversion ใช้ script (key "common.save" → `{common: {save: "..."}}`)

- [ ] **9.5 — Integration test**
- Test plural rendering parity (messageformat)
- Test missing key handler

- [ ] **9.6 — Commit**

**Acceptance:** translation key ทุก key render ผลเหมือน Angular เดิม รวม plural

---

## Acceptance Criteria (Phase 1 ผ่านเมื่อ)

- [ ] **Parity HTTP:** parity test 41 services × multiple methods ผ่าน (URL/headers/body matching)
- [ ] **Parity WebSocket:** parity test auth + subscribe + reconnect + idle ผ่าน
- [ ] **Parity Auth:** parity test login + refresh + logout + public access + 2FA ผ่าน
- [ ] **Parity Interceptors:** parity test 401 retry + 429 backoff + 409 conflict + 403 forbidden + 41 entitiesLimitExceeded ผ่าน
- [ ] **Parity Telemetry:** parity test subscription + aggregation ผ่าน
- [ ] **Unit test coverage:** ≥ 80% ของ `src/core/`
- [ ] **JSDoc:** ภาษาไทยครบทุกไฟล์ใน `src/core/`
- [ ] **ESLint:** ผ่าน 0 errors (custom rule require-thai-jsdoc ทำงาน)
- [ ] **`X-Authorization` header:** parity verified (ไม่ใช่ `Authorization` มาตรฐาน)
- [ ] **`PageLink.toQuery()` format:** parity verified (`?page=&pageSize=&textSearch=&sortProperty=&sortOrder=`)

---

## Self-Review Checklist

1. **Spec coverage:** ทุก sub-phase 1.1-1.9 มี task (ใช่)
2. **Placeholder scan:** ไม่มี TBD (verify หลัง implement)
3. **Type consistency:**
   - `HttpClient` (http-client.ts) — ใช้ในทุก service factory
   - `InterceptorConfig` (request-metadata.ts) — ใช้ใน http-utils + interceptors
   - `HttpRequestOptions` (http-utils.ts) — ใช้ในทุก service method
4. **Parity verified:**
   - WebSocket constants (2000ms, 90000ms, 10 commands)
   - Auth header (`X-Authorization`)
   - Pagination format (`PageLink.toQuery()`)
   - Error code map (12 codes)

---

## Next Phase

เมื่อ Phase 1 ผ่าน → เรียก `writing-plans` skill เพื่อเขียน **Phase 2 — Shared Library & Design System** implementation plan
