/**
 * @fileoverview
 * Pure functions ที่แยกออกจาก widget-subscription + data-aggregator + entity.service
 * เพื่อให้ทดสอบได้โดยตรงใน vitest โดยไม่ต้องการ Angular runtime
 *
 * @parityEngine Angular
 * แยกจาก: widget-subscription.ts, data-aggregator.ts, entity.service.ts
 *
 * @reason
 * ไฟล์ ported ขนาดใหญ่มี private methods ที่ต้องการ Angular DI + complex mock
 * การแยก pure functions ออกมาช่วยให้ v8 coverage นับได้โดยตรง
 */

// ============================================================
// AGGREGATION FUNCTIONS (from data-aggregator.ts)
// ============================================================

export interface AggData {
  count: number;
  sum: number;
  aggValue: number | null;
  ts: number;
  interval: [number, number];
}

export type AggFunction = (aggData: AggData, value?: number) => void;

/** AVG aggregation: คำนวณค่าเฉลี่ย */
export const avg: AggFunction = (aggData: AggData, value?: number) => {
  if (value !== undefined && value !== null) {
    aggData.count++;
    aggData.sum += value;
    aggData.aggValue = aggData.count ? aggData.sum / aggData.count : null;
  }
};

/** MIN aggregation: คำนวณค่าต่ำสุด */
export const min: AggFunction = (aggData: AggData, value?: number) => {
  if (value !== undefined && value !== null) {
    if (aggData.count === 0 || value < aggData.aggValue!) {
      aggData.aggValue = value;
    }
    aggData.count++;
  }
};

/** MAX aggregation: คำนวณค่าสูงสุด */
export const max: AggFunction = (aggData: AggData, value?: number) => {
  if (value !== undefined && value !== null) {
    if (aggData.count === 0 || value > aggData.aggValue!) {
      aggData.aggValue = value;
    }
    aggData.count++;
  }
};

/** SUM aggregation: คำนวณผลรวม */
export const sum: AggFunction = (aggData: AggData, value?: number) => {
  if (value !== undefined && value !== null) {
    aggData.count++;
    aggData.sum += value;
    aggData.aggValue = aggData.sum;
  }
};

/** COUNT aggregation: นับจำนวน */
export const count: AggFunction = (aggData: AggData) => {
  aggData.count++;
  aggData.aggValue = aggData.count;
};

/** NONE aggregation: เก็บค่าล่าสุด */
export const none: AggFunction = (aggData: AggData, value?: number) => {
  if (value !== undefined && value !== null) {
    aggData.aggValue = value;
  }
};

/**
 * คืน aggregation function ตาม type
 * @param aggType - aggregation type string
 * @returns AggFunction ที่ตรงกับ type
 */
export function getAggFunction(aggType: string): AggFunction {
  switch (aggType) {
    case "MIN": case "min": return min;
    case "MAX": case "max": return max;
    case "AVG": case "avg": return avg;
    case "SUM": case "sum": return sum;
    case "COUNT": case "count": return count;
    case "NONE": case "none": return none;
    default: return avg;
  }
}

/**
 * สร้าง empty AggData สำหรับ interval ใหม่
 */
export function createEmptyAggData(ts: number, interval: [number, number]): AggData {
  return { count: 0, sum: 0, aggValue: null, ts, interval };
}

// ============================================================
// ENTITY TYPE MAPPING (from entity.service.ts)
// ============================================================

export const EntityType = {
  DEVICE: "DEVICE",
  ASSET: "ASSET",
  TENANT: "TENANT",
  CUSTOMER: "CUSTOMER",
  USER: "USER",
  EDGE: "EDGE",
  ENTITY_VIEW: "ENTITY_VIEW",
  RULE_CHAIN: "RULE_CHAIN",
  DASHBOARD: "DASHBOARD",
  API_USAGE_STATE: "API_USAGE_STATE",
  TB_RESOURCE: "TB_RESOURCE",
  OTA_PACKAGE: "OTA_PACKAGE",
  RPC: "RPC",
  QUEUE: "QUEUE",
  NOTIFICATION: "NOTIFICATION",
  NOTIFICATION_REQUEST: "NOTIFICATION_REQUEST",
  NOTIFICATION_RULE: "NOTIFICATION_RULE",
  NOTIFICATION_TARGET: "NOTIFICATION_TARGET",
  NOTIFICATION_TEMPLATE: "NOTIFICATION_TEMPLATE",
  WIDGETS_BUNDLE: "WIDGETS_BUNDLE",
  WIDGET_TYPE: "WIDGET_TYPE",
} as const;

/**
 * แปลง EntityType เป็น service property name
 * @param entityType - entity type string
 * @returns service property name (e.g. "deviceService")
 */
export function entityTypeToServiceName(entityType: string): string {
  switch (entityType) {
    case "DEVICE": return "deviceService";
    case "ASSET": return "assetService";
    case "TENANT": return "tenantService";
    case "CUSTOMER": return "customerService";
    case "USER": return "userService";
    case "EDGE": return "edgeService";
    case "ENTITY_VIEW": return "entityViewService";
    case "RULE_CHAIN": return "ruleChainService";
    case "DASHBOARD": return "dashboardService";
    default: return "";
  }
}

