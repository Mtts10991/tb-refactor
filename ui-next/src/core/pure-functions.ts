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

// ============================================================
// ENTITY DATA SUBSCRIPTION HELPERS (from entity-data-subscription.ts)
// ============================================================

/**
 * แปลง string value เป็น number ถ้าเป็น numeric string
 * parity กับ EntityDataSubscription.convertValue()
 *
 * @param val - value ที่ต้องการแปลง
 * @returns number ถ้าเป็น numeric string, มิฉะนั้นคืนค่าเดิม
 */
export function convertValue(val: string): any {
  if (val && isNumericString(val) && Number(val).toString() === val) {
    return Number(val);
  }
  return val;
}

/**
 * ตรวจสอบว่า string เป็น numeric หรือไม่
 */
export function isNumericString(val: string): boolean {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  if (trimmed === "") return false;
  return !isNaN(Number(trimmed));
}

/**
 * สร้าง EntityKey array จาก dataKeys ตาม type
 *
 * @param dataKeys - array of data key objects
 * @param keyType - type to filter (e.g. "timeseries", "attribute", "entityField")
 * @returns array of EntityKey objects
 */
export function buildEntityKeys(dataKeys: any[], keyType: string): Array<{ type: string; key: string }> {
  if (!dataKeys || !dataKeys.length) return [];
  return dataKeys
    .filter(key => key.type === keyType)
    .map(key => ({ type: keyTypeToKeyType(keyType), key: key.name }));
}

/**
 * แปลง dataKey type เป็น EntityKey type
 */
export function keyTypeToKeyType(keyType: string): string {
  switch (keyType) {
    case "timeseries": return "TIME_SERIES";
    case "attribute": return "ATTRIBUTE";
    case "entityField": return "ENTITY_FIELD";
    case "alarm": return "ALARM_FIELD";
    default: return keyType.toUpperCase();
  }
}

/**
 * สร้าง page data object สำหรับ function datasource
 *
 * @param dataKeys - data keys for the function
 * @param pageLink - pagination info
 * @returns PageData with single entity data
 */
export function createFunctionPageData(dataKeys: any[], pageLink: any): any {
  return {
    data: [{
      entityId: { entityType: "FUNCTION", id: "function-0" },
      latest: {},
      timeseries: {},
    }],
    totalPages: 1,
    totalElements: 1,
    hasNext: false,
  };
}

/**
 * คำนวณ comparison value ระหว่าง current และ previous
 *
 * @param currentVal - current value
 * @param prevVal - previous value
 * @param resultType - comparison result type
 * @returns calculated comparison value
 */
export function calculateComparisonValue(
  currentVal: number,
  prevVal: number,
  resultType: string,
): number {
  switch (resultType) {
    case "PREVIOUS_VALUE":
      return prevVal;
    case "DELTA_ABSOLUTE":
      return currentVal - prevVal;
    case "DELTA_PERCENT":
      return prevVal !== 0 ? ((currentVal - prevVal) / Math.abs(prevVal)) * 100 : 0;
    default:
      return currentVal - prevVal;
  }
}

// ============================================================
// ALIAS CONTROLLER HELPERS (from alias-controller.ts)
// ============================================================

/**
 * ตั้งชื่อ datasource สำหรับ function/entityCount/alarmCount types
 *
 * @param datasource - datasource object
 * @param index - index counter
 * @returns datasource ที่มี name/aliasName/entityName ตั้งค่าแล้ว
 */
export function setDatasourceNames(datasource: any, functionIndex: number, entityCountIndex: number, alarmCountIndex: number): { datasource: any; functionIndex: number; entityCountIndex: number; alarmCountIndex: number } {
  if (datasource.type === "function") {
    const name = datasource.name && datasource.name.length ? datasource.name : "function";
    datasource.name = name;
    datasource.aliasName = name;
    datasource.entityName = name;
    datasource.entityId = { entityType: "FUNCTION", id: `function-${functionIndex}` };
    functionIndex++;
  } else if (datasource.type === "entityCount") {
    datasource.entityId = { entityType: "COUNT", id: `entityCount-${entityCountIndex}` };
    entityCountIndex++;
  } else if (datasource.type === "alarmCount") {
    datasource.entityId = { entityType: "ALARM_COUNT", id: `alarmCount-${alarmCountIndex}` };
    alarmCountIndex++;
  }
  return { datasource, functionIndex, entityCountIndex, alarmCountIndex };
}

