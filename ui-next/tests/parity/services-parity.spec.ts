/**
 * @fileoverview
 * Parity test specs สำหรับ 5 HTTP services สำคัญ (customer, device, dashboard, alarm, user)
 *
 * วิธีการทำงาน:
 *   1. สร้าง HttpClientCaptor (mock HttpClient ที่จดทุก call)
 *   2. สร้าง service instance โดย inject captor เป็น httpClient
 *   3. เรียก method ของ service แล้วตรวจ capturedCalls ว่าตรงกับ fixture
 *
 * @parityEngine Angular
 * parity กับ: ui-ngx/src/app/core/http/{customer,device,dashboard,alarm,user}.service.ts
 *
 * @reason
 * Acceptance criteria ของ Phase 1: "Parity HTTP: parity test services ผ่าน"
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EMPTY } from "rxjs";
import { HttpClientCaptor, type CapturedHttpCall } from "./http-client-captor";
import { MockPageLink, SAMPLE_UUID_1, SAMPLE_UUID_2 } from "./test-helpers";
import {
  customerServiceFixtures,
  deviceServiceFixtures,
  dashboardServiceFixtures,
  alarmServiceFixtures,
  userServiceFixtures,
  type ServiceCallExpectation,
} from "./service-call-fixtures";

// Import services ที่จะ test
import { CustomerService } from "../../src/core/http/services/customer.service";
import { DeviceService } from "../../src/core/http/services/device.service";
import { DashboardService } from "../../src/core/http/services/dashboard.service";
import { AlarmService } from "../../src/core/http/services/alarm.service";
import { UserService } from "../../src/core/http/services/user.service";

/**
 * Helper: ตรวจว่า captured call ตรงกับ expectation หรือไม่
 */
function assertCallMatchesExpectation(
  call: CapturedHttpCall,
  expectation: ServiceCallExpectation,
): void {
  expect(call.method, `${expectation.service}.${expectation.method}: HTTP method`).toBe(
    expectation.httpMethod,
  );
  expect(call.url, `${expectation.service}.${expectation.method}: URL`).toBe(
    expectation.expectedUrl,
  );

  // Body check (deep equality)
  if (expectation.expectedBody !== null) {
    expect(call.body, `${expectation.service}.${expectation.method}: body`).toEqual(
      expectation.expectedBody,
    );
  }

  // Content-Type header check
  if (call.options?.headers) {
    const contentType = (call.options.headers as Record<string, string>)["Content-Type"];
    expect(contentType, `${expectation.service}.${expectation.method}: Content-Type`).toBe(
      expectation.expectedContentType,
    );
  }

  // responseType check (for getActivationLink which uses "text")
  if (expectation.expectedResponseType !== "json") {
    expect(call.options?.responseType, `${expectation.service}.${expectation.method}: responseType`).toBe(
      expectation.expectedResponseType,
    );
  }
}

// ============================================================
// CustomerService parity tests
// ============================================================
describe("CustomerService parity", () => {
  let captor: HttpClientCaptor;
  let service: CustomerService;

  beforeEach(() => {
    captor = new HttpClientCaptor();
    service = new CustomerService(captor.asHttpClient() as any);
  });

  it.each(customerServiceFixtures.map((fixture, index) => ({ fixture, index })))(
    "$fixture.method — parity กับ Angular ($fixture.httpMethod $fixture.expectedUrl)",
    ({ fixture }: { fixture: ServiceCallExpectation }) => {
      const pageLink = new MockPageLink();

      switch (fixture.method) {
        case "getCustomers":
          service.getCustomers(pageLink as any).subscribe();
          break;
        case "getCustomer":
          service.getCustomer(SAMPLE_UUID_1).subscribe();
          break;
        case "getCustomersByIds":
          service.getCustomersByIds([SAMPLE_UUID_1, SAMPLE_UUID_2]).subscribe();
          break;
        case "saveCustomer":
          service.saveCustomer({ title: "Test Customer", additionalInfo: { description: "test" } } as any).subscribe();
          break;
        case "deleteCustomer":
          service.deleteCustomer(SAMPLE_UUID_1).subscribe();
          break;
        default:
          throw new Error(`Unmapped method: ${fixture.method}`);
      }

      const lastCall = captor.getLastCall();
      expect(lastCall).toBeDefined();
      assertCallMatchesExpectation(lastCall!, fixture);
    },
  );
});

