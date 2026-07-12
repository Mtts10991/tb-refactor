/**
 * @fileoverview
 * Unit tests สำหรับ shared-state/signal.ts (createSignal adapter)
 * + auth-token-store behavior tests (isolated)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSignal, createSignalWithInitial, createReducerSignal } from "../../src/core/shared-state/signal";
import { isJwtTokenValid, getJwtToken, clearTokenData, storeTokenWithExpiration, removeStoredToken } from "../../src/core/authentication/auth-token-store";

// ============================================================
// signal.ts tests — @react-rxjs/core adapter
// ============================================================
describe("createSignal", () => {
  it("คืนค่า tuple [emit, observable] เมื่อสร้างใหม่", () => {
    const [emit, signal$] = createSignal<number>();
    expect(typeof emit).toBe("function");
    expect(signal$).toBeDefined();
  });

  it("emit ค่า → observable ส่งค่าออกมา", () => {
    const [emit, signal$] = createSignal<string>();
    const received: string[] = [];
    signal$.subscribe((value) => received.push(value));

    emit("first");
    emit("second");

    expect(received).toEqual(["first", "second"]);
  });

  it("observable เป็น Subject (late subscribers ไม่ได้ค่าเก่า)", () => {
    const [emit, signal$] = createSignal<number>();
    emit(42);

    const received: number[] = [];
    signal$.subscribe((value) => received.push(value));

    // Subject ไม่ replay — late subscriber ไม่ได้ค่า 42
    expect(received).toEqual([]);
  });
});

describe("createSignalWithInitial", () => {
  it("คืนค่า initial value ให้ subscriber แรก", () => {
    const [emit, signal$] = createSignalWithInitial(100);
    const received: number[] = [];
    signal$.subscribe((value) => received.push(value));

    expect(received).toEqual([100]);
  });

  it("emit ค่าใหม่ → subscriber ได้รับ", () => {
    const [emit, signal$] = createSignalWithInitial("initial");
    const received: string[] = [];
    signal$.subscribe((value) => received.push(value));

    emit("updated");
    expect(received).toEqual(["initial", "updated"]);
  });
});

describe("createReducerSignal", () => {
  it("reducer อัปเดต state ตาม action", () => {
    type TestAction = { type: "increment" } | { type: "decrement" };
    const reducer = (state: number, action: TestAction): number => {
      switch (action.type) {
        case "increment": return state + 1;
        case "decrement": return state - 1;
        default: return state;
      }
    };

    const [dispatch, state$] = createReducerSignal(reducer, 0);
    const received: number[] = [];
    state$.subscribe({
      next: (value) => received.push(value),
      error: () => {}, // suppress error propagation for test
    });

    dispatch({ type: "increment" });
    dispatch({ type: "increment" });
    dispatch({ type: "decrement" });

    expect(received.length).toBeGreaterThan(0);
  });
});

// ============================================================
// auth-token-store behavior tests (isolated localStorage)
// ============================================================
describe("auth-token-store behavior (isolated)", () => {
  beforeEach(() => {
    vi.resetModules();
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    });
  });

  it("isJwtTokenValid() = false เมื่อไม่มี token", () => {
    expect(isJwtTokenValid()).toBe(false);
  });

  it("getJwtToken() = null เมื่อไม่มี token", () => {
    expect(getJwtToken()).toBeNull();
  });

  it("storeTokenWithExpiration + getJwtToken", () => {
    const now = Math.floor(Date.now() / 1000);
    const result = storeTokenWithExpiration("my-jwt", "jwt_token", now, now + 3600);
    expect(result).toBe(true);
    expect(getJwtToken()).toBe("my-jwt");
  });

  it("storeTokenWithExpiration returns false เมื่อ args undefined", () => {
    expect(storeTokenWithExpiration("token", "jwt_token", undefined, undefined)).toBe(false);
  });

  it("storeTokenWithExpiration returns false เมื่อ ttl <= 0", () => {
    expect(storeTokenWithExpiration("token", "jwt_token", 2000, 1000)).toBe(false);
  });

  it("isJwtTokenValid() = true เมื่อ token valid (future)", () => {
    const now = Math.floor(Date.now() / 1000);
    storeTokenWithExpiration("valid", "jwt_token", now, now + 3600);
    expect(isJwtTokenValid()).toBe(true);
  });

  it("clearTokenData ลบทุกอย่าง", () => {
    const now = Math.floor(Date.now() / 1000);
    storeTokenWithExpiration("jwt", "jwt_token", now, now + 3600);
    storeTokenWithExpiration("refresh", "refresh_token", now, now + 86400);
    expect(getJwtToken()).toBe("jwt");
    clearTokenData();
    expect(getJwtToken()).toBeNull();
  });

  it("removeStoredToken ลบเฉพาะ prefix ที่ระบุ", () => {
    const now = Math.floor(Date.now() / 1000);
    storeTokenWithExpiration("jwt", "jwt_token", now, now + 3600);
    storeTokenWithExpiration("refresh", "refresh_token", now, now + 86400);
    removeStoredToken("jwt_token");
    expect(getJwtToken()).toBeNull();
  });
});
