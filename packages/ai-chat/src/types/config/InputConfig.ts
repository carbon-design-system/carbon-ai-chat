/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Raw `@tiptap/core` types come from `@tiptap/core` directly. The Carbon
// suggestion-config types are re-declared below (rather than imported from
// the upstream symbols directly) so TypeDoc resolution stays pointed at our
// JSDoc + `@category` placement; see [../AGENTS.md](../AGENTS.md) for the
// cross-package re-export rule.
import type { ComponentType } from "react";
import type { Extension } from "@tiptap/core";
import type { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";
import type {
  BaseSuggestionConfig as _BaseSuggestionConfig,
  TriggerSuggestionConfig as _TriggerSuggestionConfig,
  AutocompleteConfig as _AutocompleteConfig,
  SuggestionItem as _SuggestionItem,
  CustomListProps as _CustomListProps,
} from "@carbon/ai-chat-components/es/components/input/index.js";
import type { CustomMenuOption } from "./HeaderConfig";

/**
 * Fields shared by every Carbon suggestion config (mention, command,
 * autocomplete). Provides the item source, debounce, minimum query length,
 * selection callback, and an optional custom list renderer.
 *
 * @category Config
 */
export type BaseSuggestionConfig = _BaseSuggestionConfig;

/**
 * Trigger-character-driven suggestion config consumed by
 * {@link InputConfig.mention} and {@link InputConfig.command}. Adds the
 * trigger character, an optional `triggerPosition`, an optional schema-node
 * `name` override, and a custom-token renderer on top of
 * {@link BaseSuggestionConfig}.
 *
 * @category Config
 */
export type TriggerSuggestionConfig = _TriggerSuggestionConfig;

/**
 * Live autocomplete config consumed by {@link InputConfig.autocomplete}.
 * Selection inserts plain text rather than a schema node; no chip is
 * rendered.
 *
 * @category Config
 */
export type AutocompleteConfig = _AutocompleteConfig;

/**
 * Single list-item shape used by every Carbon suggestion surface
 * (mention, command, autocomplete, starters). Carries the id, label,
 * optional value override, optional description / avatar / icon, and a
 * disabled flag.
 *
 * @category Config
 */
export type SuggestionItem = _SuggestionItem;

/**
 * Props passed to a custom suggestion-list renderer (the `renderCustomList`
 * field on {@link BaseSuggestionConfig}). Includes the filtered
 * {@link SuggestionItem} array, the current `query`, and `onSelect` /
 * `onDismiss` callbacks.
 *
 * @category Config
 * @experimental
 */
export type CustomListProps = _CustomListProps;

/**
 * A menu option rendered inside the chat input's message-actions popover.
 * Extends {@link CustomMenuOption} with a required icon, which may be either
 * a `CarbonIcon` descriptor (from `@carbon/icons` or `@carbon/web-components`)
 * or a React icon component (from `@carbon/icons-react`). Normalized at
 * render time via the shared `iconTransform` utility.
 *
 * @category Config
 */
export interface InputMenuOption extends CustomMenuOption {
  /**
   * Icon to render alongside the option's text. Accepts a `CarbonIcon`
   * descriptor or a React component icon.
   */
  icon: CarbonIcon | ComponentType<unknown>;
}

/**
 * Configuration for the input field in the main chat and homescreen.
 *
 * @category Config
 */
export interface InputConfig {
  /**
   * The maximum number of characters allowed in the input field. Defaults to 10000.
   */
  maxInputCharacters?: number;

  /**
   * Controls whether the main input surface is visible when the chat loads.
   * Defaults to true.
   */
  isVisible?: boolean;

  /**
   * If true, the main input surface starts in a disabled (read-only) state.
   * Equivalent to {@link PublicConfig.isReadonly}, but scoped just to the assistant input.
   */
  isDisabled?: boolean;

  /**
   * If true, the send button renders disabled and Enter-driven send is
   * gated. Orthogonal to {@link InputConfig.isDisabled}: the editor stays
   * editable, only the send path is suppressed.
   *
   * Programmatic `instance.send(...)` is NOT gated by this flag.
   *
   * @experimental
   */
  isSendDisabled?: boolean;

  /**
   * `@`-style mention trigger config. The chat layer wires this into a
   * `carbonMention` Tiptap extension; the editor inserts a `mention` node on
   * selection and surfaces token chip rendering via the light-DOM portal
   * handshake.
   *
   * @experimental
   */
  mention?: TriggerSuggestionConfig;

  /**
   * `/`-style command trigger config. Same shape as {@link InputConfig.mention};
   * inserts a `command` node on selection.
   *
   * @experimental
   */
  command?: TriggerSuggestionConfig;

  /**
   * Live-typeahead autocomplete config. Selection inserts plain text; no
   * token chip is rendered.
   *
   * @experimental
   */
  autocomplete?: AutocompleteConfig;

  /**
   * Starter prompts shown while the editor is empty + focused + editable.
   * Selection inserts the item's `value` (or `label`) AND auto-sends in
   * the same turn (gated by {@link InputConfig.isSendDisabled}).
   *
   * @experimental
   */
  starters?: SuggestionItem[];

  /**
   * Tiptap-shaped configuration. The `tiptap` namespace signals "you're
   * stepping into Tiptap's API directly" — use {@link InputConfig.mention} /
   * `command` / `autocomplete` / `starters` for Carbon-curated chat features.
   *
   * @experimental
   */
  tiptap?: {
    /**
     * Host-supplied Tiptap extensions appended after the curated bundle.
     * Use to add custom marks, nodes, keymaps, paste rules, input rules,
     * or any other Tiptap extension. Reference equality on the array
     * short-circuits — memoize so the editor doesn't recreate on every
     * render.
     */
    extensions?: Extension[];
  };

  /**
   * Custom actions surfaced in the chat input's message-actions popover.
   * When provided, an Add ("+") button appears in the input that opens a
   * Carbon popover containing these options. If file uploads are also
   * enabled, an "Add files" entry is automatically prepended; the
   * standalone upload button is not rendered.
   */
  menuOptions?: InputMenuOption[];
}
