/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// This spec is intentionally focused on compile-time checks.
// If any of the type assertions fail, ts-jest will surface a
// compilation error and fail the test suite.

// Utility types for compile-time assertions
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type AssertTrue<T extends true> = T;

// Value-side export maps (enums and runtime exports)
type ClientValues = typeof import("../../../src/aiChatEntry");
type ServerValues = typeof import("../../../src/serverEntry");

// 1) Server exports must be a subset of client exports (additive changes allowed on client)
type ServerOnlyAllowedKeys = "loadAllLazyDeps";
type _NoExtraServerExports = AssertTrue<
  Equals<
    Exclude<
      Exclude<keyof ServerValues, keyof ClientValues>,
      ServerOnlyAllowedKeys
    >,
    never
  >
>;

// 2) All shared exports must have identical types on both sides (no breaking changes)
type SharedKeys = Extract<keyof ServerValues, keyof ClientValues>;
type _AllSharedExact = AssertTrue<
  {
    [K in SharedKeys]: Equals<ServerValues[K], ClientValues[K]>;
  }[SharedKeys] extends true
    ? true
    : false
>;

// 3) Server must not export React component values
type ForbiddenComponentKeys = "ChatContainer" | "ChatCustomElement";
type _ServerHasNoComponents = AssertTrue<
  Equals<Extract<keyof ServerValues, ForbiddenComponentKeys>, never>
>;

// Keep a minimal runtime test so Jest reports a passing spec when compilation succeeds.
describe("API compatibility (server vs client)", () => {
  it("compiles with matching export surface", () => {
    expect(true).toBe(true);
  });
});
