/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  matchesShortcut,
  formatShortcutForDisplay,
} from "../../../src/chat/utils/keyboardUtils";
import { ChatShortcutConfig } from "../../../src/types/config/ShortcutConfig";

// Test helper to create keyboard events
const createKeyboardEvent = (
  key: string,
  modifiers: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  } = {},
): KeyboardEvent =>
  ({
    key,
    ctrlKey: modifiers.ctrl || false,
    altKey: modifiers.alt || false,
    shiftKey: modifiers.shift || false,
    metaKey: modifiers.meta || false,
  }) as KeyboardEvent;

describe("keyboardUtils", () => {
  describe("matchesShortcut", () => {
    it("should return true when key and all modifiers match exactly", () => {
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: { alt: true, shift: true },
      };
      const event = createKeyboardEvent("c", { alt: true, shift: true });
      expect(matchesShortcut(event, config)).toBe(true);
    });

    it("should be case-insensitive for key matching", () => {
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: { alt: true },
      };
      expect(
        matchesShortcut(createKeyboardEvent("C", { alt: true }), config),
      ).toBe(true);
      expect(
        matchesShortcut(createKeyboardEvent("c", { alt: true }), config),
      ).toBe(true);
    });

    it("should return false when key does not match", () => {
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: { alt: true },
      };
      const event = createKeyboardEvent("d", { alt: true });
      expect(matchesShortcut(event, config)).toBe(false);
    });

    it("should return false when any modifier does not match", () => {
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: { alt: true, shift: true },
      };

      // Missing shift
      expect(
        matchesShortcut(createKeyboardEvent("c", { alt: true }), config),
      ).toBe(false);

      // Missing alt
      expect(
        matchesShortcut(createKeyboardEvent("c", { shift: true }), config),
      ).toBe(false);

      // Extra ctrl
      expect(
        matchesShortcut(
          createKeyboardEvent("c", { alt: true, shift: true, ctrl: true }),
          config,
        ),
      ).toBe(false);
    });

    it("should handle all modifier combinations", () => {
      const configs = [
        { key: "a", modifiers: { ctrl: true } },
        { key: "b", modifiers: { alt: true } },
        { key: "c", modifiers: { shift: true } },
        { key: "d", modifiers: { meta: true } },
        {
          key: "e",
          modifiers: { ctrl: true, alt: true, shift: true, meta: true },
        },
      ];

      configs.forEach((config) => {
        const event = createKeyboardEvent(config.key, config.modifiers);
        expect(matchesShortcut(event, config as ChatShortcutConfig)).toBe(true);
      });
    });

    it("should handle shortcuts with no modifiers", () => {
      const config: ChatShortcutConfig = {
        key: "Escape",
        modifiers: {},
      };
      const event = createKeyboardEvent("Escape");
      expect(matchesShortcut(event, config)).toBe(true);
    });

    it("should return false when extra modifiers are pressed", () => {
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: { alt: true },
      };

      // Extra shift
      expect(
        matchesShortcut(
          createKeyboardEvent("c", { alt: true, shift: true }),
          config,
        ),
      ).toBe(false);

      // Extra ctrl
      expect(
        matchesShortcut(
          createKeyboardEvent("c", { alt: true, ctrl: true }),
          config,
        ),
      ).toBe(false);

      // Extra meta
      expect(
        matchesShortcut(
          createKeyboardEvent("c", { alt: true, meta: true }),
          config,
        ),
      ).toBe(false);
    });

    it("should handle special keys", () => {
      const specialKeys = [
        "F1",
        "F6",
        "Escape",
        "Tab",
        "Enter",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ];

      specialKeys.forEach((key) => {
        const config: ChatShortcutConfig = {
          key,
          modifiers: { ctrl: true },
        };
        const event = createKeyboardEvent(key, { ctrl: true });
        expect(matchesShortcut(event, config)).toBe(true);
      });
    });

    it("should handle shortcuts with multiple modifiers", () => {
      const config: ChatShortcutConfig = {
        key: "s",
        modifiers: { ctrl: true, shift: true, alt: true },
      };
      const event = createKeyboardEvent("s", {
        ctrl: true,
        shift: true,
        alt: true,
      });
      expect(matchesShortcut(event, config)).toBe(true);
    });

    it("should return false when no modifiers are required but some are pressed", () => {
      const config: ChatShortcutConfig = {
        key: "Escape",
        modifiers: {},
      };
      const event = createKeyboardEvent("Escape", { ctrl: true });
      expect(matchesShortcut(event, config)).toBe(false);
    });
  });

  describe("formatShortcutForDisplay", () => {
    // Store original platform
    const originalPlatform = Object.getOwnPropertyDescriptor(
      navigator,
      "platform",
    );

    afterEach(() => {
      // Restore original platform
      if (originalPlatform) {
        Object.defineProperty(navigator, "platform", originalPlatform);
      }
    });

    it("should format single key shortcuts correctly", () => {
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: {},
      };
      expect(formatShortcutForDisplay(config)).toBe("C");
    });

    it("should capitalize single letter keys", () => {
      const keys = ["a", "b", "c", "x", "y", "z"];
      keys.forEach((key) => {
        const config: ChatShortcutConfig = {
          key,
          modifiers: {},
        };
        expect(formatShortcutForDisplay(config)).toBe(key.toUpperCase());
      });
    });

    it("should format shortcuts with modifiers in correct order", () => {
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: { alt: true, shift: true },
      };
      expect(formatShortcutForDisplay(config)).toBe("Alt + Shift + C");
    });

    it("should maintain order: Ctrl, Alt, Shift, Meta", () => {
      // Mock non-Mac platform
      Object.defineProperty(navigator, "platform", {
        value: "Win32",
        configurable: true,
      });

      const config: ChatShortcutConfig = {
        key: "s",
        modifiers: { meta: true, shift: true, alt: true, ctrl: true },
      };
      expect(formatShortcutForDisplay(config)).toBe(
        "Ctrl + Alt + Shift + Meta + S",
      );
    });

    it("should preserve special key names", () => {
      const configs = [
        { key: "Escape", modifiers: {}, expected: "Escape" },
        { key: "F6", modifiers: { ctrl: true }, expected: "Ctrl + F6" },
        {
          key: "ArrowUp",
          modifiers: { alt: true },
          expected: "Alt + ArrowUp",
        },
        { key: "Enter", modifiers: {}, expected: "Enter" },
        { key: "Tab", modifiers: { shift: true }, expected: "Shift + Tab" },
      ];

      configs.forEach(({ key, modifiers, expected }) => {
        expect(
          formatShortcutForDisplay({ key, modifiers } as ChatShortcutConfig),
        ).toBe(expected);
      });
    });

    it("should use Cmd for meta key on Mac", () => {
      // Mock Mac platform
      Object.defineProperty(navigator, "platform", {
        value: "MacIntel",
        configurable: true,
      });

      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: { meta: true },
      };
      expect(formatShortcutForDisplay(config)).toBe("Cmd + C");
    });

    it("should use Meta for meta key on Windows", () => {
      // Mock Windows platform
      Object.defineProperty(navigator, "platform", {
        value: "Win32",
        configurable: true,
      });

      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: { meta: true },
      };
      expect(formatShortcutForDisplay(config)).toBe("Meta + C");
    });

    it("should use Cmd for meta key on iPhone", () => {
      // Mock iPhone platform
      Object.defineProperty(navigator, "platform", {
        value: "iPhone",
        configurable: true,
      });

      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: { meta: true },
      };
      expect(formatShortcutForDisplay(config)).toBe("Cmd + C");
    });

    it("should handle shortcuts with only ctrl modifier", () => {
      const config: ChatShortcutConfig = {
        key: "s",
        modifiers: { ctrl: true },
      };
      expect(formatShortcutForDisplay(config)).toBe("Ctrl + S");
    });

    it("should handle shortcuts with only alt modifier", () => {
      const config: ChatShortcutConfig = {
        key: "f",
        modifiers: { alt: true },
      };
      expect(formatShortcutForDisplay(config)).toBe("Alt + F");
    });

    it("should handle shortcuts with only shift modifier", () => {
      const config: ChatShortcutConfig = {
        key: "Tab",
        modifiers: { shift: true },
      };
      expect(formatShortcutForDisplay(config)).toBe("Shift + Tab");
    });

    it("should handle complex multi-modifier shortcuts", () => {
      const config: ChatShortcutConfig = {
        key: "F12",
        modifiers: { ctrl: true, shift: true },
      };
      expect(formatShortcutForDisplay(config)).toBe("Ctrl + Shift + F12");
    });
  });
});
