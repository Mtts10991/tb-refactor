/**
 * @fileoverview
 * Comprehensive tests สำหรับ pure-functions.ts
 * — execute ทุก function จริง → v8 coverage สูง
 */

import { describe, it, expect } from "vitest";
import {
  avg, min, max, sum, count, none, getAggFunction, createEmptyAggData,
  entityTypeToServiceName, entityTypeToMethodSuffix,
  emptyPageData, datasourcesHasAggregation, createFormattedData, calculateTsOffset,
  buildWsUri, shouldShowWsError, calculateJitterDelay,
  ServerErrorCode, errorCodeToTranslationKey,
  type AggData,
} from "../../src/core/pure-functions";

// ============================================================
// AGGREGATION FUNCTIONS
// ============================================================
describe("Aggregation functions", () => {
  function newAgg(): AggData {
    return createEmptyAggData(1000, [0, 2000]);
  }

  describe("avg", () => {
    it("คำนวณค่าเฉลี่ยถูกต้อง", () => {
      const agg = newAgg();
      avg(agg, 10);
      avg(agg, 20);
      avg(agg, 30);
      expect(agg.count).toBe(3);
      expect(agg.sum).toBe(60);
      expect(agg.aggValue).toBe(20);
    });
    it("ignores null/undefined values", () => {
      const agg = newAgg();
      avg(agg, null as any);
      avg(agg, undefined);
      avg(agg, 10);
      expect(agg.count).toBe(1);
      expect(agg.aggValue).toBe(10);
    });
    it("returns null when no data", () => {
      const agg = newAgg();
      expect(agg.aggValue).toBeNull();
    });
  });

  describe("min", () => {
    it("หาค่าต่ำสุด", () => {
      const agg = newAgg();
      min(agg, 30);
      min(agg, 10);
      min(agg, 20);
      expect(agg.aggValue).toBe(10);
      expect(agg.count).toBe(3);
    });
  });

  describe("max", () => {
    it("หาค่าสูงสุด", () => {
      const agg = newAgg();
      max(agg, 10);
      max(agg, 30);
      max(agg, 20);
      expect(agg.aggValue).toBe(30);
      expect(agg.count).toBe(3);
    });
  });

  describe("sum", () => {
    it("ผลรวมถูกต้อง", () => {
      const agg = newAgg();
      sum(agg, 10);
      sum(agg, 20);
      sum(agg, 30);
      expect(agg.sum).toBe(60);
      expect(agg.aggValue).toBe(60);
    });
  });

  describe("count", () => {
    it("นับจำนวนถูกต้อง", () => {
      const agg = newAgg();
      count(agg);
      count(agg);
      count(agg);
      expect(agg.count).toBe(3);
      expect(agg.aggValue).toBe(3);
    });
  });

  describe("none", () => {
    it("เก็บค่าล่าสุด", () => {
      const agg = newAgg();
      none(agg, 10);
      none(agg, 20);
      none(agg, 30);
      expect(agg.aggValue).toBe(30);
    });
  });
});

// ============================================================
// getAggFunction
// ============================================================
describe("getAggFunction", () => {
  it("คืน avg สำหรับ AVG/avg", () => {
    expect(getAggFunction("AVG")).toBe(avg);
    expect(getAggFunction("avg")).toBe(avg);
  });
  it("คืน min สำหรับ MIN/min", () => {
    expect(getAggFunction("MIN")).toBe(min);
  });
  it("คืน max สำหรับ MAX/max", () => {
    expect(getAggFunction("MAX")).toBe(max);
  });
  it("คืน sum สำหรับ SUM/sum", () => {
    expect(getAggFunction("SUM")).toBe(sum);
  });
  it("คืน count สำหรับ COUNT/count", () => {
    expect(getAggFunction("COUNT")).toBe(count);
  });
  it("คืน none สำหรับ NONE/none", () => {
    expect(getAggFunction("NONE")).toBe(none);
  });
  it("คืน avg เป็น default", () => {
    expect(getAggFunction("UNKNOWN")).toBe(avg);
  });
});

// ============================================================
// createEmptyAggData
// ============================================================
describe("createEmptyAggData", () => {
  it("สร้าง empty AggData ที่ถูกต้อง", () => {
    const agg = createEmptyAggData(1000, [0, 2000]);
    expect(agg.count).toBe(0);
    expect(agg.sum).toBe(0);
    expect(agg.aggValue).toBeNull();
    expect(agg.ts).toBe(1000);
    expect(agg.interval).toEqual([0, 2000]);
  });
});

// ============================================================
// ENTITY TYPE MAPPING
// ============================================================
describe("entityTypeToServiceName", () => {
  it("DEVICE → deviceService", () => { expect(entityTypeToServiceName("DEVICE")).toBe("deviceService"); });
  it("ASSET → assetService", () => { expect(entityTypeToServiceName("ASSET")).toBe("assetService"); });
  it("TENANT → tenantService", () => { expect(entityTypeToServiceName("TENANT")).toBe("tenantService"); });
  it("CUSTOMER → customerService", () => { expect(entityTypeToServiceName("CUSTOMER")).toBe("customerService"); });
  it("USER → userService", () => { expect(entityTypeToServiceName("USER")).toBe("userService"); });
  it("EDGE → edgeService", () => { expect(entityTypeToServiceName("EDGE")).toBe("edgeService"); });
  it("ENTITY_VIEW → entityViewService", () => { expect(entityTypeToServiceName("ENTITY_VIEW")).toBe("entityViewService"); });
  it("RULE_CHAIN → ruleChainService", () => { expect(entityTypeToServiceName("RULE_CHAIN")).toBe("ruleChainService"); });
  it("DASHBOARD → dashboardService", () => { expect(entityTypeToServiceName("DASHBOARD")).toBe("dashboardService"); });
  it("UNKNOWN → empty string", () => { expect(entityTypeToServiceName("UNKNOWN")).toBe(""); });
});

describe("entityTypeToMethodSuffix", () => {
  it("DEVICE → Device", () => { expect(entityTypeToMethodSuffix("DEVICE")).toBe("Device"); });
  it("ASSET → Asset", () => { expect(entityTypeToMethodSuffix("ASSET")).toBe("Asset"); });
  it("RULE_CHAIN → RuleChain", () => { expect(entityTypeToMethodSuffix("RULE_CHAIN")).toBe("RuleChain"); });
  it("UNKNOWN → empty string", () => { expect(entityTypeToMethodSuffix("UNKNOWN")).toBe(""); });
});

