/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Local re-declarations of these tiptap-related types live in
// `../utilities/tiptapReexports`; importing through the local module keeps
// TypeDoc resolution pointed at our JSDoc + `@category` placement instead of
// the upstream declarations.
import type {
  TriggerSuggestionConfig,
  SuggestionItem,
  AutocompleteConfig,
  Extension,
} from "../utilities/tiptapReexports";

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
   * selection and surfaces token chip rendering via the
   * `cds-aichat-token-render` event.
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
}
