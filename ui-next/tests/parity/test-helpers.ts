/**
 * @fileoverview
 * Test helpers สำหรับ parity tests — สร้าง mock PageLink + EntityId
 * ที่มี toQuery() คืน query string เหมือน Angular เดิม
 *
 * @parityEngine Angular
 * parity กับ: ui-ngx/src/app/shared/models/page/page-link.ts (toQuery method)
 */

/**
 * Mock PageLink ที่คืน fixed query string เพื่อให้ parity test deterministic
 * parity กับ Angular PageLink.toQuery() format:
 *   ?pageSize=10&page=0 (&textSearch=...&sortProperty=...&sortOrder=...)
 */
export class MockPageLink {
  constructor(
    public readonly page: number = 0,
    public readonly pageSize: number = 10,
    public readonly textSearch: string = "",
  ) {}

  /** คืน query string แบบเดียวกับ Angular PageLink.toQuery() */
  public toQuery(): string {
    let query = `?pageSize=${this.pageSize}&page=${this.page}`;
    if (this.textSearch) {
      query += `&textSearch=${encodeURIComponent(this.textSearch)}`;
    }
    return query;
  }
}

/**
 * Mock EntityId — parity กับ Angular EntityId interface
 */
export interface MockEntityId {
  readonly entityType: string;
  readonly id: string;
}

/** UUID ตัวอย่างสำหรับใช้ใน parity tests (fixed เพื่อ deterministic) */
export const SAMPLE_UUID_1 = "13814000-1dd2-11b2-8080-808080808080";
export const SAMPLE_UUID_2 = "13814000-1dd2-11b2-8080-808080808081";

/** สร้าง mock entity ID */
export function createMockEntityId(
  entityType: string = "DEVICE",
  id: string = SAMPLE_UUID_1,
): MockEntityId {
  return { entityType, id };
}
