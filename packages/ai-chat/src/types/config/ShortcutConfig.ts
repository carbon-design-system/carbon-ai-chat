/*
 *  Copyright IBM Corp. 2025, 2026
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
   * Whether the keyboard shortcut is enabled. Defaults to `false`, so the shortcut is
   * inactive until you turn it on. Setting `key` or `modifiers` alone does not enable it.
   */
  isOn?: boolean;

  /**
   * The key to match, compared case-insensitively against `KeyboardEvent.key`.
   * Examples: `"c"`, `"F6"`, `"/"`. Each shortcut supplies its own default, so omit this
   * to keep the built-in binding and set only {@link ChatShortcutConfig.isOn}.
   */
  key?: string;

  /**
   * Modifier keys that must be held for the shortcut to match. A modifier left unset must
   * not be held, so `{ ctrl: true }` does not match Ctrl + Shift + the key. Omit this to
   * keep the shortcut's default modifiers.
   */
  modifiers?: {
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
   * Shortcut to toggle focus between the message list and input field. Disabled unless you
   * set {@link ChatShortcutConfig.isOn} to `true`. Defaults to F6, the standard Windows
   * accessibility shortcut for cycling between regions.
   */
  messageFocusToggle?: ChatShortcutConfig;
}
