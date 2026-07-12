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

import { Observable } from "rxjs";

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

// ============================================================
// WIDGET SUBSCRIPTION PURE LOGIC (from widget-subscription.ts)
// ============================================================

/**
 * อัปเดต latest data ใน datasources
 * parity กับ onLatestDataUpdated
 */
export function updateLatestData(
  datasources: any[],
  data: Record<string, any[]>,
  latestData: Record<string, any>,
): void {
  if (!datasources || !data) return;
  for (const datasource of datasources) {
    if (datasource.dataKeys) {
      for (const key of datasource.dataKeys) {
        if (key.type === "attribute" || key.type === "entityField") {
          const keyName = key.name;
          if (data[keyName] && data[keyName].length > 0) {
            const latestValue = data[keyName][data[keyName].length - 1];
            if (!latestData[datasource.entityId?.id]) {
              latestData[datasource.entityId?.id] = {};
            }
            latestData[datasource.entityId.id][keyName] = latestValue.value;
          }
        }
      }
    }
  }
}

/**
 * คำนวณ legend data จาก subscription data
 */
export function calculateLegendData(
  data: Record<string, any[]>,
  legendConfig: any,
): { min: number[]; max: number[]; avg: number[]; total: number[]; latest: number[] } {
  const keys = Object.keys(data);
  const result = {
    min: new Array(keys.length).fill(null),
    max: new Array(keys.length).fill(null),
    avg: new Array(keys.length).fill(null),
    total: new Array(keys.length).fill(null),
    latest: new Array(keys.length).fill(null),
  };
  keys.forEach((key, index) => {
    const values = data[key];
    if (values && values.length > 0) {
      const nums = values.map(v => typeof v.value === "number" ? v.value : null).filter(v => v !== null) as number[];
      if (nums.length > 0) {
        if (legendConfig?.showMin) result.min[index] = Math.min(...nums);
        if (legendConfig?.showMax) result.max[index] = Math.max(...nums);
        if (legendConfig?.showAvg) result.avg[index] = nums.reduce((a, b) => a + b, 0) / nums.length;
        if (legendConfig?.showTotal) result.total[index] = nums.reduce((a, b) => a + b, 0);
        if (legendConfig?.showLatest) result.latest[index] = nums[nums.length - 1];
      }
    }
  });
  return result;
}

/**
 * ตรวจสอบว่า RPC target device ถูกต้องหรือไม่
 */
export function checkRpcTargetValid(
  targetDevice: any,
  resolvedEntity: any,
): { valid: boolean; reason?: string } {
  if (!targetDevice) {
    return { valid: false, reason: "target-device-is-not-set" };
  }
  if (!resolvedEntity) {
    return { valid: false, reason: "failed-to-resolve-target-device" };
  }
  if (resolvedEntity.entityType !== "DEVICE") {
    return { valid: false, reason: "invalid-target-entity" };
  }
  return { valid: true };
}

/**
 * ตรวจสอบ alarm source filters
 */
export function checkAlarmSourceValid(
  alarmSource: any,
  resolvedSource: any,
): { valid: boolean; reason?: string } {
  if (!alarmSource) {
    return { valid: false, reason: "alarm-source-not-set" };
  }
  if (!resolvedSource) {
    return { valid: false, reason: "failed-to-resolve-alarm-source" };
  }
  return { valid: true };
}

// ============================================================
// ENTITY SERVICE PURE LOGIC (from entity.service.ts)
// ============================================================

/**
 * สร้าง entity filter types ตาม entity types ที่รองรับ
 */
export function getAliasFilterTypesForEntityTypes(entityTypes: string[]): string[] {
  const allFilterTypes = [
    { type: "singleEntity", supported: ["DEVICE", "ASSET", "TENANT", "CUSTOMER", "USER", "EDGE", "ENTITY_VIEW", "DASHBOARD", "RULE_CHAIN"] },
    { type: "entityList", supported: ["DEVICE", "ASSET", "TENANT", "CUSTOMER", "USER", "EDGE", "ENTITY_VIEW", "DASHBOARD", "RULE_CHAIN"] },
    { type: "entityName", supported: ["DEVICE", "ASSET", "TENANT", "CUSTOMER", "USER", "EDGE", "ENTITY_VIEW", "DASHBOARD", "RULE_CHAIN"] },
    { type: "entityType", supported: ["DEVICE", "ASSET", "TENANT", "CUSTOMER", "USER", "EDGE", "ENTITY_VIEW"] },
    { type: "apiUsageState", supported: ["CUSTOMER", "TENANT"] },
    { type: "relationsQuery", supported: ["DEVICE", "ASSET", "TENANT", "CUSTOMER", "USER", "EDGE", "ENTITY_VIEW", "DASHBOARD", "RULE_CHAIN"] },
    { type: "assetSearchQuery", supported: ["DEVICE", "EDGE"] },
    { type: "deviceSearchQuery", supported: ["ASSET", "EDGE"] },
    { type: "entityViewSearchQuery", supported: ["DEVICE", "ASSET", "EDGE"] },
    { type: "edgeSearchQuery", supported: ["DEVICE", "ASSET", "ENTITY_VIEW"] },
  ];
  return allFilterTypes
    .filter(ft => entityTypes.some(et => ft.supported.includes(et)))
    .map(ft => ft.type);
}