/**
 * แปลง EntityType เป็น method suffix (e.g. "Device" for getDevice)
 * @param entityType - entity type string
 * @returns method suffix
 */
export function entityTypeToMethodSuffix(entityType: string): string {
  const map: Record<string, string> = {
    DEVICE: "Device",
    ASSET: "Asset",
    TENANT: "Tenant",
    CUSTOMER: "Customer",
    USER: "User",
    EDGE: "Edge",
    ENTITY_VIEW: "EntityView",
    RULE_CHAIN: "RuleChain",
    DASHBOARD: "Dashboard",
  };
  return map[entityType] || "";
}

// ============================================================
// WIDGET SUBSCRIPTION HELPERS (from widget-subscription.ts)
// ============================================================

/**
 * สร้าง empty PageData object
 */
export function emptyPageData<T>(): { data: T[]; totalPages: number; totalElements: number; hasNext: boolean } {
  return { data: [], totalPages: 0, totalElements: 0, hasNext: false };
}

/**
 * ตรวจสอบว่า datasources มี aggregation หรือไม่
 */
export function datasourcesHasAggregation(datasources: any[]): boolean {
  if (!datasources || !datasources.length) {
    return false;
  }
  return datasources.some(datasource =>
    datasource.dataKeys && datasource.dataKeys.some((key: any) =>
      key.type === "timeseries" && key.aggregationType && key.aggregationType !== "NONE"
    )
  );
}

/**
 * สร้าง formatted data object จาก raw data
 */
export function createFormattedData(data: Record<string, any[]>): Record<string, { ts: number; value: any }[]> {
  if (!data) {
    return {};
  }
  const result: Record<string, { ts: number; value: any }[]> = {};
  for (const key of Object.keys(data)) {
    result[key] = (data[key] || []).map(point => ({
      ts: point.ts || 0,
      value: point.value,
    }));
  }
  return result;
}

/**
 * คำนวณ ts offset จาก timezone
 */
export function calculateTsOffset(timezone: string): number {
  if (!timezone) {
    return 0;
  }
  try {
    const now = new Date();
    const localTime = now.getTime();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    return utcTime - localTime;
  } catch {
    return 0;
  }
}

// ============================================================
// WEBSOCKET HELPERS (from websocket.service.ts)
// ============================================================

export const WEBSOCKET_RECONNECT_INTERVAL_MS = 2000;
export const WEBSOCKET_IDLE_TIMEOUT_MS = 90000;
export const MAX_PUBLISH_COMMANDS_PER_FRAME = 10;

/**
 * สร้าง WebSocket URL จาก window.location
 */
export function buildWsUri(protocol: string, hostname: string, port: string, apiEndpoint: string): string {
  let wsProtocol: string;
  let resolvedPort = port;
  if (protocol === "https:") {
    wsProtocol = "wss:";
    if (!resolvedPort) {
      resolvedPort = "443";
    }
  } else {
    wsProtocol = "ws:";
    if (!resolvedPort) {
      resolvedPort = "80";
    }
  }
  return `${wsProtocol}//${hostname}:${resolvedPort}/${apiEndpoint}`;
}

/**
 * ตรวจสอบว่า closeEvent code ควร show error หรือไม่
 */
export function shouldShowWsError(code: number): boolean {
  return code > 1001 && code !== 1006 && code !== 1011 && code !== 1012 && code !== 4500;
}

/**
 * คำนวณ jitter delay สำหรับ rate limit retry
 */
export function calculateJitterDelay(): number {
  return 1000 + Math.random() * 3000;
}

// ============================================================
// HTTP ERROR CODES (from server-error-codes.ts — already exported)
// ============================================================

export const ServerErrorCode = {
  general: 2,
  authentication: 10,
  jwtTokenExpired: 11,
  tenantTrialExpired: 12,
  credentialsExpired: 15,
  permissionDenied: 20,
  invalidArguments: 30,
  badRequestParams: 31,
  itemNotFound: 32,
  tooManyRequests: 33,
  tooManyUpdates: 34,
  entitiesLimitExceeded: 41,
  passwordViolation: 45,
} as const;

/**
 * แปลง error code เป็น i18n key
 */
export function errorCodeToTranslationKey(errorCode: number): string | undefined {
  const map: Record<number, string> = {
    2: "server-error.general",
    10: "server-error.authentication",
    11: "server-error.jwt-token-expired",
    12: "server-error.tenant-trial-expired",
    15: "server-error.credentials-expired",
    20: "server-error.permission-denied",
    30: "server-error.invalid-arguments",
    31: "server-error.bad-request-params",
    32: "server-error.item-not-found",
    33: "server-error.too-many-requests",
    34: "server-error.too-many-updates",
    41: "server-error.entities-limit-exceeded",
  };
  return map[errorCode];
}