// ============================================================
// WIDGET SUBSCRIPTION HELPERS
// ============================================================
describe("emptyPageData", () => {
  it("สร้าง empty page data ที่ถูกต้อง", () => {
    const result = emptyPageData();
    expect(result.data).toEqual([]);
    expect(result.totalPages).toBe(0);
    expect(result.totalElements).toBe(0);
    expect(result.hasNext).toBe(false);
  });
});

describe("datasourcesHasAggregation", () => {
  it("returns false สำหรับ empty array", () => {
    expect(datasourcesHasAggregation([])).toBe(false);
  });
  it("returns false สำหรับ null", () => {
    expect(datasourcesHasAggregation(null as any)).toBe(false);
  });
  it("returns false เมื่อไม่มี aggregation keys", () => {
    expect(datasourcesHasAggregation([
      { dataKeys: [{ type: "timeseries", aggregationType: "NONE" }] },
    ])).toBe(false);
  });
  it("returns true เมื่อมี aggregation key", () => {
    expect(datasourcesHasAggregation([
      { dataKeys: [{ type: "timeseries", aggregationType: "AVG" }] },
    ])).toBe(true);
  });
});

describe("createFormattedData", () => {
  it("แปลง raw data เป็น formatted data", () => {
    const result = createFormattedData({
      temp: [{ ts: 1000, value: 42 }, { ts: 2000, value: 43 }],
    });
    expect(result.temp).toEqual([
      { ts: 1000, value: 42 },
      { ts: 2000, value: 43 },
    ]);
  });
  it("handles null input", () => {
    expect(createFormattedData(null as any)).toEqual({});
  });
  it("handles empty object", () => {
    expect(createFormattedData({})).toEqual({});
  });
});

describe("calculateTsOffset", () => {
  it("returns 0 for empty timezone", () => {
    expect(calculateTsOffset("")).toBe(0);
  });
  it("returns number for valid timezone", () => {
    const result = calculateTsOffset("UTC");
    expect(typeof result).toBe("number");
  });
});

// ============================================================
// WEBSOCKET HELPERS
// ============================================================
describe("buildWsUri", () => {
  it("HTTP → ws:// + port 3000", () => {
    expect(buildWsUri("http:", "localhost", "3000", "api/ws")).toBe("ws://localhost:3000/api/ws");
  });
  it("HTTPS → wss:// + port 443 default", () => {
    expect(buildWsUri("https:", "example.com", "", "api/ws")).toBe("wss://example.com:443/api/ws");
  });
  it("HTTP → ws:// + port 80 default", () => {
    expect(buildWsUri("http:", "example.com", "", "api/ws")).toBe("ws://example.com:80/api/ws");
  });
});

describe("shouldShowWsError", () => {
  it("returns true for code > 1001 (not 1006/1011/1012/4500)", () => {
    expect(shouldShowWsError(1002)).toBe(true);
    expect(shouldShowWsError(4000)).toBe(true);
  });
  it("returns false for code <= 1001", () => {
    expect(shouldShowWsError(1000)).toBe(false);
    expect(shouldShowWsError(1001)).toBe(false);
  });
  it("returns false for 1006, 1011, 1012, 4500", () => {
    expect(shouldShowWsError(1006)).toBe(false);
    expect(shouldShowWsError(1011)).toBe(false);
    expect(shouldShowWsError(1012)).toBe(false);
    expect(shouldShowWsError(4500)).toBe(false);
  });
});

describe("calculateJitterDelay", () => {
  it("returns number between 1000 and 4000", () => {
    const delay = calculateJitterDelay();
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThanOrEqual(4000);
  });
});

// ============================================================
// SERVER ERROR CODES
// ============================================================
describe("ServerErrorCode constants", () => {
  it("มีค่าที่ถูกต้อง", () => {
    expect(ServerErrorCode.general).toBe(2);
    expect(ServerErrorCode.authentication).toBe(10);
    expect(ServerErrorCode.jwtTokenExpired).toBe(11);
    expect(ServerErrorCode.credentialsExpired).toBe(15);
    expect(ServerErrorCode.entitiesLimitExceeded).toBe(41);
  });
});

describe("errorCodeToTranslationKey", () => {
  it("คืน key ที่ถูกต้องสำหรับแต่ละ code", () => {
    expect(errorCodeToTranslationKey(2)).toBe("server-error.general");
    expect(errorCodeToTranslationKey(10)).toBe("server-error.authentication");
    expect(errorCodeToTranslationKey(11)).toBe("server-error.jwt-token-expired");
    expect(errorCodeToTranslationKey(41)).toBe("server-error.entities-limit-exceeded");
  });
  it("คืน undefined สำหรับ unknown code", () => {
    expect(errorCodeToTranslationKey(999)).toBeUndefined();
  });
});

// ============================================================
// ENTITY DATA SUBSCRIPTION HELPERS
// ============================================================
import {
  convertValue, isNumericString, buildEntityKeys, keyTypeToKeyType,
  createFunctionPageData, calculateComparisonValue,
} from "../../src/core/pure-functions";

describe("convertValue", () => {
  it("แปลง numeric string เป็น number", () => {
    expect(convertValue("42")).toBe(42);
    expect(convertValue("3.14")).toBe(3.14);
    expect(convertValue("0")).toBe(0);
  });
  it("คืน string เดิม สำหรับ non-numeric", () => {
    expect(convertValue("hello")).toBe("hello");
    expect(convertValue("12abc")).toBe("12abc");
  });
  it("คืน falsy value เดิม", () => {
    expect(convertValue("")).toBe("");
    expect(convertValue(null as any)).toBe(null);
  });
});

describe("isNumericString", () => {
  it("true สำหรับ numeric strings", () => {
    expect(isNumericString("42")).toBe(true);
    expect(isNumericString("3.14")).toBe(true);
    expect(isNumericString("-5")).toBe(true);
  });
  it("false สำหรับ non-numeric", () => {
    expect(isNumericString("hello")).toBe(false);
    expect(isNumericString("")).toBe(false);
    expect(isNumericString("12px")).toBe(false);
  });
  it("false สำหรับ non-string", () => {
    expect(isNumericString(42 as any)).toBe(false);
    expect(isNumericString(null as any)).toBe(false);
  });
});

describe("buildEntityKeys", () => {
  it("filter + map dataKeys ตาม type", () => {
    const keys = [
      { name: "temp", type: "timeseries" },
      { name: "name", type: "entityField" },
      { name: "model", type: "attribute" },
    ];
    const result = buildEntityKeys(keys, "timeseries");
    expect(result).toEqual([{ type: "TIME_SERIES", key: "temp" }]);
  });
  it("empty array", () => {
    expect(buildEntityKeys([], "timeseries")).toEqual([]);
  });
  it("null input", () => {
    expect(buildEntityKeys(null as any, "timeseries")).toEqual([]);
  });
});

