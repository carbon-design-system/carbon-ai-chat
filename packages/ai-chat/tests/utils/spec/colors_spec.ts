/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { adjustLightness } from "../../../src/chat/utils/colors";

describe("colors", () => {
  describe("adjustLightness", () => {
    it("should lighten a color", async () => {
      const result = await adjustLightness("#000000", 50);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      expect(result).not.toBe("#000000");
    });

    it("should darken a color", async () => {
      const result = await adjustLightness("#ffffff", -50);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      expect(result).not.toBe("#ffffff");
    });

    it("should return lowercase hex", async () => {
      const result = await adjustLightness("#FFFFFF", -10);
      expect(result).toMatch(/^#[a-f0-9]{6}$/);
    });

    it("should handle zero adjustment", async () => {
      const result = await adjustLightness("#808080", 0);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("should handle large adjustments", async () => {
      const result1 = await adjustLightness("#808080", 100);
      const result2 = await adjustLightness("#808080", -100);
      expect(result1).toMatch(/^#[0-9a-f]{6}$/);
      expect(result2).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});
