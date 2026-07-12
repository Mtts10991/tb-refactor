/**
 * @fileoverview
 * Parity test fixtures สำหรับ 5 HTTP services สำคัญของ ThingsBoard
 * (customer, device, dashboard, alarm, user)
 *
 * แต่ละ fixture คือ "expected request snapshot" ที่ capture จาก
 * Angular เดิม — ใช้สำหรับยืนยันว่า Next.js service port แล้วส่ง request
 * เหมือนกัน byte-for-byte (URL, HTTP method, headers, body)
 *
 * @parityEngine Angular
 * อ้างอิงจาก: ui-ngx/src/app/core/http/{customer,device,dashboard,alarm,user}.service.ts
 *
 * @reason
 * Acceptance criteria ของ Phase 1: "Parity HTTP: parity test services ผ่าน"
 * Fixtures เหล่านี้เป็นมาตรฐานที่ Next.js services ต้องผ่าน
 */

/**
 * Snapshot ของ HTTP request ที่ service ส่งออก (1 method = 1 snapshot)
 */
export interface ServiceCallExpectation {
  /** ชื่อ service class (เช่น "CustomerService") */
  readonly service: string;

  /** ชื่อ method ที่เรียก (เช่น "getCustomers") */
  readonly method: string;

  /** HTTP method (GET/POST/PUT/DELETE) */
  readonly httpMethod: string;

  /** URL ที่คาดหวัง (relative path เช่น "/api/customers?pageSize=10&page=0") */
  readonly expectedUrl: string;

  /** Body ที่คาดหวัง (null ถ้าไม่มี body) */
  readonly expectedBody: unknown;

  /** Content-Type header ที่คาดหวัง (default: "application/json") */
  readonly expectedContentType: string;

  /** responseType ที่คาดหวัง (default: "json") */
  readonly expectedResponseType: "json" | "text" | "blob" | "arraybuffer";
}

/**
 * Default headers ที่ทุก method ของ Angular services ส่ง
 * (มาจาก defaultHttpOptionsFromConfig → defaultHttpOptions)
 */
export const DEFAULT_CONTENT_TYPE = "application/json";

/**
 * Fixtures สำหรับ CustomerService (5 methods — CRUD ครบ)
 * ParityEngine: ui-ngx/src/app/core/http/customer.service.ts
 */