describe("keyTypeToKeyType", () => {
  it("timeseries → TIME_SERIES", () => { expect(keyTypeToKeyType("timeseries")).toBe("TIME_SERIES"); });
  it("attribute → ATTRIBUTE", () => { expect(keyTypeToKeyType("attribute")).toBe("ATTRIBUTE"); });
  it("entityField → ENTITY_FIELD", () => { expect(keyTypeToKeyType("entityField")).toBe("ENTITY_FIELD"); });
  it("alarm → ALARM_FIELD", () => { expect(keyTypeToKeyType("alarm")).toBe("ALARM_FIELD"); });
  it("unknown → uppercase", () => { expect(keyTypeToKeyType("custom")).toBe("CUSTOM"); });
});

describe("createFunctionPageData", () => {
  it("สร้าง page data สำหรับ function datasource", () => {
    const result = createFunctionPageData([{ name: "temp" }], { page: 0, pageSize: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].entityId.entityType).toBe("FUNCTION");
    expect(result.totalPages).toBe(1);
    expect(result.totalElements).toBe(1);
    expect(result.hasNext).toBe(false);
  });
});

describe("calculateComparisonValue", () => {
  it("PREVIOUS_VALUE คืน previous", () => {
    expect(calculateComparisonValue(30, 20, "PREVIOUS_VALUE")).toBe(20);
  });
  it("DELTA_ABSOLUTE คืน current - previous", () => {
    expect(calculateComparisonValue(30, 20, "DELTA_ABSOLUTE")).toBe(10);
  });
  it("DELTA_PERCENT คืน percentage", () => {
    expect(calculateComparisonValue(30, 20, "DELTA_PERCENT")).toBe(50);
  });
  it("DELTA_PERCENT with zero previous คืน 0", () => {
    expect(calculateComparisonValue(30, 0, "DELTA_PERCENT")).toBe(0);
  });
  it("default คืน delta absolute", () => {
    expect(calculateComparisonValue(30, 20, "UNKNOWN")).toBe(10);
  });
});

// ============================================================
// ALIAS CONTROLLER HELPERS
// ============================================================
import {
  setDatasourceNames, hasAliasChanged, hasFilterChanged, createDatasourceKey,
} from "../../src/core/pure-functions";

describe("setDatasourceNames", () => {
  it("function type: ตั้งชื่อ + entityId", () => {
    const ds = { type: "function", name: "MyFunc" };
    const result = setDatasourceNames(ds, 0, 0, 0);
    expect(result.datasource.name).toBe("MyFunc");
    expect(result.datasource.aliasName).toBe("MyFunc");
    expect(result.datasource.entityId.entityType).toBe("FUNCTION");
    expect(result.functionIndex).toBe(1);
  });
  it("function type without name: ใช้ 'function'", () => {
    const ds = { type: "function" };
    const result = setDatasourceNames(ds, 0, 0, 0);
    expect(result.datasource.name).toBe("function");
  });
  it("entityCount type: ตั้ง entityId", () => {
    const ds = { type: "entityCount" };
    const result = setDatasourceNames(ds, 0, 0, 0);
    expect(result.datasource.entityId.entityType).toBe("COUNT");
    expect(result.entityCountIndex).toBe(1);
  });
  it("alarmCount type: ตั้ง entityId", () => {
    const ds = { type: "alarmCount" };
    const result = setDatasourceNames(ds, 0, 0, 0);
    expect(result.datasource.entityId.entityType).toBe("ALARM_COUNT");
    expect(result.alarmCountIndex).toBe(1);
  });
  it("entity type: ไม่เปลี่ยนแปลง", () => {
    const ds = { type: "entity", entityId: { entityType: "DEVICE", id: "d1" } };
    const result = setDatasourceNames(ds, 0, 0, 0);
    expect(result.functionIndex).toBe(0);
    expect(result.entityCountIndex).toBe(0);
    expect(result.alarmCountIndex).toBe(0);
  });
});

describe("hasAliasChanged", () => {
  it("true เมื่อ prevAlias เป็น null", () => {
    expect(hasAliasChanged({ id: "1" }, null)).toBe(true);
  });
  it("true เมื่อเปลี่ยนแปลง", () => {
    expect(hasAliasChanged({ id: "1" }, { id: "2" })).toBe(true);
  });
  it("false เมื่อเหมือนกัน", () => {
    expect(hasAliasChanged({ id: "1" }, { id: "1" })).toBe(false);
  });
});

describe("hasFilterChanged", () => {
  it("true เมื่อ prevFilter เป็น null", () => {
    expect(hasFilterChanged({ type: "A" }, null)).toBe(true);
  });
  it("true เมื่อเปลี่ยนแปลง", () => {
    expect(hasFilterChanged({ type: "A" }, { type: "B" })).toBe(true);
  });
  it("false เมื่อเหมือนกัน", () => {
    expect(hasFilterChanged({ type: "A" }, { type: "A" })).toBe(false);
  });
});

describe("createDatasourceKey", () => {
  it("สร้าง key จาก entityAliasId", () => {
    expect(createDatasourceKey({ entityAliasId: "alias1" })).toBe("alias:alias1");
  });
  it("สร้าง key จาก entityId", () => {
    expect(createDatasourceKey({ entityId: { entityType: "DEVICE", id: "d1" } })).toBe("entity:DEVICE:d1");
  });
  it("สร้าง key จาก type", () => {
    expect(createDatasourceKey({ type: "function" })).toBe("type:function");
  });
  it("สร้าง key รวมหลาย parts", () => {
    expect(createDatasourceKey({ entityAliasId: "a1", type: "entity" })).toBe("alias:a1|type:entity");
  });
  it("empty string for null", () => {
    expect(createDatasourceKey(null)).toBe("");
  });
});

// ============================================================
// ENTITY SERVICE HELPERS
// ============================================================
import {
  entityTypeToPluralUrl, entityTypeToSingularUrl,
  entityToCsvRow, parseCsvLine, csvRowToEntityData,
} from "../../src/core/pure-functions";

