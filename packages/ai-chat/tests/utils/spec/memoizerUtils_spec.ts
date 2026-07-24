/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createUnmappingMemoizer,
  memoizeFunction,
} from "../../../src/chat/utils/memoizerUtils";

describe("memoizeFunction", () => {
  it("recomputes only when arguments change by reference", () => {
    const fn = jest.fn((a: number, b: number) => a + b);
    const memoized = memoizeFunction(fn);

    expect(memoized(1, 2)).toBe(3);
    expect(memoized(1, 2)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);

    expect(memoized(2, 2)).toBe(4);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("createUnmappingMemoizer", () => {
  it("maps keys to their values", () => {
    const unmap = createUnmappingMemoizer<string>();
    expect(unmap(["a", "b"], { a: "1", b: "2", c: "3" })).toEqual(["1", "2"]);
  });

  it("returns the same array reference when keys and mapped values are unchanged", () => {
    const unmap = createUnmappingMemoizer<string>();
    const first = unmap(["a", "b"], { a: "1", b: "2" });
    // Fresh key array + fresh map object, identical content: identity must be preserved so
    // downstream === selectors (React, the value stores) see no change.
    const second = unmap(["a", "b"], { a: "1", b: "2" });
    expect(second).toBe(first);
  });

  it("returns a new array when the last key's value changes", () => {
    // Regression guard for the loop bound: the final element must be compared. An `index <=
    // length` bound compared one-past-the-end (always undefined) and could mask a real change to
    // the last value depending on inputs; `index < length` compares exactly the real elements.
    const unmap = createUnmappingMemoizer<string>();
    const first = unmap(["a", "b"], { a: "1", b: "2" });
    const second = unmap(["a", "b"], { a: "1", b: "CHANGED" });
    expect(second).not.toBe(first);
    expect(second).toEqual(["1", "CHANGED"]);
  });

  it("returns a new array when a key changes", () => {
    const unmap = createUnmappingMemoizer<string>();
    const first = unmap(["a", "b"], { a: "1", b: "2" });
    const second = unmap(["a", "c"], { a: "1", c: "2" });
    expect(second).not.toBe(first);
    expect(second).toEqual(["1", "2"]);
  });

  it("returns a new array when the key list length changes", () => {
    const unmap = createUnmappingMemoizer<string>();
    const first = unmap(["a"], { a: "1" });
    const second = unmap(["a", "b"], { a: "1", b: "2" });
    expect(second).not.toBe(first);
    expect(second).toEqual(["1", "2"]);
  });

  it("treats two empty key lists as unchanged", () => {
    const unmap = createUnmappingMemoizer<string>();
    const first = unmap([], {});
    const second = unmap([], {});
    expect(second).toBe(first);
  });
});
