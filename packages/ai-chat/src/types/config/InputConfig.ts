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
import type { Extension } from "@tiptap/core";
import type {
  BaseSuggestionConfig as _BaseSuggestionConfig,
  TriggerSuggestionConfig as _TriggerSuggestionConfig,
  AutocompleteConfig as _AutocompleteConfig,
  SuggestionItem as _SuggestionItem,
  CustomListProps as _CustomListProps,
} from "@carbon/ai-chat-components/es/components/prompt-line/index.js";
import type { ToolbarAction } from "./HeaderConfig";

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
 * `name` override, a custom-token renderer, an `onRemove` callback (the
 * mirror of `onSelect`, fired when a token is deleted), and a
 * `showTriggerInChip` default (whether selected items render as
 * `/summarize` or a bare `summarize`, overridable per item) on top of
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
 * disabled flag. `showTriggerInChip` additionally controls, per item,
 * whether a mention/command selection renders with its trigger character —
 * chip-less surfaces (autocomplete, starters) ignore it.
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
   * Custom action buttons for the chat input, sharing the header's
   * {@link ToolbarAction} shape. How they render depends on the layout:
   * in the default (compact) layout an Add ("+") button opens a Carbon
   * popover containing these actions; in the expanded layout
   * ({@link InputConfig.expanded}) they render inline as icon buttons that
   * collapse into a "more" overflow menu when the row runs out of room
   * (set `fixed: true` to keep an action out of the overflow). If file
   * uploads are also enabled, an "Add files" action is automatically
   * prepended and the standalone upload button is not rendered. The button
   * size is controlled by the input, so a per-action `size` is ignored.
   *
   * @experimental
   */
  actions?: ToolbarAction[];

  /**
   * Renders the input in an expanded layout: the editor fills its own
   * full-width row, with the message actions and send control on a second
   * row beneath it (actions to the start, send to the end). When set, any
   * {@link InputConfig.actions} render inline as icon buttons in that actions
   * row — overflowing into a "more" menu when space is tight — instead of
   * inside the Add ("+") popover, and the
   * {@link WriteableElementName.PROMPT_LINE_ACTIONS_END} slot becomes
   * available. Defaults to false.
   *
   * @experimental
   */
  expanded?: boolean;

  /**
   * Error configuration for displaying an error message in the input field.
   * When provided, an error message will be displayed in the prompt line.
   *
   * @experimental
   */
  error?: {
    /**
     * The error title to display.
     */
    title: string;
    /**
     * The error description to display.
     */
    description?: string;
    /**
     * Whether the error message container should be collapsible.
     */
    collapsible?: boolean;
  };
}