describe("entityTypeToPluralUrl", () => {
  it("DEVICE → devices", () => { expect(entityTypeToPluralUrl("DEVICE")).toBe("devices"); });
  it("ASSET → assets", () => { expect(entityTypeToPluralUrl("ASSET")).toBe("assets"); });
  it("ENTITY_VIEW → entityViews", () => { expect(entityTypeToPluralUrl("ENTITY_VIEW")).toBe("entityViews"); });
  it("RULE_CHAIN → ruleChains", () => { expect(entityTypeToPluralUrl("RULE_CHAIN")).toBe("ruleChains"); });
  it("UNKNOWN → unknowns", () => { expect(entityTypeToPluralUrl("UNKNOWN")).toBe("unknowns"); });
});

describe("entityTypeToSingularUrl", () => {
  it("DEVICE → device", () => { expect(entityTypeToSingularUrl("DEVICE")).toBe("device"); });
  it("ENTITY_VIEW → entityView", () => { expect(entityTypeToSingularUrl("ENTITY_VIEW")).toBe("entityView"); });
  it("RULE_CHAIN → ruleChain", () => { expect(entityTypeToSingularUrl("RULE_CHAIN")).toBe("ruleChain"); });
  it("UNKNOWN → unknown", () => { expect(entityTypeToSingularUrl("UNKNOWN")).toBe("unknown"); });
});

describe("entityToCsvRow", () => {
  it("แปลง entity เป็น CSV row", () => {
    const row = entityToCsvRow({ name: "Test", type: "default", value: 42 }, ["name", "type", "value"]);
    expect(row).toBe("Test,default,42");
  });
  it("quote values ที่มี comma", () => {
    const row = entityToCsvRow({ name: "Test,Inc" }, ["name"]);
    expect(row).toBe('"Test,Inc"');
  });
  it("quote values ที่มี quote", () => {
    const row = entityToCsvRow({ name: 'Test"Inc' }, ["name"]);
    expect(row).toBe('"Test""Inc"');
  });
  it("empty string สำหรับ null/undefined values", () => {
    const row = entityToCsvRow({ name: "Test", desc: null }, ["name", "desc"]);
    expect(row).toBe("Test,");
  });
  it("JSON stringify สำหรับ object values", () => {
    const row = entityToCsvRow({ config: { key: "val" } }, ["config"]);
    expect(row).toBe('"{""key"":""val""}"');
  });
  it("empty string for null entity", () => {
    expect(entityToCsvRow(null, ["name"])).toBe("");
  });
});

describe("parseCsvLine", () => {
  it("parse simple CSV line", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });
  it("parse CSV with quoted values", () => {
    expect(parseCsvLine('"a,b",c')).toEqual(["a,b", "c"]);
  });
  it("parse CSV with escaped quotes", () => {
    expect(parseCsvLine('"a""b",c')).toEqual(['a"b', "c"]);
  });
  it("parse empty line", () => {
    expect(parseCsvLine("")).toEqual([]);
  });
  it("parse single value", () => {
    expect(parseCsvLine("hello")).toEqual(["hello"]);
  });
});

describe("csvRowToEntityData", () => {
  it("แปลง CSV row เป็น entity data object", () => {
    const result = csvRowToEntityData(["name", "value"], ["TestDevice", "42"]);
    expect(result.name).toBe("TestDevice");
    expect(result.value).toBe(42);
  });
  it("ignores empty values", () => {
    const result = csvRowToEntityData(["name", "value"], ["Test", ""]);
    expect(result.name).toBe("Test");
    expect(result.value).toBeUndefined();
  });
  it("handles mismatched lengths", () => {
    const result = csvRowToEntityData(["name", "value", "extra"], ["Test", "42"]);
    expect(result.name).toBe("Test");
    expect(result.value).toBe(42);
    expect(result.extra).toBeUndefined();
  });
});

// ============================================================
// WIDGET SUBSCRIPTION PURE LOGIC
// ============================================================
import {
  updateLatestData, calculateLegendData, checkRpcTargetValid, checkAlarmSourceValid,
} from "../../src/core/pure-functions";

describe("updateLatestData", () => {
  it("อัปเดต latest data จาก attribute/entityField keys", () => {
    const datasources = [{
      entityId: { id: "d1" },
      dataKeys: [{ name: "model", type: "attribute" }],
    }];
    const data = { model: [{ ts: 1000, value: "X100" }] };
    const latestData: Record<string, any> = {};
    updateLatestData(datasources, data, latestData);
    expect(latestData.d1.model).toBe("X100");
  });
  it("ignores timeseries keys", () => {
    const datasources = [{
      entityId: { id: "d1" },
      dataKeys: [{ name: "temp", type: "timeseries" }],
    }];
    const data = { temp: [{ ts: 1000, value: 42 }] };
    const latestData: Record<string, any> = {};
    updateLatestData(datasources, data, latestData);
    expect(latestData.d1).toBeUndefined();
  });
  it("handles null inputs", () => {
    expect(() => updateLatestData(null, null, {})).not.toThrow();
  });
});

describe("calculateLegendData", () => {
  it("คำนวณ min/max/avg/total/latest", () => {
    const data = { temp: [{ value: 10 }, { value: 20 }, { value: 30 }] };
    const result = calculateLegendData(data, { showMin: true, showMax: true, showAvg: true, showTotal: true, showLatest: true });
    expect(result.min[0]).toBe(10);
    expect(result.max[0]).toBe(30);
    expect(result.avg[0]).toBe(20);
    expect(result.total[0]).toBe(60);
    expect(result.latest[0]).toBe(30);
  });
  it("returns null arrays when no data", () => {
    const result = calculateLegendData({}, { showMin: true });
    expect(result.min).toEqual([]);
  });
  it("handles null values in data", () => {
    const data = { temp: [{ value: "abc" }, { value: 10 }] };
    const result = calculateLegendData(data, { showMin: true, showMax: true });
    expect(result.min[0]).toBe(10);
    expect(result.max[0]).toBe(10);
  });
});

describe("checkRpcTargetValid", () => {
  it("invalid when no target device", () => {
    expect(checkRpcTargetValid(null, null).valid).toBe(false);
    expect(checkRpcTargetValid(null, null).reason).toBe("target-device-is-not-set");
  });
  it("invalid when no resolved entity", () => {
    expect(checkRpcTargetValid({ entityAliasId: "a1" }, null).valid).toBe(false);
    expect(checkRpcTargetValid({ entityAliasId: "a1" }, null).reason).toBe("failed-to-resolve-target-device");
  });
  it("invalid when entity is not DEVICE", () => {
    expect(checkRpcTargetValid({ entityAliasId: "a1" }, { entityType: "ASSET" }).valid).toBe(false);
    expect(checkRpcTargetValid({ entityAliasId: "a1" }, { entityType: "ASSET" }).reason).toBe("invalid-target-entity");
  });
  it("valid when entity is DEVICE", () => {
    expect(checkRpcTargetValid({ entityAliasId: "a1" }, { entityType: "DEVICE" }).valid).toBe(true);
  });
});

