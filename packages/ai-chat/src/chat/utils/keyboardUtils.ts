/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatShortcutConfig } from "../../types/config/ShortcutConfig";

/**
 * Checks if a keyboard event matches the given shortcut configuration.
 *
 * This function prefers event.code for reliable key detection with modifiers,
 * as it avoids issues with modifier keys producing special characters
 * (e.g., Alt+Shift+C = "Ç" on macOS). Falls back to event.key for compatibility
 * with test environments and older browsers.
 *
 * @param event - The keyboard event to check
 * @param config - The shortcut configuration to match against
 * @returns true if the event matches the shortcut configuration
 */
export function matchesShortcut(
  event: KeyboardEvent,
  config: ChatShortcutConfig,
): boolean {
  let keyMatches = false;

  // Try event.code first (more reliable with modifiers)
  if (event.code) {
    // event.code format: "KeyA", "KeyB", "Digit1", "Space", "Enter", etc.
    // For single letter keys, convert config.key to "Key" + uppercase letter
    let expectedCode: string;
    if (config.key.length === 1 && /[a-zA-Z]/.test(config.key)) {
      expectedCode = `Key${config.key.toUpperCase()}`;
    } else if (config.key.length === 1 && /[0-9]/.test(config.key)) {
      expectedCode = `Digit${config.key}`;
    } else {
      // For special keys like "Enter", "Space", "Escape", use the key directly
      // but capitalize first letter to match code format
      expectedCode = config.key.charAt(0).toUpperCase() + config.key.slice(1);
    }
    keyMatches = event.code === expectedCode;
  }

  // Fallback to event.key (case-insensitive comparison)
  if (!keyMatches && event.key) {
    keyMatches = event.key.toLowerCase() === config.key.toLowerCase();
  }

  if (!keyMatches) {
    return false;
  }

  // Check all modifiers
  const altMatches = !!config.modifiers.alt === event.altKey;
  const shiftMatches = !!config.modifiers.shift === event.shiftKey;
  const ctrlMatches = !!config.modifiers.ctrl === event.ctrlKey;
  const metaMatches = !!config.modifiers.meta === event.metaKey;

  return altMatches && shiftMatches && ctrlMatches && metaMatches;
}

/**
 * Formats a shortcut configuration into a human-readable string.
 * Example: { key: 'c', modifiers: { alt: true, shift: true } } => "Alt + Shift + C"
 *
 * @param config - The shortcut configuration to format
 * @returns A human-readable string representation of the shortcut
 */
export function formatShortcutForDisplay(config: ChatShortcutConfig): string {
  const parts: string[] = [];

  // Add modifiers in a consistent order
  if (config.modifiers.ctrl) {
    parts.push("Ctrl");
  }
  if (config.modifiers.alt) {
    parts.push("Alt");
  }
  if (config.modifiers.shift) {
    parts.push("Shift");
  }
  if (config.modifiers.meta) {
    // Use platform-specific name for meta key
    const isMac =
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    parts.push(isMac ? "Cmd" : "Meta");
  }

  // Add the key (capitalize single letters, keep special keys as-is)
  const key = config.key.length === 1 ? config.key.toUpperCase() : config.key;
  parts.push(key);

  return parts.join(" + ");
}