/**
 * กรอง alias ตาม entity types
 */
export function filterAliasByEntityTypesImpl(
  entityAlias: any,
  entityTypes: string[],
): boolean {
  if (!entityAlias || !entityAlias.filter) {
    return false;
  }
  const filter = entityAlias.filter;
  if (filter.singleEntity) {
    return entityTypes.includes(filter.singleEntity.entityType);
  }
  if (filter.entityList) {
    return entityTypes.includes(filter.entityList.entityType);
  }
  if (filter.entityName) {
    return entityTypes.includes(filter.entityName.entityType);
  }
  if (filter.entityType) {
    return entityTypes.includes(filter.entityType);
  }
  return true;
}

/**
 * เตรียม allowed entity types list
 */
export function prepareAllowedEntityTypesImpl(
  allowedEntityTypes: string[],
  isTenantAdmin: boolean,
): string[] {
  if (!allowedEntityTypes || !allowedEntityTypes.length) {
    if (isTenantAdmin) {
      return ["DEVICE", "ASSET", "ENTITY_VIEW", "TENANT", "CUSTOMER", "EDGE", "DASHBOARD", "RULE_CHAIN"];
    } else {
      return ["DEVICE", "ASSET", "ENTITY_VIEW"];
    }
  }
  return allowedEntityTypes;
}

// ============================================================
// DATA AGGREGATOR PURE LOGIC (from data-aggregator.ts)
// ============================================================

/**
 * คำนวณ aggregation interval สำหรับ timestamp
 */
export function calculateAggInterval(
  startTs: number,
  endTs: number,
  timestamp: number,
  aggType: string,
): [number, number] {
  if (aggType === "NONE") {
    return [timestamp, timestamp];
  }
  const interval = endTs - startTs;
  if (interval <= 0) {
    return [startTs, endTs];
  }
  const tsOffset = timestamp - startTs;
  const intervalIndex = Math.floor(tsOffset / interval);
  const intervalStart = startTs + intervalIndex * interval;
  const intervalEnd = intervalStart + interval;
  return [intervalStart, Math.min(intervalEnd, endTs)];
}

/**
 * อัปเดต aggregated data ด้วยค่าใหม่
 */
export function updateAggregatedData(
  aggData: AggData,
  value: number,
  aggType: string,
): void {
  const fn = getAggFunction(aggType);
  fn(aggData, value);
}

/**
 * ประมวลผล aggregated data จาก raw data
 */
export function processAggregatedData(
  data: Record<string, any[]>,
  tsKeys: Array<{ id: number; key: string; agg: string }>,
  startTs: number,
  endTs: number,
): Map<number, Map<number, AggData>> {
  const result = new Map<number, Map<number, AggData>>();
  if (!data) return result;

  for (const tsKey of tsKeys) {
    const values = data[tsKey.key];
    if (!values || !values.length) continue;

    if (!result.has(tsKey.id)) {
      result.set(tsKey.id, new Map());
    }
    const keyMap = result.get(tsKey.id)!;

    for (const point of values) {
      const ts = point.ts;
      const interval = calculateAggInterval(startTs, endTs, ts, tsKey.agg);
      const intervalTs = interval[0] + Math.floor((interval[1] - interval[0]) / 2);

      if (!keyMap.has(intervalTs)) {
        keyMap.set(intervalTs, createEmptyAggData(intervalTs, interval));
      }
      const aggData = keyMap.get(intervalTs)!;
      updateAggregatedData(aggData, point.value, tsKey.agg);
    }
  }
  return result;
}

/**
 * อัปเดตข้อมูลสุดท้ายใน interval
 */
