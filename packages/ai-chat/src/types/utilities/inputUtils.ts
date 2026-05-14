/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Local re-declarations of the Carbon input utilities — the Tiptap extension
 * factories and the JSONContent / light-DOM helpers — whose canonical
 * declarations live in `@carbon/ai-chat-components`. Re-declaring them here
 * lets us own the consumer-facing JSDoc and `@category` placement without
 * writing TypeDoc-specific tags into upstream packages. See
 * [src/types/AGENTS.md](../AGENTS.md) for the cross-package re-export rule.
 *
 * Raw `@tiptap/core` types (`Editor`, `Extension`, `JSONContent`, `Node`, ...)
 * are intentionally NOT re-exported — import those from `@tiptap/core`
 * directly. The Carbon suggestion-config types live in
 * [config/InputConfig.ts](../config/InputConfig.ts) alongside `InputConfig`.
 */

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
  renderTokenChip as _renderTokenChip,
  renderInLightDom as _renderInLightDom,
} from "@carbon/ai-chat-components/es/components/input/index.js";
import type {
  RenderInLightDomArgs as _RenderInLightDomArgs,
  RenderInLightDomResult as _RenderInLightDomResult,
} from "@carbon/ai-chat-components/es/components/input/index.js";

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
 * a Tiptap `Extension` list. Filters out empty configs so the returned list
 * contains exactly the extensions whose backing config was supplied. Use
 * directly when mounting `<cds-aichat-prompt-line>` outside the chat shell.
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
 * Return a new Tiptap `JSONContent` tree with every node whose `type` matches
 * one of `types` removed. Marks on text nodes are preserved.
 *
 * @category Utilities
 */
export const removeNodesByType = _removeNodesByType;

/**
 * Map every node in a Tiptap `JSONContent` tree through `fn`. Returning
 * `null` removes the node from its parent's `content`; returning a node
 * replaces it. The walk is post-order — children are visited before their
 * parents.
 *
 * @category Utilities
 */
export const mapNodes = _mapNodes;

/**
 * Collect every node in a Tiptap `JSONContent` tree whose `type` matches
 * `type`. Returns a flat array in document order.
 *
 * @category Utilities
 */
export const findNodesByType = _findNodesByType;

/**
 * Project a Tiptap `JSONContent` doc to a plain-text string. Mirrors the
 * `rawValue` projection: text nodes contribute their text, mention/command
 * nodes contribute `attrs.value || attrs.label`, paragraph boundaries
 * become `"\n"`, and `hardBreak` nodes contribute `"\n"`.
 *
 * @category Utilities
 */
export const getRawText = _getRawText;

// ---------------------------------------------------------------------------
// Light-DOM portal helpers.
// ---------------------------------------------------------------------------

/**
 * Build the carbon token chip element used by the editor's NodeView and by
 * the rich user message bubble. Honors a consumer-supplied
 * `renderCustomToken` and delegates the light-DOM portal handshake to
 * {@link renderInLightDom} when the renderer returns custom content. Shared
 * so editor chips and bubble chips render identically.
 *
 * @category Utilities
 */
export const renderTokenChip = _renderTokenChip;

/**
 * Bridge an element (or React node) built inside the shadow-DOM editor into
 * the page's LIGHT DOM, where the host's stylesheet applies. Intended for
 * host-authored Tiptap `addNodeView` node views: build your DOM however you
 * like, pass it to `renderInLightDom`, and return the resulting `container`
 * as the node view `dom`. The chat's portal container projects the content
 * back into position via a `<slot>`. `renderTokenChip` is a token-specific
 * wrapper over this primitive.
 *
 * @category Utilities
 */
export const renderInLightDom = _renderInLightDom;

/** Args for {@link renderInLightDom}. @category Utilities */
export type RenderInLightDomArgs = _RenderInLightDomArgs;

/** Result of {@link renderInLightDom}. @category Utilities */
export type RenderInLightDomResult = _RenderInLightDomResult;