describe("checkAlarmSourceValid", () => {
  it("invalid when no alarm source", () => {
    expect(checkAlarmSourceValid(null, null).valid).toBe(false);
    expect(checkAlarmSourceValid(null, null).reason).toBe("alarm-source-not-set");
  });
  it("invalid when no resolved source", () => {
    expect(checkAlarmSourceValid({ dataKeys: [] }, null).valid).toBe(false);
  });
  it("valid when resolved", () => {
    expect(checkAlarmSourceValid({ dataKeys: [] }, { type: "entity" }).valid).toBe(true);
  });
});

// ============================================================
// ENTITY SERVICE PURE LOGIC
// ============================================================
import {
  getAliasFilterTypesForEntityTypes, filterAliasByEntityTypesImpl, prepareAllowedEntityTypesImpl,
} from "../../src/core/pure-functions";

describe("getAliasFilterTypesForEntityTypes", () => {
  it("returns filter types for DEVICE", () => {
    const result = getAliasFilterTypesForEntityTypes(["DEVICE"]);
    expect(result).toContain("singleEntity");
    expect(result).toContain("entityList");
    expect(result).toContain("entityName");
    expect(result).toContain("assetSearchQuery");
  });
  it("returns filter types for CUSTOMER", () => {
    const result = getAliasFilterTypesForEntityTypes(["CUSTOMER"]);
    expect(result).toContain("apiUsageState");
  });
  it("returns empty for unknown type", () => {
    const result = getAliasFilterTypesForEntityTypes(["UNKNOWN"]);
    expect(result).toEqual([]);
  });
});

describe("filterAliasByEntityTypesImpl", () => {
  it("true when singleEntity matches", () => {
    const alias = { filter: { singleEntity: { entityType: "DEVICE" } } };
    expect(filterAliasByEntityTypesImpl(alias, ["DEVICE"])).toBe(true);
  });
  it("false when singleEntity doesn't match", () => {
    const alias = { filter: { singleEntity: { entityType: "DEVICE" } } };
    expect(filterAliasByEntityTypesImpl(alias, ["ASSET"])).toBe(false);
  });
  it("true when entityList matches", () => {
    const alias = { filter: { entityList: { entityType: "ASSET" } } };
    expect(filterAliasByEntityTypesImpl(alias, ["ASSET"])).toBe(true);
  });
  it("false when no filter", () => {
    expect(filterAliasByEntityTypesImpl({}, ["DEVICE"])).toBe(false);
    expect(filterAliasByEntityTypesImpl(null, ["DEVICE"])).toBe(false);
  });
  it("true for generic filters (entityType)", () => {
    const alias = { filter: { entityType: "DEVICE" } };
    expect(filterAliasByEntityTypesImpl(alias, ["DEVICE"])).toBe(true);
  });
});

describe("prepareAllowedEntityTypesImpl", () => {
  it("returns default for tenant admin", () => {
    const result = prepareAllowedEntityTypesImpl([], true);
    expect(result).toContain("DEVICE");
    expect(result).toContain("TENANT");
    expect(result).toContain("CUSTOMER");
  });
  it("returns default for customer user", () => {
    const result = prepareAllowedEntityTypesImpl([], false);
    expect(result).toContain("DEVICE");
    expect(result).toContain("ASSET");
    expect(result).toContain("ENTITY_VIEW");
    expect(result).not.toContain("TENANT");
  });
  it("returns provided types", () => {
    const result = prepareAllowedEntityTypesImpl(["DEVICE", "ASSET"], true);
    expect(result).toEqual(["DEVICE", "ASSET"]);
  });
});

// ============================================================
// DATA AGGREGATOR PURE LOGIC
// ============================================================
import {
  calculateAggInterval, updateAggregatedData, processAggregatedData,
  updateLastInterval, aggregationMapToData,
} from "../../src/core/pure-functions";

describe("calculateAggInterval", () => {
  it("NONE type returns [ts, ts]", () => {
    expect(calculateAggInterval(0, 10000, 5000, "NONE")).toEqual([5000, 5000]);
  });
  it("AVG type calculates interval", () => {
    const result = calculateAggInterval(0, 10000, 3000, "AVG");
    expect(result[0]).toBeLessThanOrEqual(3000);
    expect(result[1]).toBeGreaterThan(3000);
  });
  it("handles timestamp at start", () => {
    const result = calculateAggInterval(0, 10000, 0, "AVG");
    expect(result[0]).toBe(0);
  });
  it("handles negative interval", () => {
    const result = calculateAggInterval(10000, 0, 5000, "AVG");
    expect(result).toEqual([10000, 0]);
  });
});

describe("updateAggregatedData", () => {
  it("updates with AVG function", () => {
    const agg = createEmptyAggData(1000, [0, 2000]);
    updateAggregatedData(agg, 10, "AVG");
    updateAggregatedData(agg, 20, "AVG");
    expect(agg.aggValue).toBe(15);
    expect(agg.count).toBe(2);
  });
  it("updates with MIN function", () => {
    const agg = createEmptyAggData(1000, [0, 2000]);
    updateAggregatedData(agg, 30, "MIN");
    updateAggregatedData(agg, 10, "MIN");
    expect(agg.aggValue).toBe(10);
  });
  it("updates with COUNT function", () => {
    const agg = createEmptyAggData(1000, [0, 2000]);
    updateAggregatedData(agg, 10, "COUNT");
    updateAggregatedData(agg, 20, "COUNT");
    expect(agg.aggValue).toBe(2);
  });
});

describe("processAggregatedData", () => {
  it("processes raw data into aggregation map", () => {
    const data = { temp: [{ ts: 500, value: 10 }, { ts: 1500, value: 20 }] };
    const tsKeys = [{ id: 0, key: "temp", agg: "AVG" }];
    const result = processAggregatedData(data, tsKeys, 0, 2000);
    expect(result.size).toBe(1);
    expect(result.get(0)!.size).toBeGreaterThan(0);
  });
  it("handles empty data", () => {
    const result = processAggregatedData({}, [], 0, 1000);
    expect(result.size).toBe(0);
  });
  it("handles null data", () => {
    const result = processAggregatedData(null as any, [], 0, 1000);
    expect(result.size).toBe(0);
  });
});