export function updateLastInterval(
  aggregationMap: Map<number, Map<number, AggData>>,
  startTs: number,
  endTs: number,
): void {
  if (!aggregationMap) return;
  for (const [, keyMap] of aggregationMap) {
    for (const [ts, aggData] of keyMap) {
      if (ts >= endTs) {
        // Move to last interval
        const interval = calculateAggInterval(startTs, endTs, ts, "AVG");
        aggData.interval = interval;
      }
    }
  }
}

/**
 * แปลง aggregation map เป็น output data
 */
export function aggregationMapToData(
  aggregationMap: Map<number, Map<number, AggData>>,
  tsKeys: Array<{ id: number; key: string }>,
): Record<string, Array<{ ts: number; value: number | null }>> {
  const result: Record<string, Array<{ ts: number; value: number | null }>> = {};
  for (const tsKey of tsKeys) {
    const keyMap = aggregationMap.get(tsKey.id);
    if (keyMap) {
      const data: Array<{ ts: number; value: number | null }> = [];
      for (const [ts, aggData] of keyMap) {
        data.push({ ts, value: aggData.aggValue });
      }
      data.sort((a, b) => a.ts - b.ts);
      result[tsKey.key] = data;
    }
  }
  return result;
}

// ============================================================
// WIDGET SUBSCRIPTION: getFirstEntityInfo logic (from widget-subscription.ts)
// ============================================================

/**
 * ดึง entity info แรกจาก subscription ตาม type
 * parity กับ WidgetSubscription.getFirstEntityInfo()
 */
export function getFirstEntityInfoFromSubscription(
  type: string,
  rpcTarget: any,
  alarmSource: any,
  alarms: any,
  datasources: any[],
): { entityId: any; entityName: string; entityLabel: string; entityDescription: string } | null {
  if (type === "rpc") {
    if (rpcTarget?.entityId) {
      return {
        entityId: rpcTarget.entityId,
        entityName: rpcTarget.entityName || "",
        entityLabel: rpcTarget.entityName || "",
        entityDescription: "",
      };
    }
  } else if (type === "alarm") {
    if (alarmSource?.entityType && alarmSource?.entityId) {
      return {
        entityId: { entityType: alarmSource.entityType, id: alarmSource.entityId },
        entityName: alarmSource.entityName || "",
        entityLabel: alarmSource.entityLabel || "",
        entityDescription: alarmSource.entityDescription || "",
      };
    } else if (alarms?.data?.length) {
      const data = alarms.data[0];
      let entityDescription = "";
      if (data.latest?.ENTITY_FIELD?.additionalInfo?.value) {
        try {
          const additionalInfo = JSON.parse(data.latest.ENTITY_FIELD.additionalInfo.value);
          if (additionalInfo?.description) {
            entityDescription = additionalInfo.description;
          }
        } catch { /* ignore */ }
      }
      return {
        entityId: data.originator,
        entityName: data.originatorName || "",
        entityLabel: data.originatorLabel || "",
        entityDescription,
      };
    }
  } else {
    for (const ds of datasources || []) {
      if (ds?.entityType && ds?.entityId) {
        return {
          entityId: { entityType: ds.entityType, id: ds.entityId },
          entityName: ds.entityName || "",
          entityLabel: ds.entityLabel || "",
          entityDescription: ds.entityDescription || "",
        };
      }
    }
  }
  return null;
}

// ============================================================
// WIDGET SUBSCRIPTION: onAliasesChanged/onFiltersChanged logic
// ============================================================

/**
 * ตรวจสอบว่า alias change ส่งผลต่อ subscription หรือไม่
 */
export function shouldUpdateOnAliasChange(
  type: string,
  aliasIds: string[],
  targetDeviceAliasId: string | undefined,
  alarmSourceAliasId: string | undefined,
  datasourceAliasIds: string[],
): boolean {
  if (type === "rpc") {
    return targetDeviceAliasId ? aliasIds.includes(targetDeviceAliasId) : false;
  } else if (type === "alarm") {
    return alarmSourceAliasId ? aliasIds.includes(alarmSourceAliasId) : false;
  } else {
    return aliasIds.some(id => datasourceAliasIds.includes(id));
  }
}

/**
 * ตรวจสอบว่า filter change ส่งผลต่อ subscription หรือไม่
 */
export function shouldUpdateOnFilterChange(
  type: string,
  filterIds: string[],
  alarmSourceFilterIds: string[],
  datasourceFilterIds: string[],
): boolean {
  if (type === "rpc") return false;
  if (type === "alarm") {
    return filterIds.some(id => alarmSourceFilterIds.includes(id));
  } else {
    return filterIds.some(id => datasourceFilterIds.includes(id));
  }
}

