/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { timestampToTimeString } from "../../../src/chat/shared/utils/timeUtils";

// Mock dayjs to have consistent test results
jest.mock("dayjs", () => {
  const originalDayjs = jest.requireActual("dayjs");
  return jest.fn((timestamp) => ({
    format: jest.fn((format) => {
      if (format === "LT") {
        const date = new Date(timestamp);
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
      }
      return originalDayjs(timestamp).format(format);
    }),
  }));
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
  });
});
