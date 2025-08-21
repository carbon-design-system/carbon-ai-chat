/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  hexCodeToRGB,
  calculateContrast,
  whiteOrBlackText,
  MIN_CONTRAST,
  adjustLightness,
} from "../../../src/chat/shared/utils/colors";

describe("colors", () => {
  describe("hexCodeToRGB", () => {
    it("should convert 6-digit hex codes to RGB", () => {
      expect(hexCodeToRGB("#ffffff")).toEqual([255, 255, 255]);
      expect(hexCodeToRGB("#000000")).toEqual([0, 0, 0]);
      expect(hexCodeToRGB("#ff0000")).toEqual([255, 0, 0]);
      expect(hexCodeToRGB("#00ff00")).toEqual([0, 255, 0]);
      expect(hexCodeToRGB("#0000ff")).toEqual([0, 0, 255]);
    });

    it("should convert 3-digit hex codes to RGB", () => {
      expect(hexCodeToRGB("#fff")).toEqual([255, 255, 255]);
      expect(hexCodeToRGB("#000")).toEqual([0, 0, 0]);
      expect(hexCodeToRGB("#f00")).toEqual([255, 0, 0]);
      expect(hexCodeToRGB("#0f0")).toEqual([0, 255, 0]);
      expect(hexCodeToRGB("#00f")).toEqual([0, 0, 255]);
    });

    it("should handle mixed case hex codes", () => {
      expect(hexCodeToRGB("#FFFFFF")).toEqual([255, 255, 255]);
      expect(hexCodeToRGB("#AbCdEf")).toEqual([171, 205, 239]);
    });

    it("should return [0, 0, 0] for invalid hex codes and log error", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      expect(hexCodeToRGB("#ff")).toEqual([0, 0, 0]);
      expect(hexCodeToRGB("#fffffff")).toEqual([0, 0, 0]);
      expect(hexCodeToRGB("invalid")).toEqual([0, 0, 0]);

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      consoleSpy.mockRestore();
    });
  });

  describe("calculateContrast", () => {
    it("should calculate contrast between black and white", () => {
      const contrast = calculateContrast("#000000", "#ffffff");
      expect(contrast).toBeCloseTo(21, 1);
    });

    it("should calculate contrast between identical colors", () => {
      const contrast = calculateContrast("#ffffff", "#ffffff");
      expect(contrast).toBeCloseTo(1, 1);
    });

    it("should calculate contrast between red and white", () => {
      const contrast = calculateContrast("#ff0000", "#ffffff");
      expect(contrast).toBeGreaterThan(3);
      expect(contrast).toBeLessThan(6);
    });

    it("should handle order independence (color1 vs color2)", () => {
      const contrast1 = calculateContrast("#000000", "#ffffff");
      const contrast2 = calculateContrast("#ffffff", "#000000");
      expect(contrast1).toBeCloseTo(contrast2, 1);
    });

    it("should work with 3-digit hex codes", () => {
      const contrast = calculateContrast("#000", "#fff");
      expect(contrast).toBeCloseTo(21, 1);
    });
  });

  describe("whiteOrBlackText", () => {
    it("should return dark text for light backgrounds", () => {
      const textColor = whiteOrBlackText("#ffffff");
      expect(textColor).not.toBe("#ffffff"); // Should be dark text
    });

    it("should return light text for dark backgrounds", () => {
      const textColor = whiteOrBlackText("#000000");
      expect(textColor).toBe("#ffffff"); // Should be white text
    });

    it("should ensure minimum contrast is met", () => {
      const backgrounds = [
        "#ffffff",
        "#000000",
        "#ff0000",
        "#00ff00",
        "#0000ff",
      ];

      backgrounds.forEach((bg) => {
        const textColor = whiteOrBlackText(bg);
        const contrast = calculateContrast(textColor, bg);
        expect(contrast).toBeGreaterThanOrEqual(MIN_CONTRAST);
      });
    });
  });

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

  describe("MIN_CONTRAST", () => {
    it("should have correct minimum contrast value", () => {
      expect(MIN_CONTRAST).toBe(4.5);
    });
  });
});
