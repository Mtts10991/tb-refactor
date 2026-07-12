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