// ============================================================
// DeviceService parity tests
// ============================================================
describe("DeviceService parity", () => {
  let captor: HttpClientCaptor;
  let service: DeviceService;

  beforeEach(() => {
    captor = new HttpClientCaptor();
    service = new DeviceService(captor.asHttpClient() as any, {} as any);
  });

  it.each(deviceServiceFixtures.map((fixture, index) => ({ fixture, index })))(
    "$fixture.method — parity กับ Angular ($fixture.httpMethod $fixture.expectedUrl)",
    ({ fixture }: { fixture: ServiceCallExpectation }) => {
      const pageLink = new MockPageLink();

      switch (fixture.method) {
        case "getTenantDeviceInfos":
          service.getTenantDeviceInfos(pageLink as any, "").subscribe();
          break;
        case "getDevice":
          service.getDevice(SAMPLE_UUID_1).subscribe();
          break;
        case "getDevices":
          service.getDevices([SAMPLE_UUID_1, SAMPLE_UUID_2]).subscribe();
          break;
        case "getDeviceInfo":
          service.getDeviceInfo(SAMPLE_UUID_1).subscribe();
          break;
        case "saveDevice":
          service.saveDevice({ name: "Test Device", type: "default" } as any).subscribe();
          break;
        case "deleteDevice":
          service.deleteDevice(SAMPLE_UUID_1).subscribe();
          break;
        case "getDeviceTypes":
          service.getDeviceTypes().subscribe();
          break;
        case "saveDeviceCredentials":
          service.saveDeviceCredentials({ deviceId: SAMPLE_UUID_1, credentialsType: "ACCESS_TOKEN", credentialsId: "test-token" } as any).subscribe();
          break;
        case "sendOneWayRpcCommand":
          service.sendOneWayRpcCommand(SAMPLE_UUID_1, { method: "setValue", params: { value: 42 } }).subscribe();
          break;
        case "sendTwoWayRpcCommand":
          service.sendTwoWayRpcCommand(SAMPLE_UUID_1, { method: "getValue", params: {} }).subscribe();
          break;
        default:
          throw new Error(`Unmapped method: ${fixture.method}`);
      }

      const lastCall = captor.getLastCall();
      expect(lastCall).toBeDefined();
      assertCallMatchesExpectation(lastCall!, fixture);
    },
  );
});

// ============================================================
// DashboardService parity tests
// ============================================================
describe("DashboardService parity", () => {
  let captor: HttpClientCaptor;
  let service: DashboardService;

  beforeEach(() => {
    captor = new HttpClientCaptor();
    // DashboardService constructor reads router.url และ subscribes router.events
    // ให้ mock router ที่มี url + events observable
    const mockRouter = {
      url: "/dashboards",
      events: EMPTY,
    };
    const mockWindow = {
      location: { protocol: "http:", hostname: "localhost", port: "3000" },
    };
    service = new DashboardService(captor.asHttpClient() as any, mockRouter as any, mockWindow as any);
  });

  it.each(dashboardServiceFixtures.map((fixture, index) => ({ fixture, index })))(
    "$fixture.method — parity กับ Angular ($fixture.httpMethod $fixture.expectedUrl)",
    ({ fixture }: { fixture: ServiceCallExpectation }) => {
      const pageLink = new MockPageLink();

      switch (fixture.method) {
        case "getTenantDashboards":
          service.getTenantDashboards(pageLink as any).subscribe();
          break;
        case "getDashboard":
          service.getDashboard(SAMPLE_UUID_1).subscribe();
          break;
        case "getDashboardInfo":
          service.getDashboardInfo(SAMPLE_UUID_1).subscribe();
          break;
        case "saveDashboard":
          service.saveDashboard({ title: "Test Dashboard" } as any).subscribe();
          break;
        case "deleteDashboard":
          service.deleteDashboard(SAMPLE_UUID_1).subscribe();
          break;
        case "assignDashboardToCustomer":
          service.assignDashboardToCustomer(SAMPLE_UUID_1, SAMPLE_UUID_2).subscribe();
          break;
        case "makeDashboardPublic":
          service.makeDashboardPublic(SAMPLE_UUID_1).subscribe();
          break;
        case "getHomeDashboard":
          service.getHomeDashboard().subscribe();
          break;
        default:
          throw new Error(`Unmapped method: ${fixture.method}`);
      }

      const lastCall = captor.getLastCall();
      expect(lastCall).toBeDefined();
      assertCallMatchesExpectation(lastCall!, fixture);
    },
  );
});