describe("updateLastInterval", () => {
  it("does not throw for empty map", () => {
    expect(() => updateLastInterval(new Map(), 0, 1000)).not.toThrow();
  });
  it("does not throw for null", () => {
    expect(() => updateLastInterval(null as any, 0, 1000)).not.toThrow();
  });
});

describe("aggregationMapToData", () => {
  it("converts map to output data", () => {
    const aggMap = new Map<number, Map<number, AggData>>();
    const keyMap = new Map<number, AggData>();
    const agg = createEmptyAggData(1000, [0, 2000]);
    agg.aggValue = 42;
    keyMap.set(1000, agg);
    aggMap.set(0, keyMap);
    const result = aggregationMapToData(aggMap, [{ id: 0, key: "temp" }]);
    expect(result.temp).toEqual([{ ts: 1000, value: 42 }]);
  });
  it("returns empty for missing keys", () => {
    const result = aggregationMapToData(new Map(), [{ id: 0, key: "temp" }]);
    expect(result.temp).toBeUndefined();
  });
});

// ============================================================
// getFirstEntityInfoFromSubscription
// ============================================================
import { getFirstEntityInfoFromSubscription } from "../../src/core/pure-functions";

describe("getFirstEntityInfoFromSubscription", () => {
  it("rpc type returns target entity", () => {
    const result = getFirstEntityInfoFromSubscription("rpc", { entityId: { entityType: "DEVICE", id: "d1" }, entityName: "Dev" }, null, null, []);
    expect(result?.entityId.id).toBe("d1");
    expect(result?.entityName).toBe("Dev");
  });
  it("rpc type returns null when no target", () => {
    expect(getFirstEntityInfoFromSubscription("rpc", null, null, null, [])).toBeNull();
  });
  it("alarm type returns from alarmSource", () => {
    const result = getFirstEntityInfoFromSubscription("alarm", null, { entityType: "DEVICE", entityId: "d1", entityName: "Dev" }, null, []);
    expect(result?.entityId.id).toBe("d1");
  });
  it("alarm type returns from alarms data", () => {
    const result = getFirstEntityInfoFromSubscription("alarm", null, null, { data: [{ originator: { entityType: "DEVICE", id: "d1" }, originatorName: "Dev" }] }, []);
    expect(result?.entityName).toBe("Dev");
  });
  it("alarm type parses additionalInfo for description", () => {
    const result = getFirstEntityInfoFromSubscription("alarm", null, null, {
      data: [{
        originator: { entityType: "DEVICE", id: "d1" }, originatorName: "Dev",
        latest: { ENTITY_FIELD: { additionalInfo: { value: '{"description":"Test desc"}' } } },
      }],
    }, []);
    expect(result?.entityDescription).toBe("Test desc");
  });
  it("timeseries type returns from datasources", () => {
    const result = getFirstEntityInfoFromSubscription("timeseries", null, null, null, [{ entityType: "DEVICE", entityId: "d1", entityName: "Dev" }]);
    expect(result?.entityId.id).toBe("d1");
  });
  it("timeseries type returns null for empty datasources", () => {
    expect(getFirstEntityInfoFromSubscription("timeseries", null, null, null, [])).toBeNull();
  });
  it("timeseries type skips datasources without entityId", () => {
    expect(getFirstEntityInfoFromSubscription("timeseries", null, null, null, [{ type: "function" }])).toBeNull();
  });
});

// ============================================================
// shouldUpdateOnAliasChange + shouldUpdateOnFilterChange
// ============================================================
import { shouldUpdateOnAliasChange, shouldUpdateOnFilterChange } from "../../src/core/pure-functions";

describe("shouldUpdateOnAliasChange", () => {
  it("rpc type checks targetDeviceAliasId", () => {
    expect(shouldUpdateOnAliasChange("rpc", ["alias1"], "alias1", undefined, [])).toBe(true);
    expect(shouldUpdateOnAliasChange("rpc", ["alias2"], "alias1", undefined, [])).toBe(false);
  });
  it("alarm type checks alarmSourceAliasId", () => {
    expect(shouldUpdateOnAliasChange("alarm", ["alias1"], undefined, "alias1", [])).toBe(true);
    expect(shouldUpdateOnAliasChange("alarm", ["alias2"], undefined, "alias1", [])).toBe(false);
  });
  it("timeseries type checks datasourceAliasIds", () => {
    expect(shouldUpdateOnAliasChange("timeseries", ["alias1"], undefined, undefined, ["alias1", "alias2"])).toBe(true);
    expect(shouldUpdateOnAliasChange("timeseries", ["alias3"], undefined, undefined, ["alias1", "alias2"])).toBe(false);
  });
});

describe("shouldUpdateOnFilterChange", () => {
  it("rpc type always returns false", () => {
    expect(shouldUpdateOnFilterChange("rpc", ["f1"], [], [])).toBe(false);
  });
  it("alarm type checks alarmSourceFilterIds", () => {
    expect(shouldUpdateOnFilterChange("alarm", ["f1"], ["f1"], [])).toBe(true);
    expect(shouldUpdateOnFilterChange("alarm", ["f2"], ["f1"], [])).toBe(false);
  });
  it("timeseries type checks datasourceFilterIds", () => {
    expect(shouldUpdateOnFilterChange("timeseries", ["f1"], [], ["f1"])).toBe(true);
  });
});

// ============================================================
// configureLegendFromDatasources + entityDataToDatasourceDataImpl
// ============================================================
import { configureLegendFromDatasources, entityDataToDatasourceDataImpl } from "../../src/core/pure-functions";

describe("configureLegendFromDatasources", () => {
  it("builds legend from datasources", () => {
    const result = configureLegendFromDatasources([{ dataKeys: [{ name: "temp", label: "Temperature" }, { name: "hum", label: "Humidity" }] }], { position: "bottom" });
    expect(result.keys).toEqual(["Temperature", "Humidity"]);
    expect(result.data).toHaveLength(2);
  });
  it("skips keys with showInLegend=false", () => {
    const result = configureLegendFromDatasources([{ dataKeys: [{ name: "temp" }, { name: "hidden", settings: { showInLegend: false } }] }], {});
    expect(result.keys).toEqual(["temp"]);
  });
  it("returns empty for null config", () => {
    expect(configureLegendFromDatasources([], null)).toEqual({ keys: [], data: [] });
  });
});

