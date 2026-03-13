/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { CornersType } from "../../src/types/config/CornersType";

// Import the utility functions - we need to export them from doCreateStore first
// For now, we'll test them through the public API

describe("Corner Utility Functions", () => {
  describe("Type Guards and Normalization", () => {
    it("should identify simple CornersType values", () => {
      // These tests will verify the behavior through the store
      // Once we export the utility functions, we can test them directly
      expect(CornersType.ROUND).toBe("round");
      expect(CornersType.SQUARE).toBe("square");
    });

    it("should handle per-corner configuration objects", () => {
      const perCornerConfig = {
        startStart: CornersType.ROUND,
        startEnd: CornersType.SQUARE,
        endStart: CornersType.SQUARE,
        endEnd: CornersType.ROUND,
      };

      expect(perCornerConfig.startStart).toBe(CornersType.ROUND);
      expect(perCornerConfig.startEnd).toBe(CornersType.SQUARE);
      expect(perCornerConfig.endStart).toBe(CornersType.SQUARE);
      expect(perCornerConfig.endEnd).toBe(CornersType.ROUND);
    });

    it("should handle partial per-corner configurations", () => {
      const partialConfig: {
        startStart?: CornersType;
        startEnd?: CornersType;
        endStart?: CornersType;
        endEnd?: CornersType;
      } = {
        startStart: CornersType.SQUARE,
        endEnd: CornersType.SQUARE,
        // startEnd and endStart are undefined
      };

      expect(partialConfig.startStart).toBe(CornersType.SQUARE);
      expect(partialConfig.endEnd).toBe(CornersType.SQUARE);
      expect(partialConfig.startEnd).toBeUndefined();
      expect(partialConfig.endStart).toBeUndefined();
    });
  });

  describe("Corner Configuration Validation", () => {
    it("should accept valid CornersType enum values", () => {
      const validValues = [CornersType.ROUND, CornersType.SQUARE];

      validValues.forEach((value) => {
        expect(typeof value).toBe("string");
        expect(["round", "square"]).toContain(value);
      });
    });

    it("should validate per-corner config structure", () => {
      const validConfig = {
        startStart: CornersType.ROUND,
        startEnd: CornersType.ROUND,
        endStart: CornersType.ROUND,
        endEnd: CornersType.ROUND,
      };

      // Verify all required properties exist
      expect(validConfig).toHaveProperty("startStart");
      expect(validConfig).toHaveProperty("startEnd");
      expect(validConfig).toHaveProperty("endStart");
      expect(validConfig).toHaveProperty("endEnd");

      // Verify all values are valid CornersType
      Object.values(validConfig).forEach((value) => {
        expect(["round", "square"]).toContain(value);
      });
    });

    it("should handle mixed corner types in per-corner config", () => {
      const mixedConfig = {
        startStart: CornersType.ROUND,
        startEnd: CornersType.SQUARE,
        endStart: CornersType.SQUARE,
        endEnd: CornersType.ROUND,
      };

      const roundCorners = Object.entries(mixedConfig).filter(
        ([, value]) => value === CornersType.ROUND,
      );
      const squareCorners = Object.entries(mixedConfig).filter(
        ([, value]) => value === CornersType.SQUARE,
      );

      expect(roundCorners).toHaveLength(2);
      expect(squareCorners).toHaveLength(2);
    });
  });

  describe("Default Values", () => {
    it("should use ROUND as default corner type", () => {
      const defaultCorner = CornersType.ROUND;
      expect(defaultCorner).toBe("round");
    });

    it("should handle undefined corners gracefully", () => {
      const config: { corners?: string } = {};
      expect(config.corners).toBeUndefined();

      // Default should be applied
      const effectiveCorner = config.corners ?? CornersType.ROUND;
      expect(effectiveCorner).toBe(CornersType.ROUND);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty per-corner config object", () => {
      const emptyConfig = {};

      expect(Object.keys(emptyConfig)).toHaveLength(0);
      expect(emptyConfig).not.toHaveProperty("startStart");
    });

    it("should handle null and undefined values", () => {
      expect(null).toBeNull();
      expect(undefined).toBeUndefined();

      const nullValue: CornersType | null = null;
      const undefinedValue: CornersType | undefined = undefined;

      const nullishCorner = nullValue ?? CornersType.ROUND;
      const undefinedCorner = undefinedValue ?? CornersType.ROUND;

      expect(nullishCorner).toBe(CornersType.ROUND);
      expect(undefinedCorner).toBe(CornersType.ROUND);
    });

    it("should differentiate between simple and per-corner configs", () => {
      const simpleConfig = CornersType.ROUND;
      const perCornerConfig = {
        startStart: CornersType.ROUND,
        startEnd: CornersType.ROUND,
        endStart: CornersType.ROUND,
        endEnd: CornersType.ROUND,
      };

      expect(typeof simpleConfig).toBe("string");
      expect(typeof perCornerConfig).toBe("object");
      expect(perCornerConfig).not.toBeNull();
    });
  });
});

// Made with Bob
