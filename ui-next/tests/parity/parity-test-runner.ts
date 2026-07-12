/**
 * @fileoverview
 * Runner ที่อำนวยความสะดวกในการเขียน parity test — โหลด fixture จาก Angular
 * แล้วรัน comparison กับ Next.js ผ่าน helper functions.
 *
 * @reason
 * ลด boilerplate ของการโหลด fixture และ format error message ในไฟล์ test ทุกไฟล์.
 *
 * @parityEngine
 * ไม่มี equivalent ใน Angular — เป็น infrastructure ใหม่สำหรับ migration.
 */

import fs from "node:fs";
import path from "node:path";
import {
  compareHttpRequests,
  type HttpRequestSnapshot,
  type ParityComparisonResult,
} from "./parity-comparator";

// re-export เพื่อให้ test file อื่น import จากที่เดียวได้
export {
  compareHttpRequests,
  type HttpRequestSnapshot,
  type ParityComparisonResult,
};

/**
 * โหลด HTTP request snapshot ที่ capture จาก Angular เดิมจาก fixture file.
 *
 * @param fixtureName - ชื่อ fixture ไม่รวมนามสกุล (เช่น "device-list-request")
 * @returns HTTP request snapshot ที่เก็บไว้ใน fixture
 *
 * @example
 * ```typescript
 * const fixture = loadAngularFixture("device-list-request");
 * ```
 */
export function loadAngularFixture(
  fixtureName: string,
): HttpRequestSnapshot {
  const fixtureFilePath = path.join(
    process.cwd(),
    "tests",
    "parity",
    "fixtures",
    `${fixtureName}.json`,
  );

  if (!fs.existsSync(fixtureFilePath)) {
    throw new Error(
      `ไม่พบ fixture ชื่อ "${fixtureName}" ที่ ${fixtureFilePath}`,
    );
  }

  const fixtureContent = fs.readFileSync(fixtureFilePath, "utf-8");
  return JSON.parse(fixtureContent) as HttpRequestSnapshot;
}

/**
 * รัน parity assertion ระหว่าง Angular fixture กับ Next.js snapshot จริง.
 *
 * @param fixtureName - ชื่อ fixture ของ Angular
 * @param actualNextJsRequest - request ที่ capture จาก Next.js จริง
 * @returns ผลลัพธ์การเปรียบเทียบ (throw error พร้อมรายละเอียด ถ้าไม่ match)
 */
export function assertHttpRequestParity(
  fixtureName: string,
  actualNextJsRequest: HttpRequestSnapshot,
): ParityComparisonResult {
  const angularRequest = loadAngularFixture(fixtureName);
  const comparisonResult = compareHttpRequests(
    angularRequest,
    actualNextJsRequest,
  );

  if (!comparisonResult.isMatch) {
    const formattedDifferences = comparisonResult.differences
      .map((difference) => {
        return `  - ${difference.fieldPath}: Angular="${JSON.stringify(difference.angularValue)}" vs Next.js="${JSON.stringify(difference.nextJsValue)}"`;
      })
      .join("\n");

    throw new Error(
      `Parity test fail สำหรับ fixture "${fixtureName}" — พบความแตกต่าง:\n${formattedDifferences}`,
    );
  }

  return comparisonResult;
}