describe("entityDataToDatasourceDataImpl", () => {
  it("converts timeseries data", () => {
    const entityData = { entityId: { entityType: "DEVICE", id: "d1" }, timeseries: { temp: [{ ts: 1000, value: "42" }] } };
    const result = entityDataToDatasourceDataImpl(entityData, [{ name: "temp", type: "timeseries" }], [], 0);
    expect(result.datasourceData.temp).toEqual([{ ts: 1000, value: 42 }]);
  });
  it("converts attribute data to latest", () => {
    const entityData = { entityId: { entityType: "DEVICE", id: "d1" }, latest: { ATTRIBUTE: { model: { value: "X100" } } } };
    const result = entityDataToDatasourceDataImpl(entityData, [{ name: "model", type: "attribute" }], [], 0);
    expect(result.latestData.model).toBe("X100");
  });
  it("converts entityField data to latest", () => {
    const entityData = { entityId: { entityType: "DEVICE", id: "d1" }, latest: { ENTITY_FIELD: { name: { value: "Dev1" } } } };
    const result = entityDataToDatasourceDataImpl(entityData, [{ name: "name", type: "entityField" }], [], 0);
    expect(result.latestData.name).toBe("Dev1");
  });
  it("handles empty entityData", () => {
    const result = entityDataToDatasourceDataImpl(null, [], [], 0);
    expect(result.datasourceData).toEqual({});
    expect(result.latestData).toEqual({});
  });
});

// ============================================================
// Entity dispatch tables + dispatch functions
// ============================================================
import {
  buildGetEntityDispatchTable, buildSaveEntityDispatchTable, buildDeleteEntityDispatchTable,
  dispatchGetEntity, dispatchSaveEntity, dispatchDeleteEntity,
} from "../../src/core/pure-functions";

describe("dispatch tables", () => {
  it("getEntity table has all 9 types", () => {
    const table = buildGetEntityDispatchTable();
    expect(Object.keys(table)).toHaveLength(9);
    expect(table.DEVICE).toEqual({ service: "deviceService", method: "getDevice" });
    expect(table.DASHBOARD).toEqual({ service: "dashboardService", method: "getDashboard" });
  });
  it("saveEntity table has all 9 types", () => {
    const table = buildSaveEntityDispatchTable();
    expect(Object.keys(table)).toHaveLength(9);
    expect(table.DEVICE).toEqual({ service: "deviceService", method: "saveDevice" });
  });
  it("deleteEntity table has all 9 types", () => {
    const table = buildDeleteEntityDispatchTable();
    expect(Object.keys(table)).toHaveLength(9);
    expect(table.DEVICE).toEqual({ service: "deviceService", method: "deleteDevice" });
  });
});

describe("dispatchGetEntity", () => {
  it("dispatches to correct service method", () => {
    const services = { deviceService: { getDevice: (id: string) => `got:${id}` } };
    const result = dispatchGetEntity("DEVICE", "d1", services);
    expect(result).toBe("got:d1");
  });
  it("returns null for unknown entity type", () => {
    expect(dispatchGetEntity("UNKNOWN", "d1", {})).toBeNull();
  });
  it("returns null for missing service", () => {
    expect(dispatchGetEntity("DEVICE", "d1", {})).toBeNull();
  });
  it("returns null for missing method", () => {
    expect(dispatchGetEntity("DEVICE", "d1", { deviceService: {} })).toBeNull();
  });
});

describe("dispatchSaveEntity", () => {
  it("dispatches to correct service method", () => {
    const services = { deviceService: { saveDevice: (e: any) => `saved:${e.name}` } };
    const result = dispatchSaveEntity("DEVICE", { name: "Test" }, services);
    expect(result).toBe("saved:Test");
  });
  it("returns null for unknown", () => {
    expect(dispatchSaveEntity("UNKNOWN", {}, {})).toBeNull();
  });
});

describe("dispatchDeleteEntity", () => {
  it("dispatches to correct service method", () => {
    const services = { deviceService: { deleteDevice: (id: string) => `deleted:${id}` } };
    const result = dispatchDeleteEntity("DEVICE", "d1", services);
    expect(result).toBe("deleted:d1");
  });
  it("returns null for unknown", () => {
    expect(dispatchDeleteEntity("UNKNOWN", "d1", {})).toBeNull();
  });
});

// ============================================================
// processDataUpdated helpers
// ============================================================
import {
  calculateDataIndex, shouldUpdateLatestData, isDataKeyHidden,
} from "../../src/core/pure-functions";

describe("calculateDataIndex", () => {
  it("calculates index from datasource + dataKey indices", () => {
    const ds = { dataKeyStartIndex: 5, dataKeys: [{}, {}, {}] };
    expect(calculateDataIndex(ds, 0, 1, 2)).toBe(5 + 1 * 3 + 2);
  });
  it("returns -1 for null datasource", () => {
    expect(calculateDataIndex(null, 0, 0, 0)).toBe(-1);
  });
  it("handles missing dataKeyStartIndex", () => {
    const ds = { dataKeys: [{}, {}] };
    expect(calculateDataIndex(ds, 0, 0, 1)).toBe(1);
  });
});

describe("shouldUpdateLatestData", () => {
  it("true for non-latest type", () => {
    expect(shouldUpdateLatestData("timeseries", [], [])).toBe(true);
  });
  it("false when both empty (latest)", () => {
    expect(shouldUpdateLatestData("latest", [], [])).toBe(false);
  });
  it("false when same ts + value", () => {
    expect(shouldUpdateLatestData("latest", [[1000, 42]], [[1000, 42]])).toBe(false);
  });
  it("true when different value", () => {
    expect(shouldUpdateLatestData("latest", [[1000, 42]], [[1000, 43]])).toBe(true);
  });
  it("true when NOT_SUPPORTED value", () => {
    expect(shouldUpdateLatestData("latest", [[1000, 42]], [[1000, "NOT_SUPPORTED"]])).toBe(true);
  });
});

describe("isDataKeyHidden", () => {
  it("true when dataKey.hidden is true", () => {
    const keys = [{ dataIndex: 3, dataKey: { hidden: true } }];
    expect(isDataKeyHidden(keys, 3)).toBe(true);
  });
  it("false when dataKey.hidden is false", () => {
    const keys = [{ dataIndex: 3, dataKey: { hidden: false } }];
    expect(isDataKeyHidden(keys, 3)).toBe(false);
  });
  it("false for empty legend keys", () => {
    expect(isDataKeyHidden([], 3)).toBe(false);
  });
  it("false for null legend keys", () => {
    expect(isDataKeyHidden(null as any, 3)).toBe(false);
  });
});

// ============================================================
// configureLoadedData helpers
// ============================================================
import {
  createLegendKey, createLegendKeyData, assignDataKeyColors, updateComparisonColors,
} from "../../src/core/pure-functions";