// ============================================================
// WIDGET SUBSCRIPTION: configureLoadedData logic
// ============================================================

/**
 * สร้าง legend config จาก datasources
 */
export function configureLegendFromDatasources(
  datasources: any[],
  legendConfig: any,
): { keys: string[]; data: any[] } {
  const keys: string[] = [];
  const data: any[] = [];
  if (!legendConfig) return { keys, data };
  for (const ds of datasources || []) {
    if (ds.dataKeys) {
      for (const key of ds.dataKeys) {
        if (key.settings?.showInLegend !== false) {
          keys.push(key.label || key.name);
          data.push({ min: null, max: null, avg: null, total: null, latest: null });
        }
      }
    }
  }
  return { keys, data };
}

/**
 * แปลง entity data เป็น datasource data
 */
export function entityDataToDatasourceDataImpl(
  entityData: any,
  dataKeys: any[],
  datasources: any[],
  datasourceIndex: number,
): { datasourceData: any; latestData: any } {
  const datasourceData: Record<string, any[]> = {};
  const latestData: Record<string, any> = {};
  if (!entityData || !dataKeys) return { datasourceData, latestData };

  const entityId = entityData.entityId;
  for (const key of dataKeys) {
    const keyName = key.name;
    if (key.type === "timeseries") {
      if (entityData.timeseries && entityData.timeseries[keyName]) {
        datasourceData[keyName] = entityData.timeseries[keyName].map((point: any) => ({
          ts: point.ts,
          value: convertValue(String(point.value)),
        }));
      } else {
        datasourceData[keyName] = [];
      }
    } else if (key.type === "attribute" || key.type === "entityField") {
      if (entityData.latest) {
        const latestType = key.type === "attribute" ? "ATTRIBUTE" : "ENTITY_FIELD";
        const latestValues = entityData.latest[latestType];
        if (latestValues && latestValues[keyName]) {
          latestData[keyName] = convertValue(String(latestValues[keyName].value));
        }
      }
    }
  }

  return { datasourceData, latestData };
}

// ============================================================
// ENTITY SERVICE: getEntityObservable dispatch logic
// ============================================================

/**
 * สร้าง dispatch table สำหรับ getEntity
 */
export function buildGetEntityDispatchTable(): Record<string, { service: string; method: string }> {
  return {
    DEVICE: { service: "deviceService", method: "getDevice" },
    ASSET: { service: "assetService", method: "getAsset" },
    TENANT: { service: "tenantService", method: "getTenant" },
    CUSTOMER: { service: "customerService", method: "getCustomer" },
    USER: { service: "userService", method: "getUser" },
    EDGE: { service: "edgeService", method: "getEdge" },
    ENTITY_VIEW: { service: "entityViewService", method: "getEntityView" },
    RULE_CHAIN: { service: "ruleChainService", method: "getRuleChain" },
    DASHBOARD: { service: "dashboardService", method: "getDashboard" },
  };
}

/**
 * สร้าง dispatch table สำหรับ saveEntity
 */
export function buildSaveEntityDispatchTable(): Record<string, { service: string; method: string }> {
  return {
    DEVICE: { service: "deviceService", method: "saveDevice" },
    ASSET: { service: "assetService", method: "saveAsset" },
    TENANT: { service: "tenantService", method: "saveTenant" },
    CUSTOMER: { service: "customerService", method: "saveCustomer" },
    USER: { service: "userService", method: "saveUser" },
    EDGE: { service: "edgeService", method: "saveEdge" },
    ENTITY_VIEW: { service: "entityViewService", method: "saveEntityView" },
    RULE_CHAIN: { service: "ruleChainService", method: "saveRuleChain" },
    DASHBOARD: { service: "dashboardService", method: "saveDashboard" },
  };
}

/**
 * สร้าง dispatch table สำหรับ deleteEntity
 */
export function buildDeleteEntityDispatchTable(): Record<string, { service: string; method: string }> {
  return {
    DEVICE: { service: "deviceService", method: "deleteDevice" },
    ASSET: { service: "assetService", method: "deleteAsset" },
    TENANT: { service: "tenantService", method: "deleteTenant" },
    CUSTOMER: { service: "customerService", method: "deleteCustomer" },
    USER: { service: "userService", method: "deleteUser" },
    EDGE: { service: "edgeService", method: "deleteEdge" },
    ENTITY_VIEW: { service: "entityViewService", method: "deleteEntityView" },
    RULE_CHAIN: { service: "ruleChainService", method: "deleteRuleChain" },
    DASHBOARD: { service: "dashboardService", method: "deleteDashboard" },
  };
}

