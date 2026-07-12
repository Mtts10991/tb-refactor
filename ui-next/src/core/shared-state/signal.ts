///
/// Copyright © 2016-2026 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

/**
 * @fileoverview
 * createSignal helper — adapter ที่ทำให้ @react-rxjs/core 0.10.8 (re-rxjs fork)
 * มี API แบบ classic react-rxjs ที่ spec กำหนด.
 *
 * @parityEngine Angular
 * ไม่มีใน Angular — helper นี้เฉพาะสำหรับฝั่ง React.
 *
 * @reason
 * Spec ของ Phase 1.8 ระบุให้ใช้ `createSignal` จาก @react-rxjs/core:
 * ```ts
 * const [emitValue, value$] = createSignal<T>();
 * const useValue = bind(value$, initialValue);
 * ```
 *
 * แต่ @react-rxjs/core เวอร์ชันที่ติดตั้ง (0.10.8 จาก re-rxjs/react-rxjs repo)
 * ไม่มี createSignal export — มีแค่ bind / state / shareLatest / Subscribe / useStateObservable.
 * (createSignal อยู่ใน react-rxjs/react-rxjs repo ซึ่งเป็นคนละ package)
 *
 * เพื่อไม่ให้ต้องเปลี่ยน dependency + maintain parity กับ spec เราสร้าง adapter
 * ที่ให้ API เดียวกันโดยใช้ RxJS Subject + state() operator.
 *
 * @module core/shared-state
 */

import { Subject } from "rxjs";
import { scan, startWith } from "rxjs/operators";
import {
  state,
  type StateObservable,
  type DefaultedStateObservable,
} from "@react-rxjs/core";

/**
 * Subject type ที่ห่อด้วย state() เพื่อให้เป็น StateObservable ที่:
 *   - share latest value กับทุก subscriber
 *   - มี getValue() สำหรับ sync read
 *   - reset เมื่อ refCount === 0
 *
 * DefaultedStateObservable คือ subset ที่มี initial value → getValue() คืน T เสมอ.
 */
type SignalStateObservable<T> = StateObservable<T> | DefaultedStateObservable<T>;

/**
 * Result ของ createSignal — tuple [emit, state$].
 * parity กับ classic @react-rxjs/core createSignal<T>().
 */
export type SignalResult<T> = [
  /** Emitter function — เรียกเพื่อ push value ใหม่เข้า stream */
  (value: T) => void,
  /** StateObservable ที่ emit ค่าล่าสุดเสมอ */
  SignalStateObservable<T>,
];

/**
 * Result ของ createSignalWithInitial — tuple [emit, state$].
 * state$ เป็น DefaultedStateObservable ที่ getValue() คืน T เสมอ (ไม่มี StatePromise).
 */
export type DefaultedSignalResult<T> = [
  /** Emitter function — เรียกเพื่อ push value ใหม่เข้า stream */
  (value: T) => void,
  /** DefaultedStateObservable ที่มี initial value */
  DefaultedStateObservable<T>,
];

/**
 * สร้าง signal — emitter + StateObservable คู่กัน.
 *
 * parity กับ classic @react-rxjs/core:
 * ```ts
 * const [emit, value$] = createSignal<T>();
 * ```
 *
 * การใช้งาน:
 *   - `emit(value)` เพื่อ push value ใหม่
 *   - `value$.subscribe(fn)` หรือ `value$.getValue()` เพื่ออ่านค่า
 *   - `bind(value$, initialValue)` เพื่อสร้าง React hook
 *
 * @example
 * ```ts
 * const [setLoading, isLoading$] = createSignal<boolean>();
 * const useIsLoading = bind(isLoading$, false)[0];
 *
 * setLoading(true);
 * isLoading$.getValue(); // true
 * ```
 *
 * @returns tuple [emit, state$]
 */
export function createSignal<T>(): SignalResult<T> {
  const subject = new Subject<T>();
  // state() ห่อ Subject ให้กลายเป็น StateObservable:
  //   - shareLatest + replay ค่าล่าสุด
  //   - reset state เมื่อไม่มี subscriber
  const state$ = state(subject) as SignalStateObservable<T>;

  const emit = (value: T): void => {
    subject.next(value);
  };

  return [emit, state$];
}

/**
 * สร้าง signal แบบมี initial value — emitter + DefaultedStateObservable.
 *
 * ใช้เมื่อต้องการให้มีค่าเริ่มต้นก่อนที่จะมีการ emit ครั้งแรก
 * (parity กับ BehaviorSubject pattern).
 *
 * @example
 * ```ts
 * const [setCount, count$] = createSignal<number>(0);
 * count$.getValue(); // 0 ก่อนมี emit
 * ```
 *
 * @param initialValue - ค่าเริ่มต้นก่อนที่จะมีการ emit
 * @returns tuple [emit, state$]
 */
export function createSignalWithInitial<T>(initialValue: T): DefaultedSignalResult<T> {
  const subject = new Subject<T>();
  const state$ = state(subject, initialValue);

  const emit = (value: T): void => {
    subject.next(value);
  };

  return [emit, state$];
}

/**
 * สร้าง signal แบบ accumulator — ใช้ reducer function คล้าย NgRx reducer.
 *
 * parity กับการทำงานของ NgRx reducer:
 *   - state เริ่มต้น = initialState
 *   - ทุก action ถูก map ผ่าน reducer function เพื่อคำนวณ state ใหม่
 *
 * ใช้เมื่อ state มีหลาย fields และ update จากหลาย actions
 * (เช่น AuthState ที่มี 11 actions).
 *
 * @example
 * ```ts
 * type S = { count: number };
 * type A = { type: 'inc' } | { type: 'reset' };
 *
 * const [dispatch, state$] = createReducerSignal<S, A>(
 *   { count: 0 },
 *   (state, action) => action.type === 'inc' ? { count: state.count + 1 } : { count: 0 }
 * );
 *
 * dispatch({ type: 'inc' });
 * state$.getValue().count; // 1
 * ```
 *
 * @param initialState - state เริ่มต้น
 * @param reducer - function ที่คำนวณ state ใหม่จาก action
 * @returns tuple [dispatch, state$]
 */
export function createReducerSignal<S, A>(
  initialState: S,
  reducer: (state: S, action: A) => S,
): [(action: A) => void, DefaultedStateObservable<S>] {
  const actions$ = new Subject<A>();
  const state$ = state(
    // scan = reducer pattern ของ RxJS
    // - seed = initialState (ค่าเริ่มต้นก่อนมี action ใด ๆ)
    // - ทุก action จะถูกส่งผ่าน reducer เพื่อคำนวณ state ใหม่
    // startWith ที่ไม่ซ้ำซ้อน: scan seed จะถูก emit ก่อน action แรกอยู่แล้ว
    actions$.pipe(
      scan<A, S>((acc, action) => reducer(acc, action), initialState),
      startWith(initialState),
    ),
    initialState,
  );

  const dispatch = (action: A): void => {
    actions$.next(action);
  };

  return [dispatch, state$];
}
