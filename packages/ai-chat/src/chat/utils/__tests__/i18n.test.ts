/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createIntl, isValidFormatter } from "../i18n";

describe("i18n utilities", () => {
  const testMessages = {
    simple: "Hello World",
    withVariable: "Hello {name}",
    withPlural: "{count, plural, one {# item} other {# items}}",
    withNumber: "Price: {price, number}",
    complexPlural:
      "Current wait time is <b>{time, number} {time, plural, one {minute} other {minutes}}</b>.",
    multiVariable:
      "{start, number}–{end, number} of {count, number} {count, plural, one {item} other {items}}",
  };

  describe("createIntl", () => {
    it("should create a valid formatter instance", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });

      expect(formatter).toBeDefined();
      expect(formatter.locale).toBe("en");
      expect(formatter.messages).toBe(testMessages);
      expect(typeof formatter.formatMessage).toBe("function");
      expect(typeof formatter.formatDate).toBe("function");
      expect(typeof formatter.formatNumber).toBe("function");
      expect(typeof formatter.formatTime).toBe("function");
    });

    it("should format simple messages", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });
      const result = formatter.formatMessage({ id: "simple" });

      expect(result).toBe("Hello World");
    });

    it("should format messages with variables", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });
      const result = formatter.formatMessage(
        { id: "withVariable" },
        { name: "Alice" },
      );

      expect(result).toBe("Hello Alice");
    });

    it("should format messages with plurals (singular)", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });
      const result = formatter.formatMessage(
        { id: "withPlural" },
        { count: 1 },
      );

      expect(result).toBe("1 item");
    });

    it("should format messages with plurals (plural)", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });
      const result = formatter.formatMessage(
        { id: "withPlural" },
        { count: 5 },
      );

      expect(result).toBe("5 items");
    });

    it("should format messages with numbers", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });
      const result = formatter.formatMessage(
        { id: "withNumber" },
        { price: 1234.56 },
      );

      expect(result).toContain("1,234.56");
    });

    it("should format complex plural messages with HTML", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });
      const result = formatter.formatMessage(
        { id: "complexPlural" },
        { time: 5 },
      );

      expect(result).toContain("5");
      expect(result).toContain("minutes");
      expect(result).toContain("<b>");
      expect(result).toContain("</b>");
    });

    it("should format messages with multiple variables and plurals", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });
      const result = formatter.formatMessage(
        { id: "multiVariable" },
        {
          start: 1,
          end: 10,
          count: 100,
        },
      );

      expect(result).toContain("1");
      expect(result).toContain("10");
      expect(result).toContain("100");
      expect(result).toContain("items");
    });

    it("should handle missing message keys gracefully", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = formatter.formatMessage({ id: "nonexistent" });

      expect(result).toBe("nonexistent");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing translation for key: "nonexistent"'),
      );

      consoleSpy.mockRestore();
    });

    it("should handle formatting errors gracefully", () => {
      const formatter = createIntl({
        locale: "en",
        messages: {
          invalid: "{broken syntax",
        },
      });
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = formatter.formatMessage({ id: "invalid" });

      expect(result).toBe("{broken syntax");
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("formatDate", () => {
    it("should format dates according to locale", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });
      const date = new Date("2025-01-15T12:00:00Z");

      const result = formatter.formatDate(date);

      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("should accept date format options", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });
      const date = new Date("2025-01-15T12:00:00Z");

      const result = formatter.formatDate(date, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      expect(result).toContain("2025");
      expect(result).toContain("January");
    });
  });

  describe("formatNumber", () => {
    it("should format numbers according to locale", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });

      const result = formatter.formatNumber(1234567.89);

      expect(result).toBe("1,234,567.89");
    });

    it("should accept number format options", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });

      const result = formatter.formatNumber(0.5, {
        style: "percent",
      });

      expect(result).toBe("50%");
    });
  });

  describe("formatTime", () => {
    it("should format time according to locale", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });
      const date = new Date("2025-01-15T14:30:00Z");

      const result = formatter.formatTime(date);

      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });
  });

  describe("isValidFormatter", () => {
    it("should return true for valid formatter", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });

      expect(isValidFormatter(formatter)).toBe(true);
    });

    it("should return false for invalid objects", () => {
      expect(isValidFormatter(null)).toBe(false);
      expect(isValidFormatter(undefined)).toBe(false);
      expect(isValidFormatter({})).toBe(false);
      expect(isValidFormatter({ formatMessage: () => {} })).toBe(false);
    });
  });

  describe("formatter caching", () => {
    it("should cache formatters for performance", () => {
      const formatter = createIntl({
        locale: "en",
        messages: testMessages,
      });

      // Call the same message multiple times
      const result1 = formatter.formatMessage(
        { id: "withVariable" },
        {
          name: "Alice",
        },
      );
      const result2 = formatter.formatMessage(
        { id: "withVariable" },
        { name: "Bob" },
      );

      expect(result1).toBe("Hello Alice");
      expect(result2).toBe("Hello Bob");
    });
  });
});

// Made with Bob