/**
 * Dispatch getEntity call ผ่าน service map
 */
export function dispatchGetEntity(
  entityType: string,
  entityId: string,
  services: Record<string, any>,
): Observable<any> | null {
  const table = buildGetEntityDispatchTable();
  const entry = table[entityType];
  if (!entry) return null;
  const service = services[entry.service];
  if (!service || typeof service[entry.method] !== "function") return null;
  return service[entry.method](entityId);
}

/**
 * Dispatch saveEntity call ผ่าน service map
 */
export function dispatchSaveEntity(
  entityType: string,
  entity: any,
  services: Record<string, any>,
): Observable<any> | null {
  const table = buildSaveEntityDispatchTable();
  const entry = table[entityType];
  if (!entry) return null;
  const service = services[entry.service];
  if (!service || typeof service[entry.method] !== "function") return null;
  return service[entry.method](entity);
}

/**
 * Dispatch deleteEntity call ผ่าน service map
 */
export function dispatchDeleteEntity(
  entityType: string,
  entityId: string,
  services: Record<string, any>,
): Observable<any> | null {
  const table = buildDeleteEntityDispatchTable();
  const entry = table[entityType];
  if (!entry) return null;
  const service = services[entry.service];
  if (!service || typeof service[entry.method] !== "function") return null;
  return service[entry.method](entityId);
}

// ============================================================
// WIDGET SUBSCRIPTION: processDataUpdated logic
// ============================================================

/**
 * คำนวณ data index จาก datasource/dataKey indices
 */
export function calculateDataIndex(
  configuredDatasource: any,
  datasourceIndex: number,
  dataIndex: number,
  dataKeyIndex: number,
): number {
  if (!configuredDatasource) return -1;
  const startIndex = configuredDatasource.dataKeyStartIndex || 0;
  const dataKeysCount = configuredDatasource.dataKeys?.length || 0;
  return startIndex + dataIndex * dataKeysCount + dataKeyIndex;
}

/**
 * ตรวจสอบว่า latest data update ควรส่งผลหรือไม่
 */
export function shouldUpdateLatestData(
  type: string,
  prevData: any[],
  newData: any[],
): boolean {
  if (type !== "latest") return true;
  if (!newData.length && !prevData.length) return false;
  if (prevData?.[0] && prevData[0].length > 1 && newData.length > 0) {
    const prevTs = prevData[0][0];
    const prevValue = prevData[0][1];
    if (prevTs === newData[0][0] && prevValue === newData[0][1] && newData[0][1] !== "NOT_SUPPORTED") {
      return false;
    }
  }
  return true;
}

/**
 * ตรวจสอบว่า data key ถูกซ่อนใน legend หรือไม่
 */
export function isDataKeyHidden(
  legendKeys: any[],
  dataIndex: number,
): boolean {
  if (!legendKeys || !legendKeys.length) return false;
  const key = legendKeys.find(k => k.dataIndex === dataIndex);
  return key?.dataKey?.hidden === true;
}

// ============================================================
// WIDGET SUBSCRIPTION: configureLoadedData logic
// ============================================================

/**
 * สร้าง legend key จาก dataKey + settings
 */
export function createLegendKey(
  dataKey: any,
  dataIndex: number,
  defaultDecimals: number,
  defaultUnits: string,
): any {
  const decimals = dataKey.decimals != null ? dataKey.decimals : defaultDecimals;
  const units = dataKey.units || defaultUnits;
  return {
    dataKey,
    dataIndex,
    valueFormat: { decimals, units },
  };
}

/**
 * สร้าง legend key data (empty state)
 */
export function createLegendKeyData(): any {
  return { min: null, max: null, avg: null, total: null, latest: null, hidden: false };
}

/**
 * กำหนดสีให้ dataKey สำหรับ generated/additional datasources
 */
export function assignDataKeyColors(
  datasources: any[],
  getMaterialColor: (index: number) => string,
): void {
  let index = 0;
  for (const ds of datasources || []) {
    if (ds.dataKeys) {
      for (const key of ds.dataKeys) {
        if (ds.generated || ds.isAdditional) {
          key.color = getMaterialColor(index);
        }
        index++;
      }
    }
  }
}

/**
 * อัปเดต comparison colors สำหรับ additional datasources
 */
