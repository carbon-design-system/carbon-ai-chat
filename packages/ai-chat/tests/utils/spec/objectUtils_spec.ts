/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { deepFreeze } from "../../../src/chat/utils/lang/objectUtils";

describe("objectUtils", () => {
  describe("deepFreeze", () => {
    it("should freeze simple object", () => {
      const obj = { a: 1, b: 2 };
      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(() => {
        (frozen as any).a = 3;
      }).toThrow();
    });

    it("should deep freeze nested objects", () => {
      const obj = {
        a: 1,
        nested: {
          b: 2,
          deeper: {
            c: 3,
          },
        },
      };

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.nested)).toBe(true);
      expect(Object.isFrozen(frozen.nested.deeper)).toBe(true);
    });

    it("should freeze arrays", () => {
      const obj = {
        arr: [1, 2, 3],
        nested: {
          arr: [{ a: 1 }, { b: 2 }],
        },
      };

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen.arr)).toBe(true);
      expect(Object.isFrozen(frozen.nested.arr)).toBe(true);
      expect(Object.isFrozen(frozen.nested.arr[0])).toBe(true);
    });

    it("should handle null values", () => {
      const obj: {
        a: null;
        b: undefined;
        c: {
          d: null;
        };
      } = {
        a: null,
        b: undefined,
        c: {
          d: null,
        },
      };

      const frozen = deepFreeze(obj);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.c)).toBe(true);
    });

    it("should freeze functions", () => {
      const obj = {
        fn: function () {
          return "test";
        },
        nested: {
          fn: () => "arrow",
        },
      };

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen.fn)).toBe(true);
      expect(Object.isFrozen(frozen.nested.fn)).toBe(true);
    });

    it("should handle already frozen objects", () => {
      const innerObj = { a: 1 };
      Object.freeze(innerObj);

      const obj = {
        frozen: innerObj,
        normal: { b: 2 },
      };

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.frozen)).toBe(true);
      expect(Object.isFrozen(frozen.normal)).toBe(true);
    });

    it("should return the same object reference", () => {
      const obj = { a: 1 };
      const frozen = deepFreeze(obj);
      expect(frozen).toBe(obj);
    });

    it("should handle circular references", () => {
      const obj: any = { a: 1 };
      obj.self = obj;

      expect(() => deepFreeze(obj)).not.toThrow();
      expect(Object.isFrozen(obj)).toBe(true);
    });
  });
});
