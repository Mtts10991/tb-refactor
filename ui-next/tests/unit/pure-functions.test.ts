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