export function updateComparisonColors(
  datasourcePages: any[],
): void {
  if (!datasourcePages) return;
  for (const page of datasourcePages) {
    if (!page?.data) continue;
    for (let dIndex = 0; dIndex < page.data.length; dIndex++) {
      const ds = page.data[dIndex];
      if (ds?.isAdditional && ds.origDatasourceIndex != null) {
        const origDs = page.data[ds.origDatasourceIndex];
        if (!origDs) continue;
        for (const key of ds.dataKeys || []) {
          if (key.settings?.comparisonSettings?.color) {
            key.color = key.settings.comparisonSettings.color;
          }
          if (key.origDataKeyIndex != null && origDs.dataKeys?.[key.origDataKeyIndex]) {
            origDs.dataKeys[key.origDataKeyIndex].settings =
              origDs.dataKeys[key.origDataKeyIndex].settings || {};
            origDs.dataKeys[key.origDataKeyIndex].settings.comparisonSettings =
              origDs.dataKeys[key.origDataKeyIndex].settings.comparisonSettings || {};
            origDs.dataKeys[key.origDataKeyIndex].settings.comparisonSettings.color = key.color;
          }
        }
      }
    }
  }
}

// ============================================================
// ENTITY SERVICE: getEntitiesObservable dispatch
// ============================================================

/**
 * Dispatch getEntities call (plural) ผ่าน service map
 */
export function dispatchGetEntities(
  entityType: string,
  entityIds: string[],
  services: Record<string, any>,
): Observable<any> | null {
  const table = buildGetEntityDispatchTable();
  const entry = table[entityType];
  if (!entry) return null;
  const pluralMethod = entry.method + "s"; // getDevice → getDevices
  const service = services[entry.service];
  if (!service || typeof service[pluralMethod] !== "function") return null;
  return service[pluralMethod](entityIds);
}

/**
 * สร้าง URL สำหรับ getEntitiesByIds endpoint
 */
export function buildGetEntitiesByIdsUrl(
  entityType: string,
  entityIds: string[],
): string {
  const plural = entityTypeToPluralUrl(entityType);
  return `/api/${plural}?${entityTypeToSingularUrl(entityType)}Ids=${entityIds.join(",")}`;
}

/**
 * สร้าง URL สำหรับ getEntitiesByNameFilter endpoint
 */
export function buildGetEntitiesByNameFilterUrl(
  entityType: string,
  nameFilter: string,
): string {
  const plural = entityTypeToPluralUrl(entityType);
  return `/api/tenant/${plural}?${entityTypeToSingularUrl(entityType)}Names=${encodeURIComponent(nameFilter)}`;
}

// ============================================================
// ENTITY DATA SUBSCRIPTION: processEntityData logic
// ============================================================

/**
 * ประมวลผล EntityDataUpdate message
 */
export function processEntityDataUpdate(
  update: any,
  dataKeys: any[],
  existingData: Record<string, any[]>,
): { data: Record<string, any[]>; isUpdate: boolean } {
  if (!update) return { data: existingData, isUpdate: false };
  const result: Record<string, any[]> = { ...existingData };
  const isUpdate = !!update.update;

  if (update.data && Array.isArray(update.data)) {
    for (const entityData of update.data) {
      if (entityData.timeseries) {
        for (const keyName of Object.keys(entityData.timeseries)) {
          if (!result[keyName]) result[keyName] = [];
          const newValues = entityData.timeseries[keyName];
          if (isUpdate) {
            result[keyName].push(...newValues.map((v: any) => ({ ts: v.ts, value: convertValue(String(v.value)) })));
          } else {
            result[keyName] = newValues.map((v: any) => ({ ts: v.ts, value: convertValue(String(v.value)) }));
          }
        }
      }
    }
  }
  return { data: result, isUpdate };
}

/**
 * สร้าง EntityDataCmd จาก subscription config
 */
export function buildEntityDataCmd(
  entityFields: any[],
  latestValues: any[],
  tsFields: any[],
  pageLink: any,
  keyFilters: any[],
  isPaginated: boolean,
): any {
  const cmd: any = {
    entityFields: entityFields || [],
    latestValues: latestValues || [],
    pageLink: pageLink || { page: 0, pageSize: 1024 },
  };
  if (tsFields && tsFields.length) {
    cmd.tsFields = tsFields;
  }
  if (keyFilters && keyFilters.length) {
    cmd.keyFilters = keyFilters;
  }
  if (isPaginated) {
    cmd.isPaginatedDataSubscription = true;
  }
  return cmd;
}

