/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Local re-declarations of Tiptap-related symbols whose canonical declarations
 * live in `@carbon/ai-chat-components` or `@tiptap/core`. Re-declaring them
 * here lets us own the consumer-facing JSDoc and `@category` placement
 * without writing TypeDoc-specific tags into upstream packages. See
 * [src/types/AGENTS.md](../AGENTS.md) for the cross-package re-export rule.
 */

import type {
  Editor as _Editor,
  Extension as _Extension,
  JSONContent as _JSONContent,
} from "@tiptap/core";
import {
  carbonMention as _carbonMention,
  carbonCommand as _carbonCommand,
  carbonAutocomplete as _carbonAutocomplete,
  carbonStarterTrigger as _carbonStarterTrigger,
  buildCarbonExtensions as _buildCarbonExtensions,
  setHostOriginMeta as _setHostOriginMeta,
  removeNodesByType as _removeNodesByType,
  mapNodes as _mapNodes,
  findNodesByType as _findNodesByType,
  getRawText as _getRawText,
} from "@carbon/ai-chat-components/es/components/input/index.js";
import type {
  BaseSuggestionConfig as _BaseSuggestionConfig,
  TriggerSuggestionConfig as _TriggerSuggestionConfig,
  AutocompleteConfig as _AutocompleteConfig,
  SuggestionItem as _SuggestionItem,
  CustomListProps as _CustomListProps,
  TriggerChangeEventDetail as _TriggerChangeEventDetail,
  InputChangeEventDetail as _InputChangeEventDetail,
} from "@carbon/ai-chat-components/es/components/input/index.js";

// ---------------------------------------------------------------------------
// Tiptap escape-hatch types — re-exported from `@tiptap/core` so consumers
// type-annotating `getEditor()` or extension authoring don't need their own
// `@tiptap/core` dep just to type-import. We do NOT re-document shape; for
// the full API see Tiptap's own docs.
// ---------------------------------------------------------------------------

/**
 * The Tiptap editor instance returned by {@link ChatInstanceInput.getEditor}.
 * Re-exported from `@tiptap/core` for ergonomic typing — see the
 * [Tiptap Editor docs](https://tiptap.dev/api/editor) for the full API.
 *
 * @category Utilities
 */
export type Editor = _Editor;

/**
 * Tiptap extension type, used in {@link InputConfig} `tiptap.extensions` and
 * returned by {@link buildCarbonExtensions}. Re-exported from `@tiptap/core`
 * — see the [Tiptap extensions guide](https://tiptap.dev/docs/editor/extensions)
 * for authoring details.
 *
 * @category Utilities
 */
export type Extension = _Extension;

/**
 * The Tiptap document JSON shape used by {@link ChatInstanceInput.setContent},
 * {@link ChatInstanceInput.insertContent}, and the JSONContent walker
 * helpers below. Re-exported from `@tiptap/core` — see the
 * [Tiptap content guide](https://tiptap.dev/docs/editor/api/schema) for the
 * canonical schema.
 *
 * @category Utilities
 */
export type JSONContent = _JSONContent;

// ---------------------------------------------------------------------------
// Carbon Tiptap suggestion config types.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Event-detail types.
// ---------------------------------------------------------------------------

/**
 * Detail payload for the `cds-aichat-input-change` event, emitted when the
 * editor content changes. Carries a plain-text projection (`rawValue`) and
 * the editor doc as {@link JSONContent}.
 *
 * @category Events
 */
export type InputChangeEventDetail = _InputChangeEventDetail;

/**
 * Detail payload for the `cds-aichat-trigger-change` event, emitted from each
 * Carbon Tiptap factory's suggestion-render lifecycle. Reports the trigger
 * `type` (`"mention"` / `"command"` / `"autocomplete"` / `"starter"`), the
 * current `query`, and the editor offset where the trigger fired.
 *
 * @category Events
 */
export type TriggerChangeEventDetail = _TriggerChangeEventDetail;

// ---------------------------------------------------------------------------
// Carbon Tiptap extension factories.
// ---------------------------------------------------------------------------

/**
 * Tiptap extension factory for `@`-style mention triggers. Wraps
 * `@tiptap/extension-mention` with Carbon-specific chip rendering, extended
 * schema attributes (`value`, `data`), and direct
 * `cds-aichat-trigger-change` dispatch. Pass distinct `name` values when
 * composing multiple instances.
 *
 * @category Utilities
 */
export const carbonMention = _carbonMention;

/**
 * Tiptap extension factory for `/`-style command triggers. Same shape as
 * {@link carbonMention}; the two differ only in the default schema-node name
 * (`"command"` vs `"mention"`), the dispatched trigger type, and the default
 * chip color.
 *
 * @category Utilities
 */
export const carbonCommand = _carbonCommand;

/**
 * Tiptap extension factory for live autocomplete. Wraps `@tiptap/suggestion`
 * directly (no Mention node) — the `command` callback inserts plain text
 * rather than a schema node. Activates whenever the input has any non-empty
 * trailing word.
 *
 * @category Utilities
 */
export const carbonAutocomplete = _carbonAutocomplete;

/**
 * Tiptap extension factory for starter prompts shown while the editor is
 * empty + focused + editable. Selection inserts the item's `value` (or
 * `label`) and auto-sends in the same turn. Items are stored on
 * `extension.storage.items` so the host can swap the list without
 * recreating the editor.
 *
 * @category Utilities
 */
export const carbonStarterTrigger = _carbonStarterTrigger;

/**
 * Translate the Carbon-curated configs surfaced on {@link InputConfig} into
 * a Tiptap {@link Extension} list. Filters out empty configs so the returned
 * list contains exactly the extensions whose backing config was supplied.
 * Use directly when mounting `<cds-aichat-prompt-line>` outside the chat
 * shell.
 *
 * @category Utilities
 */
export const buildCarbonExtensions = _buildCarbonExtensions;

// ---------------------------------------------------------------------------
// Tiptap transaction / JSONContent helpers.
// ---------------------------------------------------------------------------

/**
 * Tag a Tiptap transaction as host-originated so the value-sync extension
 * (and any other origin-aware reader) can suppress its own change-event
 * emission for the round-trip. Use when dispatching transactions via
 * `getEditor()?.view.dispatch(tr)` to opt out of the change loop.
 *
 * @category Utilities
 */
export const setHostOriginMeta = _setHostOriginMeta;

/**
 * Return a new {@link JSONContent} tree with every node whose `type` matches
 * one of `types` removed. Marks on text nodes are preserved.
 *
 * @category Utilities
 */
export const removeNodesByType = _removeNodesByType;

/**
 * Map every node in a {@link JSONContent} tree through `fn`. Returning
 * `null` removes the node from its parent's `content`; returning a node
 * replaces it. The walk is post-order — children are visited before their
 * parents.
 *
 * @category Utilities
 */
export const mapNodes = _mapNodes;

/**
 * Collect every node in a {@link JSONContent} tree whose `type` matches
 * `type`. Returns a flat array in document order.
 *
 * @category Utilities
 */
export const findNodesByType = _findNodesByType;

/**
 * Project a {@link JSONContent} doc to a plain-text string. Mirrors the
 * `rawValue` projection: text nodes contribute their text, mention/command
 * nodes contribute `attrs.value || attrs.label`, paragraph boundaries
 * become `"\n"`, and `hardBreak` nodes contribute `"\n"`.
 *
 * @category Utilities
 */
export const getRawText = _getRawText;
