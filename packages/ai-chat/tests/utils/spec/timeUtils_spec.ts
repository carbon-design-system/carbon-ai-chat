/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { timestampToTimeString } from "../../../src/chat/utils/timeUtils";

// Mock dayjs to have consistent test results. The default format is the en 12-hour "LT"; a
// per-call `.locale("fr")` switches to a 24-hour render so a test can prove the locale is applied
// per call rather than read from the process-global default.
jest.mock("dayjs", () => {
  const originalDayjs = jest.requireActual("dayjs");
  const twelveHour = (timestamp: number | Date | string) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  };
  const twentyFourHour = (timestamp: number | Date | string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  const makeInstance = (timestamp: number | Date | string) => ({
    locale: jest.fn(() => ({
      format: jest.fn((format) =>
        format === "LT"
          ? twentyFourHour(timestamp)
          : originalDayjs(timestamp).format(format),
      ),
    })),
    format: jest.fn((format) =>
      format === "LT"
        ? twelveHour(timestamp)
        : originalDayjs(timestamp).format(format),
    ),
  });
  const mockDayjs: any = jest.fn((timestamp) => makeInstance(timestamp));
  // Registered-locale table dayjs exposes as `dayjs.Ls`; only "fr" is loaded here.
  mockDayjs.Ls = { fr: {} };
  return mockDayjs;
});

describe("timeUtils", () => {
  describe("timestampToTimeString", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should format number timestamp to time string", () => {
      const timestamp = new Date(2023, 11, 25, 14, 30, 0).getTime();
      const result = timestampToTimeString(timestamp);
      expect(result).toBe("2:30 PM");
    });

    it("should format Date object to time string", () => {
      const date = new Date(2023, 11, 25, 9, 15, 0);
      const result = timestampToTimeString(date);
      expect(result).toBe("9:15 AM");
    });

    it("should format string timestamp to time string", () => {
      const timestamp = new Date(2023, 11, 25, 23, 45, 0).toISOString();
      const result = timestampToTimeString(timestamp);
      expect(result).toBe("11:45 PM");
    });

    it("should handle midnight", () => {
      const timestamp = new Date(2023, 11, 25, 0, 0, 0).getTime();
      const result = timestampToTimeString(timestamp);
      expect(result).toBe("12:00 AM");
    });

    it("should handle noon", () => {
      const timestamp = new Date(2023, 11, 25, 12, 0, 0).getTime();
      const result = timestampToTimeString(timestamp);
      expect(result).toBe("12:00 PM");
    });

    it("should pad minutes with zeros", () => {
      const timestamp = new Date(2023, 11, 25, 15, 5, 0).getTime();
      const result = timestampToTimeString(timestamp);
      expect(result).toBe("3:05 PM");
    });

    it("applies a registered locale per call rather than the global default", () => {
      const timestamp = new Date(2023, 11, 25, 15, 5, 0).getTime();
      // "fr" is registered in the mock, so it is applied per call (24-hour render).
      expect(timestampToTimeString(timestamp, "fr")).toBe("15:05");
    });

    it("falls back to the default format for an unregistered locale", () => {
      const timestamp = new Date(2023, 11, 25, 15, 5, 0).getTime();
      // "zz" is not in the registry, so the default (12-hour) format is used — this never
      // silently pulls another instance's global locale.
      expect(timestampToTimeString(timestamp, "zz")).toBe("3:05 PM");
    });
  });
});