/**
 * สร้าง EntityCountCmd
 */
export function buildEntityCountCmd(
  entityFilter: any,
  keyFilters: any[],
): any {
  return {
    entityFilter,
    keyFilters: keyFilters || [],
  };
}

// ============================================================
// WIDGET SUBSCRIPTION: entityDataToDatasourceData logic
// ============================================================

/**
 * แปลง datasource + data array เป็น DatasourceData array
 * parity กับ WidgetSubscription.entityDataToDatasourceData
 */
export function convertEntityDataToDatasourceData(
  datasource: any,
  data: any[],
  customTranslation: (label: string, defaultLabel: string) => string,
): any[] {
  if (!datasource || !datasource.dataKeys) return [];
  let result: any[] = [];

  // Process dataKeys
  result = result.concat(datasource.dataKeys.map((dataKey: any, keyIndex: number) => {
    dataKey.hidden = !!dataKey.settings?.hideDataByDefault;
    dataKey.inLegend = dataKey.settings?.showInLegend ||
      (dataKey.settings?.showInLegend === undefined && !dataKey.settings?.removeFromLegend);
    if (dataKey.label) {
      dataKey.label = customTranslation(dataKey.label, dataKey.label);
    }
    const dsData: any = { datasource, dataKey, data: [] };
    if (data && data[keyIndex] && data[keyIndex].data) {
      dsData.data = data[keyIndex].data;
    }
    return dsData;
  }));

  // Process latestDataKeys if present
  if (datasource.latestDataKeys) {
    result = result.concat(datasource.latestDataKeys.map((dataKey: any, latestKeyIndex: number) => {
      if (dataKey.label) {
        dataKey.label = customTranslation(dataKey.label, dataKey.label);
      }
      const dsData: any = { datasource, dataKey, data: [] };
      const keyIndex = datasource.dataKeys.length + latestKeyIndex;
      if (data && data[keyIndex] && data[keyIndex].data) {
        dsData.data = data[keyIndex].data;
      }
      return dsData;
    }));
  }

  return result;
}

/**
 * อัปเดต dataKey label ตาม comparison settings
 */
export function updateDataKeyLabelsForComparison(
  datasource: any,
  comparisonEnabled: boolean,
  timeForComparison: string,
  translate: (key: string) => string,
): void {
  if (!datasource?.dataKeys) return;
  for (const dataKey of datasource.dataKeys) {
    if (comparisonEnabled && dataKey.isAdditional) {
      const compSettings = dataKey.settings?.comparisonSettings;
      if (compSettings?.comparisonValuesLabel) {
        dataKey.label = compSettings.comparisonValuesLabel;
      } else {
        dataKey.label = (dataKey.label || "") + " " + translate("legend.comparison-time-ago." + timeForComparison);
      }
    }
    dataKey.pattern = dataKey.label;
  }
}

// ============================================================
// DATA AGGREGATOR: onInterval + updateData logic
// ============================================================

/**
 * คำนวณ next interval tick timestamp
 */
export function calculateNextTickTs(
  startTs: number,
  endTs: number,
  elapsed: number,
  aggregationTimeout: number,
  quickInterval: any,
  timezone: string,
): { newStartTs: number; newEndTs: number; delta: number } {
  const delta = Math.floor(elapsed / aggregationTimeout);
  if (quickInterval) {
    // For quick intervals, recalculate start/end from current time
    return { newStartTs: startTs, newEndTs: endTs, delta };
  } else {
    const tickTs = delta * aggregationTimeout;
    return {
      newStartTs: startTs + tickTs,
      newEndTs: endTs + tickTs,
      delta,
    };
  }
}

/**
 * กรอง aggregation map ตาม time window
 */
export function filterAggregationMapByTimeWindow(
  aggregationMap: Map<number, Map<number, AggData>>,
  startTs: number,
  endTs: number,
): Map<number, Map<number, AggData>> {
  const result = new Map<number, Map<number, AggData>>();
  for (const [keyId, keyMap] of aggregationMap) {
    const filteredMap = new Map<number, AggData>();
    for (const [ts, aggData] of keyMap) {
      if (ts >= startTs && ts <= endTs) {
        filteredMap.set(ts, aggData);
      }
    }
    if (filteredMap.size > 0) {
      result.set(keyId, filteredMap);
    }
  }
  return result;
}

/**
 * สร้าง update command สำหรับ realtime subscription
 */
