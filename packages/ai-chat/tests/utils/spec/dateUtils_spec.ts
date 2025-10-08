/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  sanitizeDateFormat,
  toUserDateFormat,
  toAssistantDateFormat,
} from "../../../src/chat/utils/dateUtils";

describe("dateUtils", () => {
  describe("sanitizeDateFormat", () => {
    it("should remove spaces and periods from format", () => {
      expect(sanitizeDateFormat("mm/dd/yyyy.")).toBe("mm/dd/yyyy");
      expect(sanitizeDateFormat("mm / dd / yyyy")).toBe("mm/dd/yyyy");
    });

    it("should convert single m to mm", () => {
      expect(sanitizeDateFormat("m/dd/yyyy")).toBe("mm/dd/yyyy");
    });

    it("should convert single d to dd", () => {
      expect(sanitizeDateFormat("mm/d/yyyy")).toBe("mm/dd/yyyy");
    });

    it("should handle both single m and d", () => {
      expect(sanitizeDateFormat("m/d/yyyy")).toBe("mm/dd/yyyy");
    });

    it("should not modify already correct format", () => {
      expect(sanitizeDateFormat("mm/dd/yyyy")).toBe("mm/dd/yyyy");
    });

    it("should handle different separators", () => {
      expect(sanitizeDateFormat("mm-dd-yyyy")).toBe("mm-dd-yyyy");
      expect(sanitizeDateFormat("mm.dd.yyyy")).toBe("mm.dd.yyyy"); // periods are not removed unless at end
    });
  });

  describe("toUserDateFormat", () => {
    it("should format date according to provided format", () => {
      const date = new Date(2023, 11, 25); // December 25, 2023
      expect(toUserDateFormat(date, "mm/dd/yyyy")).toBe("12/25/2023");
    });

    it("should pad single-digit day and month", () => {
      const date = new Date(2023, 0, 5); // January 5, 2023
      expect(toUserDateFormat(date, "mm/dd/yyyy")).toBe("01/05/2023");
    });

    it("should handle different separators", () => {
      const date = new Date(2023, 11, 25);
      expect(toUserDateFormat(date, "mm-dd-yyyy")).toBe("12-25-2023");
      expect(toUserDateFormat(date, "dd/mm/yyyy")).toBe("25/12/2023");
    });

    it("should handle different order", () => {
      const date = new Date(2023, 11, 25);
      expect(toUserDateFormat(date, "yyyy-mm-dd")).toBe("2023-12-25");
      expect(toUserDateFormat(date, "dd.mm.yyyy")).toBe("25.12.2023");
    });
  });

  describe("toAssistantDateFormat", () => {
    it("should format date as yyyy-mm-dd", () => {
      const date = new Date(2023, 11, 25); // December 25, 2023
      expect(toAssistantDateFormat(date)).toBe("2023-12-25");
    });

    it("should pad single-digit day and month", () => {
      const date = new Date(2023, 0, 5); // January 5, 2023
      expect(toAssistantDateFormat(date)).toBe("2023-01-05");
    });

    it("should handle leap year", () => {
      const date = new Date(2024, 1, 29); // February 29, 2024
      expect(toAssistantDateFormat(date)).toBe("2024-02-29");
    });

    it("should handle year boundaries", () => {
      const date = new Date(2023, 11, 31); // December 31, 2023
      expect(toAssistantDateFormat(date)).toBe("2023-12-31");
    });
  });
});