// ============================================================
// AlarmService parity tests
// ============================================================
describe("AlarmService parity", () => {
  let captor: HttpClientCaptor;
  let service: AlarmService;

  beforeEach(() => {
    captor = new HttpClientCaptor();
    service = new AlarmService(captor.asHttpClient() as any);
  });

  it.each(alarmServiceFixtures.map((fixture, index) => ({ fixture, index })))(
    "$fixture.method — parity กับ Angular ($fixture.httpMethod $fixture.expectedUrl)",
    ({ fixture }: { fixture: ServiceCallExpectation }) => {
      switch (fixture.method) {
        case "getAlarm":
          service.getAlarm(SAMPLE_UUID_1).subscribe();
          break;
        case "getAlarmInfo":
          service.getAlarmInfo(SAMPLE_UUID_1).subscribe();
          break;
        case "saveAlarm":
          service.saveAlarm({ type: "High Temperature", severity: "CRITICAL", originator: { entityType: "DEVICE", id: SAMPLE_UUID_1 } } as any).subscribe();
          break;
        case "ackAlarm":
          service.ackAlarm(SAMPLE_UUID_1).subscribe();
          break;
        case "clearAlarm":
          service.clearAlarm(SAMPLE_UUID_1).subscribe();
          break;
        case "deleteAlarm":
          service.deleteAlarm(SAMPLE_UUID_1).subscribe();
          break;
        case "assignAlarm":
          service.assignAlarm(SAMPLE_UUID_1, SAMPLE_UUID_2).subscribe();
          break;
        case "unassignAlarm":
          service.unassignAlarm(SAMPLE_UUID_1).subscribe();
          break;
        default:
          throw new Error(`Unmapped method: ${fixture.method}`);
      }

      const lastCall = captor.getLastCall();
      expect(lastCall).toBeDefined();
      assertCallMatchesExpectation(lastCall!, fixture);
    },
  );
});

// ============================================================
// UserService parity tests
// ============================================================
describe("UserService parity", () => {
  let captor: HttpClientCaptor;
  let service: UserService;

  beforeEach(() => {
    captor = new HttpClientCaptor();
    service = new UserService(captor.asHttpClient() as any);
  });

  it.each(userServiceFixtures.map((fixture, index) => ({ fixture, index })))(
    "$fixture.method — parity กับ Angular ($fixture.httpMethod $fixture.expectedUrl)",
    ({ fixture }: { fixture: ServiceCallExpectation }) => {
      const pageLink = new MockPageLink();

      switch (fixture.method) {
        case "getUsers":
          service.getUsers(pageLink as any).subscribe();
          break;
        case "getUser":
          service.getUser(SAMPLE_UUID_1).subscribe();
          break;
        case "saveUser":
          service.saveUser({ email: "test@example.com", authority: "TENANT_ADMIN" } as any, false).subscribe();
          break;
        case "deleteUser":
          service.deleteUser(SAMPLE_UUID_1).subscribe();
          break;
        case "getUsersByIds":
          service.getUsersByIds([SAMPLE_UUID_1, SAMPLE_UUID_2]).subscribe();
          break;
        case "sendActivationEmail":
          service.sendActivationEmail("test@example.com").subscribe();
          break;
        case "getActivationLink":
          service.getActivationLink(SAMPLE_UUID_1).subscribe();
          break;
        default:
          throw new Error(`Unmapped method: ${fixture.method}`);
      }

      const lastCall = captor.getLastCall();
      expect(lastCall).toBeDefined();
      assertCallMatchesExpectation(lastCall!, fixture);
    },
  );
});