describe("createLegendKey", () => {
  it("creates legend key with custom decimals/units", () => {
    const key = createLegendKey({ name: "temp", decimals: 3, units: "°C" }, 5, 2, "");
    expect(key.dataIndex).toBe(5);
    expect(key.valueFormat.decimals).toBe(3);
    expect(key.valueFormat.units).toBe("°C");
  });
  it("uses default decimals/units when not set", () => {
    const key = createLegendKey({ name: "temp" }, 0, 2, "%");
    expect(key.valueFormat.decimals).toBe(2);
    expect(key.valueFormat.units).toBe("%");
  });
});

describe("createLegendKeyData", () => {
  it("creates empty legend key data", () => {
    const data = createLegendKeyData();
    expect(data.min).toBeNull();
    expect(data.max).toBeNull();
    expect(data.hidden).toBe(false);
  });
});

describe("assignDataKeyColors", () => {
  it("assigns colors to generated datasources", () => {
    const colors = ["red", "green", "blue"];
    const datasources = [{ generated: true, dataKeys: [{}, {}] }, { dataKeys: [{}] }];
    assignDataKeyColors(datasources, (i) => colors[i]);
    expect(datasources[0].dataKeys[0].color).toBe("red");
    expect(datasources[0].dataKeys[1].color).toBe("green");
    expect(datasources[1].dataKeys[0].color).toBeUndefined();
  });
  it("handles null datasources", () => {
    expect(() => assignDataKeyColors(null, () => "red")).not.toThrow();
  });
});

describe("updateComparisonColors", () => {
  it("updates comparison colors for additional datasources", () => {
    const origDs = { dataKeys: [{ settings: { comparisonSettings: {} } }] };
    const addDs = {
      isAdditional: true, origDatasourceIndex: 0,
      dataKeys: [{ settings: { comparisonSettings: { color: "red" } }, origDataKeyIndex: 0 }],
    };
    const pages = [{ data: [origDs, addDs] }];
    updateComparisonColors(pages);
    expect(origDs.dataKeys[0].settings.comparisonSettings.color).toBe("red");
  });
  it("handles null pages", () => {
    expect(() => updateComparisonColors(null)).not.toThrow();
  });
  it("handles pages without data", () => {
    expect(() => updateComparisonColors([{}])).not.toThrow();
  });
});

// ============================================================
// Entity dispatch (plural) + URL builders
// ============================================================
import {
  dispatchGetEntities, buildGetEntitiesByIdsUrl, buildGetEntitiesByNameFilterUrl,
} from "../../src/core/pure-functions";

describe("dispatchGetEntities", () => {
  it("dispatches to plural method", () => {
    const services = { deviceService: { getDevices: (ids: string[]) => ids.length } };
    expect(dispatchGetEntities("DEVICE", ["d1", "d2"], services)).toBe(2);
  });
  it("returns null for unknown", () => {
    expect(dispatchGetEntities("UNKNOWN", [], {})).toBeNull();
  });
});

describe("buildGetEntitiesByIdsUrl", () => {
  it("builds URL for DEVICE", () => {
    expect(buildGetEntitiesByIdsUrl("DEVICE", ["d1", "d2"])).toBe("/api/devices?deviceIds=d1,d2");
  });
  it("builds URL for ASSET", () => {
    expect(buildGetEntitiesByIdsUrl("ASSET", ["a1"])).toBe("/api/assets?assetIds=a1");
  });
});

describe("buildGetEntitiesByNameFilterUrl", () => {
  it("builds URL with encoded name", () => {
    expect(buildGetEntitiesByNameFilterUrl("DEVICE", "Test Device")).toBe("/api/tenant/devices?deviceNames=Test%20Device");
  });
});

// ============================================================
// EntityDataSubscription helpers
// ============================================================
import {
  processEntityDataUpdate, buildEntityDataCmd, buildEntityCountCmd,
} from "../../src/core/pure-functions";

describe("processEntityDataUpdate", () => {
  it("processes initial data (not update)", () => {
    const update = { data: [{ timeseries: { temp: [{ ts: 1000, value: "42" }] } }] };
    const result = processEntityDataUpdate(update, [{ name: "temp" }], {});
    expect(result.data.temp).toEqual([{ ts: 1000, value: 42 }]);
    expect(result.isUpdate).toBe(false);
  });
  it("appends data for update mode", () => {
    const update = { update: true, data: [{ timeseries: { temp: [{ ts: 2000, value: "43" }] } }] };
    const existing = { temp: [{ ts: 1000, value: 42 }] };
    const result = processEntityDataUpdate(update, [{ name: "temp" }], existing);
    expect(result.data.temp).toHaveLength(2);
    expect(result.isUpdate).toBe(true);
  });
  it("handles null update", () => {
    const result = processEntityDataUpdate(null, [], { temp: [] });
    expect(result.data.temp).toEqual([]);
    expect(result.isUpdate).toBe(false);
  });
});

describe("buildEntityDataCmd", () => {
  it("builds command with all fields", () => {
    const cmd = buildEntityDataCmd(
      [{ type: "ENTITY_FIELD", key: "name" }],
      [{ type: "ATTRIBUTE", key: "model" }],
      [{ type: "TIME_SERIES", key: "temp" }],
      { page: 0, pageSize: 100 },
      [{ key: "temp", valueType: "STRING", value: "42", predicate: { type: "STRING", operation: "EQUAL", ignoreCase: false } }],
      true,
    );
    expect(cmd.entityFields).toHaveLength(1);
    expect(cmd.latestValues).toHaveLength(1);
    expect(cmd.tsFields).toHaveLength(1);
    expect(cmd.pageLink.pageSize).toBe(100);
    expect(cmd.keyFilters).toHaveLength(1);
    expect(cmd.isPaginatedDataSubscription).toBe(true);
  });
  it("builds minimal command", () => {
    const cmd = buildEntityDataCmd([], [], [], null, [], false);
    expect(cmd.entityFields).toEqual([]);
    expect(cmd.tsFields).toBeUndefined();
    expect(cmd.isPaginatedDataSubscription).toBeUndefined();
  });
});

describe("buildEntityCountCmd", () => {
  it("builds count command", () => {
    const cmd = buildEntityCountCmd({ type: "singleEntity" }, [{ key: "test" }]);
    expect(cmd.entityFilter.type).toBe("singleEntity");
    expect(cmd.keyFilters).toHaveLength(1);
  });
  it("builds with empty keyFilters", () => {
    const cmd = buildEntityCountCmd({ type: "entityList" }, []);
    expect(cmd.keyFilters).toEqual([]);
  });
});