export const customerServiceFixtures: readonly ServiceCallExpectation[] = [
  {
    service: "CustomerService",
    method: "getCustomers",
    httpMethod: "GET",
    expectedUrl: "/api/customers?pageSize=10&page=0",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "CustomerService",
    method: "getCustomer",
    httpMethod: "GET",
    expectedUrl: "/api/customer/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "CustomerService",
    method: "getCustomersByIds",
    httpMethod: "GET",
    expectedUrl: "/api/customers?customerIds=13814000-1dd2-11b2-8080-808080808080,13814000-1dd2-11b2-8080-808080808081",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "CustomerService",
    method: "saveCustomer",
    httpMethod: "POST",
    expectedUrl: "/api/customer",
    expectedBody: { title: "Test Customer", additionalInfo: { description: "test" } },
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "CustomerService",
    method: "deleteCustomer",
    httpMethod: "DELETE",
    expectedUrl: "/api/customer/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
];

/**
 * Fixtures สำหรับ DeviceService (10 methods ที่ใช้บ่อย — ไม่รวม sync XHR)
 * ParityEngine: ui-ngx/src/app/core/http/device.service.ts
 */
export const deviceServiceFixtures: readonly ServiceCallExpectation[] = [
  {
    service: "DeviceService",
    method: "getTenantDeviceInfos",
    httpMethod: "GET",
    expectedUrl: "/api/tenant/deviceInfos?pageSize=10&page=0&type=",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DeviceService",
    method: "getDevice",
    httpMethod: "GET",
    expectedUrl: "/api/device/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DeviceService",
    method: "getDevices",
    httpMethod: "GET",
    expectedUrl: "/api/devices?deviceIds=13814000-1dd2-11b2-8080-808080808080,13814000-1dd2-11b2-8080-808080808081",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DeviceService",
    method: "getDeviceInfo",
    httpMethod: "GET",
    expectedUrl: "/api/device/info/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DeviceService",
    method: "saveDevice",
    httpMethod: "POST",
    expectedUrl: "/api/device",
    expectedBody: { name: "Test Device", type: "default" },
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DeviceService",
    method: "deleteDevice",
    httpMethod: "DELETE",
    expectedUrl: "/api/device/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DeviceService",
    method: "getDeviceTypes",
    httpMethod: "GET",
    expectedUrl: "/api/device/types",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DeviceService",
    method: "saveDeviceCredentials",
    httpMethod: "POST",
    expectedUrl: "/api/device/credentials",
    expectedBody: { deviceId: "13814000-1dd2-11b2-8080-808080808080", credentialsType: "ACCESS_TOKEN", credentialsId: "test-token" },
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DeviceService",
    method: "sendOneWayRpcCommand",
    httpMethod: "POST",
    expectedUrl: "/api/rpc/oneway/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: { method: "setValue", params: { value: 42 } },
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DeviceService",
    method: "sendTwoWayRpcCommand",
    httpMethod: "POST",
    expectedUrl: "/api/rpc/twoway/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: { method: "getValue", params: {} },
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
];

/**
 * Fixtures สำหรับ DashboardService (8 methods ที่ใช้บ่อย)
 * ParityEngine: ui-ngx/src/app/core/http/dashboard.service.ts
 */
export const dashboardServiceFixtures: readonly ServiceCallExpectation[] = [
  {
    service: "DashboardService",
    method: "getTenantDashboards",
    httpMethod: "GET",
    expectedUrl: "/api/tenant/dashboards?pageSize=10&page=0",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DashboardService",
    method: "getDashboard",
    httpMethod: "GET",
    expectedUrl: "/api/dashboard/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DashboardService",
    method: "getDashboardInfo",
    httpMethod: "GET",
    expectedUrl: "/api/dashboard/info/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DashboardService",
    method: "saveDashboard",
    httpMethod: "POST",
    expectedUrl: "/api/dashboard",
    expectedBody: { title: "Test Dashboard" },
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DashboardService",
    method: "deleteDashboard",
    httpMethod: "DELETE",
    expectedUrl: "/api/dashboard/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DashboardService",
    method: "assignDashboardToCustomer",
    httpMethod: "POST",
    expectedUrl: "/api/customer/13814000-1dd2-11b2-8080-808080808080/dashboard/13814000-1dd2-11b2-8080-808080808081",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DashboardService",
    method: "makeDashboardPublic",
    httpMethod: "POST",
    expectedUrl: "/api/customer/public/dashboard/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "DashboardService",
    method: "getHomeDashboard",
    httpMethod: "GET",
    expectedUrl: "/api/dashboard/home",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
];

/**
 * Fixtures สำหรับ AlarmService (8 methods)
 * ParityEngine: ui-ngx/src/app/core/http/alarm.service.ts
 */
export const alarmServiceFixtures: readonly ServiceCallExpectation[] = [
  {
    service: "AlarmService",
    method: "getAlarm",
    httpMethod: "GET",
    expectedUrl: "/api/alarm/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "AlarmService",
    method: "getAlarmInfo",
    httpMethod: "GET",
    expectedUrl: "/api/alarm/info/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "AlarmService",
    method: "saveAlarm",
    httpMethod: "POST",
    expectedUrl: "/api/alarm",
    expectedBody: { type: "High Temperature", severity: "CRITICAL", originator: { entityType: "DEVICE", id: "13814000-1dd2-11b2-8080-808080808080" } },
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "AlarmService",
    method: "ackAlarm",
    httpMethod: "POST",
    expectedUrl: "/api/alarm/13814000-1dd2-11b2-8080-808080808080/ack",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "AlarmService",
    method: "clearAlarm",
    httpMethod: "POST",
    expectedUrl: "/api/alarm/13814000-1dd2-11b2-8080-808080808080/clear",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "AlarmService",
    method: "deleteAlarm",
    httpMethod: "DELETE",
    expectedUrl: "/api/alarm/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "AlarmService",
    method: "assignAlarm",
    httpMethod: "POST",
    expectedUrl: "/api/alarm/13814000-1dd2-11b2-8080-808080808080/assign/13814000-1dd2-11b2-8080-808080808081",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "AlarmService",
    method: "unassignAlarm",
    httpMethod: "DELETE",
    expectedUrl: "/api/alarm/13814000-1dd2-11b2-8080-808080808080/assign",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
];

/**
 * Fixtures สำหรับ UserService (7 methods)
 * ParityEngine: ui-ngx/src/app/core/http/user.service.ts
 */
export const userServiceFixtures: readonly ServiceCallExpectation[] = [
  {
    service: "UserService",
    method: "getUsers",
    httpMethod: "GET",
    expectedUrl: "/api/users?pageSize=10&page=0",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "UserService",
    method: "getUser",
    httpMethod: "GET",
    expectedUrl: "/api/user/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "UserService",
    method: "saveUser",
    httpMethod: "POST",
    expectedUrl: "/api/user?sendActivationMail=false",
    expectedBody: { email: "test@example.com", authority: "TENANT_ADMIN" },
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "UserService",
    method: "deleteUser",
    httpMethod: "DELETE",
    expectedUrl: "/api/user/13814000-1dd2-11b2-8080-808080808080",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "UserService",
    method: "getUsersByIds",
    httpMethod: "GET",
    expectedUrl: "/api/users?userIds=13814000-1dd2-11b2-8080-808080808080,13814000-1dd2-11b2-8080-808080808081",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "UserService",
    method: "sendActivationEmail",
    httpMethod: "POST",
    expectedUrl: "/api/user/sendActivationMail?email=test%40example.com",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "json",
  },
  {
    service: "UserService",
    method: "getActivationLink",
    httpMethod: "GET",
    expectedUrl: "/api/user/13814000-1dd2-11b2-8080-808080808080/activationLink",
    expectedBody: null,
    expectedContentType: DEFAULT_CONTENT_TYPE,
    expectedResponseType: "text",
  },
];

/**
 * รวม fixtures ทั้ง 5 services
 */
export const allServiceFixtures: Readonly<Record<string, readonly ServiceCallExpectation[]>> = {
  CustomerService: customerServiceFixtures,
  DeviceService: deviceServiceFixtures,
  DashboardService: dashboardServiceFixtures,
  AlarmService: alarmServiceFixtures,
  UserService: userServiceFixtures,
};

/**
 * จำนวน fixtures ทั้งหมด
 */
export const TOTAL_FIXTURES_COUNT = Object.values(allServiceFixtures).reduce(
  (total, fixtures) => total + fixtures.length,
  0,
);
