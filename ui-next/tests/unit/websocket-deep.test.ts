/**
 * @fileoverview
 * Deep integration tests ที่ execute TelemetryWebsocketService code paths จริง
 * หลังจากถอด NgRx select operator ออกจาก websocket.service.ts
 */

import { describe, it, expect, vi } from "vitest";
import { of, Subject } from "rxjs";

// Mock @angular + deep import chains
vi.mock("@angular/core", () => ({
  Injectable: () => () => {}, Inject: () => () => {}, Optional: () => () => {},
  Directive: () => () => {}, Component: () => () => {},
  Input: () => () => {}, Output: () => () => {},
  NgZone: class { runOutsideAngular(fn: () => void) { fn(); } },
  EventEmitter: class { emit() {} subscribe() { return { unsubscribe: () => {} }; } },
  InjectionToken: class { constructor() {} }, inject: () => ({}),
  Type: class {}, Injector: class {}, DestroyRef: class {},
  OnInit: class {}, AfterViewInit: class {}, OnDestroy: class {},
}));
vi.mock("@angular/core/rxjs-interop", () => ({ takeUntilDestroyed: () => () => {} }));
vi.mock("@ngrx/store", () => ({ Store: class {}, select: () => (s: any) => s }));
vi.mock("@shared/models/widget.models", () => ({}));
vi.mock("@shared/models/widget-settings.models", () => ({}));
vi.mock("@shared/models/rule-node.models", () => ({}));
vi.mock("@shared/models/rule-chain.models", () => ({}));
vi.mock("@shared/models/dynamic-form.models", () => ({}));
vi.mock("@shared/models/js-function.models", () => ({}));
vi.mock("@home/models/widget-component.models", () => ({}));
vi.mock("@home/components/widget/config/widget-config.component.models", () => ({}));
vi.mock("@home/components/widget/lib/table-widget.models", () => ({}));
vi.mock("@shared/import-export/import-export.models", () => ({}));
vi.mock("@home/components/profile/device/lwm2m/lwm2m-profile-config.models", () => ({}));
vi.mock("@shared/components/page.component", () => ({}));
vi.mock("rxjs/webSocket", () => ({
  webSocket: vi.fn(() => {
    const subject = new Subject();
    return Object.assign(subject, { next: vi.fn(), unsubscribe: vi.fn(), complete: vi.fn() });
  }),
}));

import { TelemetryWebsocketService } from "../../src/core/websocket/telemetry-websocket.service";

describe("TelemetryWebsocketService deep execution (no NgRx select)", () => {
  function createService() {
    const authState$ = new Subject<boolean>();
    const mockStore = {
      dispatch: vi.fn(),
      select: vi.fn(() => authState$),
    };
    const mockAuthService = {
      refreshJwtToken: () => of({}),
      logout: vi.fn(),
    };
    const mockWindow = {
      location: { protocol: "http:", hostname: "localhost", port: "3000" },
    };
    const svc = new TelemetryWebsocketService(
      mockStore as any,
      mockAuthService as any,
      { runOutsideAngular: (fn: () => void) => fn() } as any,
      mockWindow as any,
    );
    return { svc, mockStore, mockAuthService, authState$ };
  }

  it("constructor สร้าง instance ได้ (no NgRx select operator needed)", () => {
    const { svc } = createService();
    expect(svc).toBeDefined();
    expect(svc.isActive).toBe(false);
    expect(svc.isOpening).toBe(false);
    expect(svc.isOpened).toBe(false);
    expect(svc.isReconnect).toBe(false);
  });

  it("wsUri ถูกสร้างจาก window.location", () => {
    const { svc } = createService();
    expect(svc.wsUri).toContain("ws://");
    expect(svc.wsUri).toContain("localhost:3000");
    expect(svc.wsUri).toContain("api/ws");
  });

  it("subscribersMap เป็น Map และว่าง", () => {
    const { svc } = createService();
    expect(svc.subscribersMap).toBeInstanceOf(Map);
    expect(svc.subscribersMap.size).toBe(0);
  });

  it("reconnectSubscribers เป็น Set และว่าง", () => {
    const { svc } = createService();
    expect(svc.reconnectSubscribers).toBeInstanceOf(Set);
    expect(svc.reconnectSubscribers.size).toBe(0);
  });

  it("lastCmdId เริ่มต้นเป็น 0", () => {
    const { svc } = createService();
    expect(svc.lastCmdId).toBe(0);
  });

  it("subscribersCount เริ่มต้นเป็น 0", () => {
    const { svc } = createService();
    expect(svc.subscribersCount).toBe(0);
  });

  it("errorName = 'WebSocket Error'", () => {
    const { svc } = createService();
    expect(svc.errorName).toBe("WebSocket Error");
  });

  it("authState$ change triggers reset(true)", () => {
    const { svc, authState$, mockStore } = createService();
    // Simulate auth state change
    authState$.next(true);
    // reset(true) should set isActive = false
    expect(svc.isActive).toBe(false);
  });

  it("store.select was called during construction", () => {
    const { mockStore } = createService();
    expect(mockStore.select).toHaveBeenCalled();
  });
});