export function createRealtimeUpdateCommand(
  cmdId: number,
  startTs: number,
  endTs: number,
  keys: any[],
): any {
  return {
    cmdId,
    startTs,
    endTs,
    keys: keys || [],
  };
}

// ============================================================
// ENTITY SERVICE: getEntityObservable + saveEntityParameters logic
// ============================================================

/**
 * สร้าง observable สำหรับ getEntity ผ่าน dispatch
 */
export function createGetEntityObservable(
  entityType: string,
  entityId: string,
  services: Record<string, any>,
  config?: any,
): Observable<any> | null {
  return dispatchGetEntity(entityType, entityId, services);
}

/**
 * สร้าง observable สำหรับ getEntities ผ่าน dispatch
 */
export function createGetEntitiesObservable(
  entityType: string,
  entityIds: string[],
  services: Record<string, any>,
): Observable<any> | null {
  return dispatchGetEntities(entityType, entityIds, services);
}

/**
 * Parse CSV header row
 */
export function parseCsvHeader(headerLine: string): string[] {
  return parseCsvLine(headerLine).map(h => h.trim());
}

/**
 * แปลง CSV data rows เป็น ImportEntityData array
 */
export function csvRowsToEntityDataArray(
  headers: string[],
  dataRows: string[],
): Record<string, any>[] {
  return dataRows
    .filter(line => line.trim())
    .map(line => csvRowToEntityData(headers, parseCsvLine(line)));
}

/**
 * แยก entity data เป็น create + update tasks
 */
export function splitEntityDataIntoTasks(
  entityDataList: Record<string, any>[],
  existingEntities: Record<string, any>[],
): { toCreate: Record<string, any>[]; toUpdate: Record<string, any>[] } {
  const toCreate: Record<string, any>[] = [];
  const toUpdate: Record<string, any>[] = [];
  const existingMap = new Map<string, any>();
  for (const e of existingEntities || []) {
    const key = e.id || e.name;
    if (key) existingMap.set(String(key), e);
  }
  for (const data of entityDataList) {
    const key = data.id || data.name;
    if (key && existingMap.has(String(key))) {
      toUpdate.push(data);
    } else {
      toCreate.push(data);
    }
  }
  return { toCreate, toUpdate };
}

/**
 * สร้าง findEntityDataByQuery URL + body
 */
export function buildFindEntityDataByQueryBody(
  query: any,
): any {
  if (!query) return {};
  return {
    entityFilter: query.entityFilter || {},
    pageLink: query.pageLink || { page: 0, pageSize: 100 },
    entityFields: query.entityFields || [],
    latestValues: query.latestValues || [],
    keyFilters: query.keyFilters || [],
  };
}

/**
 * สร้าง findAlarmDataByQuery URL + body
 */
export function buildFindAlarmDataByQueryBody(
  query: any,
): any {
  if (!query) return {};
  return {
    pageLink: query.pageLink || { page: 0, pageSize: 100 },
    entityFilter: query.entityFilter || {},
    alarmFields: query.alarmFields || [],
    keyFilters: query.keyFilters || [],
  };
}

// ============================================================
// WIDGET SUBSCRIPTION: updateDataVisibility logic
// ============================================================

/**
 * สลับข้อมูลระหว่าง data และ hiddenData
 */
export function toggleDataVisibility(
  data: any[],
  hiddenData: any[],
  legendKeys: any[],
  index: number,
): { data: any[]; hiddenData: any[] } {
  const newData = [...data];
  const newHiddenData = [...hiddenData];
  const key = legendKeys?.find(k => k.dataIndex === index);
  if (key?.dataKey?.hidden) {
    newHiddenData[index] = { data: newData[index]?.data || [] };
    newData[index] = { data: [] };
  } else {
    newData[index] = { data: newHiddenData[index]?.data || [] };
    newHiddenData[index] = { data: [] };
  }
  return { data: newData, hiddenData: newHiddenData };
}

/**
 * ตรวจสอบว่า timewindow เปลี่ยนประเภทหรือไม่
 */
export function hasTimewindowTypeChanged(
  oldTw: any,
  newTw: any,
): boolean {
  if (!oldTw || !newTw) return true;
  const oldType = oldTw.selectedTab ?? (oldTw.realtime ? 0 : 1);
  const newType = newTw.selectedTab ?? (newTw.realtime ? 0 : 1);
  return oldType !== newType;
}

/**
 * คำนวณ ts offset จาก timezone change
 */
export function calculateTsOffsetChange(
  oldTimezone: string,
  newTimezone: string,
): boolean {
  return oldTimezone !== newTimezone;
}