/**
 * ตรวจสอบว่า entity alias เปลี่ยนแปลงหรือไม่
 *
 * @param newAlias - new entity alias
 * @param prevAlias - previous entity alias
 * @returns true ถ้าเปลี่ยนแปลง
 */
export function hasAliasChanged(newAlias: any, prevAlias: any): boolean {
  if (!prevAlias) return true;
  return JSON.stringify(newAlias) !== JSON.stringify(prevAlias);
}

/**
 * ตรวจสอบว่า filter เปลี่ยนแปลงหรือไม่
 *
 * @param newFilter - new filter
 * @param prevFilter - previous filter
 * @returns true ถ้าเปลี่ยนแปลง
 */
export function hasFilterChanged(newFilter: any, prevFilter: any): boolean {
  if (!prevFilter) return true;
  return JSON.stringify(newFilter) !== JSON.stringify(prevFilter);
}

/**
 * สร้าง unique key สำหรับ datasource
 *
 * @param datasource - datasource object
 * @returns unique key string
 */
export function createDatasourceKey(datasource: any): string {
  if (!datasource) return "";
  const parts: string[] = [];
  if (datasource.entityAliasId) parts.push(`alias:${datasource.entityAliasId}`);
  if (datasource.entityId) parts.push(`entity:${datasource.entityId.entityType}:${datasource.entityId.id}`);
  if (datasource.type) parts.push(`type:${datasource.type}`);
  return parts.join("|");
}

// ============================================================
// ENTITY SERVICE HELPERS (from entity.service.ts)
// ============================================================

/**
 * แปลง EntityType เป็น plural form (สำหรับ URL)
 *
 * @param entityType - entity type
 * @returns plural form (e.g. "devices" for "DEVICE")
 */
export function entityTypeToPluralUrl(entityType: string): string {
  const map: Record<string, string> = {
    DEVICE: "devices",
    ASSET: "assets",
    TENANT: "tenants",
    CUSTOMER: "customers",
    USER: "users",
    EDGE: "edges",
    ENTITY_VIEW: "entityViews",
    RULE_CHAIN: "ruleChains",
    DASHBOARD: "dashboards",
  };
  return map[entityType] || entityType.toLowerCase() + "s";
}

/**
 * แปลง EntityType เป็น singular URL segment
 *
 * @param entityType - entity type
 * @returns singular URL segment (e.g. "device" for "DEVICE")
 */
export function entityTypeToSingularUrl(entityType: string): string {
  const map: Record<string, string> = {
    DEVICE: "device",
    ASSET: "asset",
    TENANT: "tenant",
    CUSTOMER: "customer",
    USER: "user",
    EDGE: "edge",
    ENTITY_VIEW: "entityView",
    RULE_CHAIN: "ruleChain",
    DASHBOARD: "dashboard",
  };
  return map[entityType] || entityType.toLowerCase();
}

/**
 * สร้าง CSV row จาก entity data
 *
 * @param entity - entity object
 * @param columns - column definitions
 * @returns CSV string row
 */
export function entityToCsvRow(entity: any, columns: string[]): string {
  if (!entity) return "";
  return columns
    .map(col => {
      const val = entity[col];
      if (val === undefined || val === null) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    })
    .join(",");
}

/**
 * Parse CSV line เป็น array ของ values
 *
 * @param line - CSV line string
 * @returns array of string values
 */
export function parseCsvLine(line: string): string[] {
  if (!line) return [];
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * สร้าง ImportEntityData จาก CSV row
 *
 * @param headers - CSV header columns
 * @param values - CSV row values
 * @returns ImportEntityData object
 */
export function csvRowToEntityData(headers: string[], values: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (let i = 0; i < headers.length && i < values.length; i++) {
    const header = headers[i].trim();
    const value = values[i].trim();
    if (header && value) {
      result[header] = convertValue(value);
    }
  }
  return result;
}
