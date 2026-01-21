/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  transformReactIconToCarbonIcon,
  isCarbonIcon,
} from "../utils/iconTransform";

// Import a representative sample of React icons to test
import Edit from "@carbon/icons-react/es/Edit";
import Add from "@carbon/icons-react/es/Add";
import Close from "@carbon/icons-react/es/Close";
import Download from "@carbon/icons-react/es/Download";
import Share from "@carbon/icons-react/es/Share";
import Launch from "@carbon/icons-react/es/Launch";
import Maximize from "@carbon/icons-react/es/Maximize";
import ChevronDown from "@carbon/icons-react/es/ChevronDown";
import Search from "@carbon/icons-react/es/Search";
import Settings from "@carbon/icons-react/es/Settings";

// Create array of test icons with their names
const testIcons = [
  { name: "Edit", component: Edit },
  { name: "Add", component: Add },
  { name: "Close", component: Close },
  { name: "Download", component: Download },
  { name: "Share", component: Share },
  { name: "Launch", component: Launch },
  { name: "Maximize", component: Maximize },
  { name: "ChevronDown", component: ChevronDown },
  { name: "Search", component: Search },
  { name: "Settings", component: Settings },
];

describe("Icon Transformation Utility", () => {
  describe("CarbonIcon no-op behavior", () => {
    it("should return CarbonIcon unchanged (no-op)", () => {
      const carbonIcon = {
        elem: "svg",
        attrs: {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 32 32",
          fill: "currentColor",
          width: 16,
          height: 16,
        },
        content: [{ elem: "path", attrs: { d: "M2 26H30V28H2z" } }],
        name: "test-icon",
        size: 16,
      };

      const result = transformReactIconToCarbonIcon(carbonIcon, 16);

      // Should return the exact same object (no transformation)
      expect(result).toBe(carbonIcon);
    });

    it("should correctly identify CarbonIcon objects", () => {
      const carbonIcon = {
        elem: "svg",
        attrs: { viewBox: "0 0 32 32" },
        content: [{ elem: "path", attrs: {} }],
        name: "test",
        size: 16,
      };

      expect(isCarbonIcon(carbonIcon)).toBe(true);
    });

    it("should reject non-CarbonIcon objects", () => {
      expect(isCarbonIcon({})).toBe(false);
      expect(isCarbonIcon(null)).toBe(false);
      expect(isCarbonIcon(undefined)).toBe(false);
      expect(isCarbonIcon(() => {})).toBe(false);
      expect(isCarbonIcon({ elem: "div" })).toBe(false);
      expect(isCarbonIcon({ elem: "svg", attrs: {} })).toBe(false); // Missing content
    });
  });

  describe("React icon transformation", () => {
    it("should successfully transform all test React icons", () => {
      const results: { name: string; success: boolean; error?: string }[] = [];

      testIcons.forEach(({ name, component }) => {
        try {
          const descriptor = transformReactIconToCarbonIcon(component, 16);

          // Validate the descriptor
          expect(isCarbonIcon(descriptor)).toBe(true);
          expect(descriptor.elem).toBe("svg");
          expect(descriptor.attrs).toBeDefined();
          expect(descriptor.attrs.viewBox).toBeDefined();
          expect(descriptor.content).toBeInstanceOf(Array);
          expect(descriptor.content.length).toBeGreaterThan(0);
          expect(descriptor.size).toBe(16);
          expect(descriptor.name).toBeDefined();

          results.push({ name, success: true });
        } catch (error) {
          results.push({
            name,
            success: false,
            error: (error as Error).message || String(error),
          });
        }
      });

      // Report failures
      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
        console.error("\n❌ Failed to transform icons:");
        failures.forEach((f) => {
          console.error(`  - ${f.name}: ${f.error}`);
        });
      }

      const successCount = results.filter((r) => r.success).length;
      console.log(
        `\n✅ Successfully transformed ${successCount}/${results.length} icons`,
      );

      // Expect 100% success rate
      expect(failures.length).toBe(0);
    });

    it("should handle icons with forwardRef (Edit icon)", () => {
      const descriptor = transformReactIconToCarbonIcon(Edit, 16);

      expect(isCarbonIcon(descriptor)).toBe(true);
      expect(descriptor.content.length).toBeGreaterThan(0);
    });

    it("should handle different icon sizes", () => {
      const descriptor16 = transformReactIconToCarbonIcon(Edit, 16);
      const descriptor20 = transformReactIconToCarbonIcon(Edit, 20);
      const descriptor24 = transformReactIconToCarbonIcon(Edit, 24);

      expect(descriptor16.size).toBe(16);
      expect(descriptor20.size).toBe(20);
      expect(descriptor24.size).toBe(24);

      expect(descriptor16.attrs.width).toBe(16);
      expect(descriptor20.attrs.width).toBe(20);
      expect(descriptor24.attrs.width).toBe(24);
    });
  });

  describe("Caching behavior", () => {
    it("should cache transformed icons", () => {
      const descriptor1 = transformReactIconToCarbonIcon(Edit, 16);
      const descriptor2 = transformReactIconToCarbonIcon(Edit, 16);

      // Should return same cached instance
      expect(descriptor1).toBe(descriptor2);
    });

    it("should create separate cache entries for different sizes", () => {
      const descriptor16 = transformReactIconToCarbonIcon(Edit, 16);
      const descriptor20 = transformReactIconToCarbonIcon(Edit, 20);

      expect(descriptor16.size).toBe(16);
      expect(descriptor20.size).toBe(20);
      expect(descriptor16).not.toBe(descriptor20);
    });

    it("should not cache CarbonIcon objects", () => {
      const carbonIcon = {
        elem: "svg",
        attrs: { viewBox: "0 0 32 32", width: 16, height: 16 },
        content: [{ elem: "path", attrs: {} }],
        name: "test",
        size: 16,
      };

      const result1 = transformReactIconToCarbonIcon(carbonIcon, 16);
      const result2 = transformReactIconToCarbonIcon(carbonIcon, 16);

      // Should return the same object (no-op, not cached)
      expect(result1).toBe(carbonIcon);
      expect(result2).toBe(carbonIcon);
    });
  });

  describe("Descriptor validation", () => {
    it("should validate all required CarbonIcon fields", () => {
      const descriptor = transformReactIconToCarbonIcon(Edit, 16);

      // Check all required fields exist
      expect(descriptor).toHaveProperty("elem");
      expect(descriptor).toHaveProperty("attrs");
      expect(descriptor).toHaveProperty("content");
      expect(descriptor).toHaveProperty("name");
      expect(descriptor).toHaveProperty("size");

      // Check types
      expect(typeof descriptor.elem).toBe("string");
      expect(typeof descriptor.attrs).toBe("object");
      expect(Array.isArray(descriptor.content)).toBe(true);
      expect(typeof descriptor.name).toBe("string");
      expect(typeof descriptor.size).toBe("number");
    });

    it("should extract SVG attributes correctly", () => {
      const descriptor = transformReactIconToCarbonIcon(Edit, 16);

      expect(descriptor.attrs.xmlns).toBe("http://www.w3.org/2000/svg");
      expect(descriptor.attrs.viewBox).toBeDefined();
      expect(descriptor.attrs.fill).toBe("currentColor");
      expect(descriptor.attrs.width).toBe(16);
      expect(descriptor.attrs.height).toBe(16);
    });

    it("should extract path elements correctly", () => {
      const descriptor = transformReactIconToCarbonIcon(Edit, 16);

      expect(descriptor.content.length).toBeGreaterThan(0);

      const pathElement = descriptor.content.find(
        (c: any) => c.elem === "path",
      );
      expect(pathElement).toBeDefined();
      expect(pathElement.attrs).toBeDefined();
      expect(pathElement.attrs.d).toBeDefined();
      expect(typeof pathElement.attrs.d).toBe("string");
    });
  });
});

// Made with Bob
