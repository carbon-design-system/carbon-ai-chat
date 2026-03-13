/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatShortcutConfig,
  KeyboardShortcuts,
  DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT,
} from "../../../src/types/config/ShortcutConfig";

describe("ShortcutConfig", () => {
  describe("Type Exports", () => {
    it("should export ChatShortcutConfig interface", () => {
      // Test that we can create a valid ChatShortcutConfig
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: {
          alt: true,
          shift: true,
        },
      };

      expect(config.key).toBe("c");
      expect(config.modifiers.alt).toBe(true);
      expect(config.modifiers.shift).toBe(true);
    });

    it("should export KeyboardShortcuts interface", () => {
      // Test that we can create a valid KeyboardShortcuts config
      const shortcuts: KeyboardShortcuts = {
        messageFocusToggle: {
          key: "f",
          modifiers: {
            ctrl: true,
          },
        },
      };

      expect(shortcuts.messageFocusToggle).toBeDefined();
      expect(shortcuts.messageFocusToggle?.key).toBe("f");
    });

    it("should allow optional is_on property in ChatShortcutConfig", () => {
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: {
          alt: true,
          shift: true,
        },
        is_on: false,
      };

      expect(config.is_on).toBe(false);
    });

    it("should allow is_on to be undefined (defaults to false)", () => {
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: {
          alt: true,
        },
      };

      expect(config.is_on).toBeUndefined();
    });

    it("should allow optional modifiers in ChatShortcutConfig", () => {
      const config: ChatShortcutConfig = {
        key: "Escape",
        modifiers: {},
      };

      expect(config.modifiers).toEqual({});
    });

    it("should allow all modifier combinations", () => {
      const config: ChatShortcutConfig = {
        key: "s",
        modifiers: {
          ctrl: true,
          alt: true,
          shift: true,
          meta: true,
        },
      };

      expect(config.modifiers.ctrl).toBe(true);
      expect(config.modifiers.alt).toBe(true);
      expect(config.modifiers.shift).toBe(true);
      expect(config.modifiers.meta).toBe(true);
    });

    it("should allow partial modifier specification", () => {
      const config1: ChatShortcutConfig = {
        key: "a",
        modifiers: {
          ctrl: true,
        },
      };

      const config2: ChatShortcutConfig = {
        key: "b",
        modifiers: {
          alt: true,
          shift: true,
        },
      };

      expect(config1.modifiers.ctrl).toBe(true);
      expect(config1.modifiers.alt).toBeUndefined();

      expect(config2.modifiers.alt).toBe(true);
      expect(config2.modifiers.shift).toBe(true);
      expect(config2.modifiers.ctrl).toBeUndefined();
    });
  });

  describe("DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT", () => {
    it("should have correct default key", () => {
      expect(DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT.key).toBe("F6");
    });

    it("should have correct default modifiers", () => {
      expect(DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT.modifiers.alt).toBeFalsy();
      expect(DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT.modifiers.shift).toBeFalsy();
    });

    it("should not have ctrl modifier by default", () => {
      expect(DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT.modifiers.ctrl).toBeFalsy();
    });

    it("should not have meta modifier by default", () => {
      expect(DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT.modifiers.meta).toBeFalsy();
    });

    it("should be enabled by default (is_on: true)", () => {
      expect(DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT.is_on).toBe(true);
    });

    it("should be a valid ChatShortcutConfig", () => {
      const config: ChatShortcutConfig = DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT;
      expect(config.key).toBeDefined();
      expect(config.modifiers).toBeDefined();
    });
  });

  describe("KeyboardShortcuts Configuration", () => {
    it("should allow messageFocusToggle to be optional", () => {
      const shortcuts: KeyboardShortcuts = {};
      expect(shortcuts.messageFocusToggle).toBeUndefined();
    });

    it("should allow custom messageFocusToggle configuration", () => {
      const shortcuts: KeyboardShortcuts = {
        messageFocusToggle: {
          key: "F6",
          modifiers: {
            shift: true,
          },
        },
      };

      expect(shortcuts.messageFocusToggle?.key).toBe("F6");
      expect(shortcuts.messageFocusToggle?.modifiers.shift).toBe(true);
    });

    it("should support special keys", () => {
      const specialKeys = [
        "F1",
        "F6",
        "F12",
        "Escape",
        "Tab",
        "Enter",
        "ArrowUp",
        "ArrowDown",
      ];

      specialKeys.forEach((key) => {
        const config: ChatShortcutConfig = {
          key,
          modifiers: {},
        };
        expect(config.key).toBe(key);
      });
    });

    it("should support single letter keys", () => {
      const letters = ["a", "b", "c", "x", "y", "z"];

      letters.forEach((letter) => {
        const config: ChatShortcutConfig = {
          key: letter,
          modifiers: { ctrl: true },
        };
        expect(config.key).toBe(letter);
      });
    });
  });

  describe("Type Safety", () => {
    it("should enforce required key property", () => {
      // This test verifies TypeScript compilation
      // If key is missing, TypeScript will error
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: {},
      };

      expect(config.key).toBeDefined();
    });

    it("should enforce required modifiers property", () => {
      // This test verifies TypeScript compilation
      // If modifiers is missing, TypeScript will error
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: {},
      };

      expect(config.modifiers).toBeDefined();
    });

    it("should allow boolean values for modifiers", () => {
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: {
          ctrl: true,
          alt: false,
          shift: true,
          meta: false,
        },
      };

      expect(typeof config.modifiers.ctrl).toBe("boolean");
      expect(typeof config.modifiers.alt).toBe("boolean");
    });

    it("should allow undefined for optional modifier properties", () => {
      const config: ChatShortcutConfig = {
        key: "c",
        modifiers: {
          ctrl: true,
          // alt, shift, meta are undefined
        },
      };

      expect(config.modifiers.ctrl).toBe(true);
      expect(config.modifiers.alt).toBeUndefined();
      expect(config.modifiers.shift).toBeUndefined();
      expect(config.modifiers.meta).toBeUndefined();
    });
  });

  describe("Practical Usage Examples", () => {
    it("should support common keyboard shortcut patterns", () => {
      const shortcuts: KeyboardShortcuts = {
        messageFocusToggle: {
          key: "c",
          modifiers: { alt: true, shift: true },
        },
      };

      expect(shortcuts.messageFocusToggle).toBeDefined();
    });

    it("should support function key shortcuts", () => {
      const shortcuts: KeyboardShortcuts = {
        messageFocusToggle: {
          key: "F6",
          modifiers: {},
        },
      };

      expect(shortcuts.messageFocusToggle?.key).toBe("F6");
    });

    it("should support Ctrl+Key shortcuts", () => {
      const shortcuts: KeyboardShortcuts = {
        messageFocusToggle: {
          key: "k",
          modifiers: { ctrl: true },
        },
      };

      expect(shortcuts.messageFocusToggle?.modifiers.ctrl).toBe(true);
    });

    it("should support Cmd+Key shortcuts (meta)", () => {
      const shortcuts: KeyboardShortcuts = {
        messageFocusToggle: {
          key: "k",
          modifiers: { meta: true },
        },
      };

      expect(shortcuts.messageFocusToggle?.modifiers.meta).toBe(true);
    });

    it("should support complex multi-modifier shortcuts", () => {
      const shortcuts: KeyboardShortcuts = {
        messageFocusToggle: {
          key: "s",
          modifiers: {
            ctrl: true,
            alt: true,
            shift: true,
          },
        },
      };

      const config = shortcuts.messageFocusToggle;
      expect(config?.modifiers.ctrl).toBe(true);
      expect(config?.modifiers.alt).toBe(true);
      expect(config?.modifiers.shift).toBe(true);
    });
  });

  describe("is_on Property", () => {
    it("should allow is_on to be true", () => {
      const config: ChatShortcutConfig = {
        key: "F6",
        modifiers: {},
        is_on: true,
      };

      expect(config.is_on).toBe(true);
    });

    it("should allow is_on to be false", () => {
      const config: ChatShortcutConfig = {
        key: "F6",
        modifiers: {},
        is_on: false,
      };

      expect(config.is_on).toBe(false);
    });

    it("should work with messageFocusToggle when is_on is true", () => {
      const shortcuts: KeyboardShortcuts = {
        messageFocusToggle: {
          key: "F6",
          modifiers: {},
          is_on: true,
        },
      };

      expect(shortcuts.messageFocusToggle?.is_on).toBe(true);
    });

    it("should work with messageFocusToggle when is_on is false", () => {
      const shortcuts: KeyboardShortcuts = {
        messageFocusToggle: {
          key: "F6",
          modifiers: {},
          is_on: false,
        },
      };

      expect(shortcuts.messageFocusToggle?.is_on).toBe(false);
    });

    it("should default to undefined when not specified", () => {
      const shortcuts: KeyboardShortcuts = {
        messageFocusToggle: {
          key: "F6",
          modifiers: {},
        },
      };

      expect(shortcuts.messageFocusToggle?.is_on).toBeUndefined();
    });

    it("should work with complex shortcut configurations", () => {
      const shortcuts: KeyboardShortcuts = {
        messageFocusToggle: {
          key: "k",
          modifiers: {
            ctrl: true,
            shift: true,
          },
          is_on: false,
        },
      };

      expect(shortcuts.messageFocusToggle?.key).toBe("k");
      expect(shortcuts.messageFocusToggle?.modifiers.ctrl).toBe(true);
      expect(shortcuts.messageFocusToggle?.modifiers.shift).toBe(true);
      expect(shortcuts.messageFocusToggle?.is_on).toBe(false);
    });
  });
});
