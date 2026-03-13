/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Configuration for a keyboard shortcut.
 *
 * @category Config
 * @experimental
 */
export interface ChatShortcutConfig {
  /**
   * Whether the keyboard shortcut is enabled.
   * Default: true
   */
  is_on?: boolean;

  /**
   * The primary key (e.g., 'c', 'F6', '/')
   */
  key: string;

  /**
   * Modifier keys required to be held
   */
  modifiers: {
    alt?: boolean;
    shift?: boolean;
    ctrl?: boolean;
    meta?: boolean;
  };
}

/**
 * Configuration for all keyboard shortcuts in the chat.
 * Designed to be extensible for future shortcuts.
 *
 * @category Config
 * @experimental
 */
export interface KeyboardShortcuts {
  /**
   * Shortcut to toggle focus between the message list and input field.
   * Default: F6 (standard Windows accessibility shortcut for cycling between regions)
   */
  messageFocusToggle?: ChatShortcutConfig;
}

/**
 * Default keyboard shortcut for toggling focus between message list and input.
 * F6 is a standard accessibility shortcut used in Windows and many applications
 * for cycling between major regions/panels. It doesn't produce special characters
 * and is widely recognized for navigation purposes.
 *
 * Default configuration:
 * {
 *   key: "F6",
 *   modifiers: {},
 *   is_on: true
 * }
 *
 * Note: This shortcut is enabled by default to improve accessibility.
 * Users can disable it via configuration if needed.
 */
export const DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT: ChatShortcutConfig = {
  key: "F6",
  modifiers: {},
  is_on: true,
};
