/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { StructuredData } from "../messaging/Messages";
import type { Editor, JSONContent } from "@tiptap/core";

/**
 * Methods for controlling the input field.
 *
 * @category Instance
 */
export interface ChatInstanceInput {
  /**
   * @deprecated Use {@link ChatInstanceInput.updateContent} instead, which now
   * covers every case this method does — including writes before the input is
   * mounted. The equivalent plain-text updater, using {@link getRawText} and
   * {@link textToDoc}, is:
   *
   * ```ts
   * instance.input.updateContent((prev) =>
   *   textToDoc(updater(getRawText(prev))),
   * );
   * ```
   *
   * Throws if the editor doc contains any node type other than
   * `paragraph`, `text`, or `hardBreak`, or if any text node carries
   * marks. Empty paragraphs pass through; `hardBreak` renders as `\n` in
   * the rawValue projection. Emits one deprecation warning per session.
   */
  updateRawValue: (updater: (previous: string) => string) => void;

  /**
   * Replace the entire input content with the result of an updater that
   * receives the current Tiptap JSONContent doc and returns the next.
   *
   * The updater is synchronous, but the returned promise reflects when the
   * content has actually been applied. If the input is showing the lightweight
   * textarea and the updater returns a doc with non-text nodes or marked text,
   * the rich editor is loaded on demand (upgrading the surface in place,
   * preserving the caret and focus) and the promise resolves once the rich
   * content is applied. Plain-text writes — and writes when the rich editor is
   * already mounted — apply immediately and the promise resolves on the same
   * tick.
   *
   * While the input is hidden or not yet mounted, a plain-text result is staged
   * as the pending value and seeds the field when it renders; a result with
   * non-text content throws, because there is no surface to upgrade.
   *
   * @example Replace the input with a paragraph containing a mention
   * ```ts
   * await instance.input.updateContent(() => ({
   *   type: "doc",
   *   content: [{
   *     type: "paragraph",
   *     content: [
   *       { type: "text", text: "Hi " },
   *       { type: "mention", attrs: { id: "1", label: "Alice", value: "@alice" } },
   *     ],
   *   }],
   * }));
   * ```
   *
   * For cursor-position insertion, use the {@link ChatInstanceInput.getEditor}
   * escape hatch:
   * `(await instance.input.getEditor()).commands.insertContent(...)`.
   *
   * @experimental
   */
  updateContent: (
    updater: (previous: JSONContent) => JSONContent,
  ) => Promise<void>;

  /**
   * Updates the pending structured data that will be merged into the next outgoing {@link MessageRequest}
   * when the user sends a message via the UI send button or Enter key. The updater function receives the
   * current pending structured data (or `undefined` if none is set) and should return the new value.
   * Return `undefined` to clear the pending structured data.
   *
   * This is the primary mechanism for pushing structured inputs (form fields, file references, etc.)
   * into the active input so they are included when the user hits Send.
   *
   * @example Add a field to the pending structured data
   * ```ts
   * instance.input.updateStructuredData((prev) => ({
   *   ...prev,
   *   fields: [
   *     ...(prev?.fields ?? []),
   *     { id: "rating", type: "number", value: 4 },
   *   ],
   * }));
   * ```
   *
   * @example Replace all pending structured data
   * ```ts
   * instance.input.updateStructuredData(() => ({
   *   fields: [{ id: "selection", type: "multi_select", value: ["a", "b"] }],
   * }));
   * ```
   *
   * @example Clear the pending structured data
   * ```ts
   * instance.input.updateStructuredData(() => undefined);
   * ```
   *
   * @experimental
   */
  updateStructuredData: (
    updater: (
      previous: StructuredData | undefined,
    ) => StructuredData | undefined,
  ) => void;

  /**
   * Loads the rich Tiptap editor on demand and resolves with the live
   * `Editor`. Chats that don't configure an advanced input feature
   * ({@link InputConfig.mention} / {@link InputConfig.command} /
   * {@link InputConfig.autocomplete} / {@link InputConfig.starters} /
   * {@link InputConfig.tiptap}) render a lightweight textarea and ship no
   * Tiptap; the first call to this method dynamically imports the editor and
   * upgrades that textarea in place — already-typed text, the caret, and focus
   * carry over. The upgrade is one-way for the life of the session: once the
   * rich editor loads it stays loaded.
   *
   * Rejects with `"Input is not currently rendered"` when there is no input
   * surface to upgrade (for example the input is hidden via
   * {@link InputConfig.isVisible} or the chat is closed). Concurrent calls
   * share a single upgrade and resolve with the same instance.
   *
   * Sole escape hatch from the curated public surface. Use the resolved editor
   * for direct Tiptap operations the facade doesn't cover:
   * - `editor.commands.*` for imperative actions (focus, blur,
   *   clearContent, setTextSelection, selectAll, undo, redo, insertContent
   *   for cursor-position insertion, plus everything else Tiptap exposes —
   *   toggleBold, insertContentAt, etc.)
   * - `editor.chain()` for command chaining
   * - `editor.view` for the live PM `EditorView`
   * - `editor.view.dispatch(setHostOriginMeta(tr))` for raw transaction
   *   dispatch — the host owns the `aichatOrigin` meta tagging
   * - `editor.state.doc` for the live PMNode
   * - `editor.getJSON()` for a JSONContent snapshot (equivalent to
   *   `getState().input.content` but live, not the immutable store copy)
   * - `editor.extensionStorage` for per-extension state
   * - `editor.on(...)` for low-level event subscriptions
   *
   * @example Load the editor on demand and focus it
   * ```ts
   * const editor = await instance.input.getEditor();
   * editor.commands.focus();
   * ```
   *
   * **Working with the resolved editor from React** — two patterns:
   *
   * 1. **Don't capture in state.** Holding the resolved editor in `useState`
   *    retains a stale reference after recreate; the editor is destroyed when
   *    `tiptap.extensions` (or any chat-domain config) changes. Re-await
   *    `getEditor()` inside handlers, or in a `useEffect` keyed on the
   *    configs that trigger recreate:
   *    ```ts
   *    useEffect(() => {
   *      let off: (() => void) | undefined;
   *      chat.instance.input.getEditor().then((editor) => {
   *        const handler = () => { ... };
   *        editor.on("update", handler);
   *        off = () => editor.off("update", handler);
   *      });
   *      return () => off?.();
   *    }, [extensions, mention, command]);
   *    ```
   *
   * 2. **Memoize the configs.** `tiptap.extensions` (and the chat-domain
   *    configs) must be reference-stable across renders. The editor
   *    recreates on every reference change; an unmemoized array
   *    re-creates the editor on every host render, losing selection
   *    mid-edit.
   *
   * @experimental
   */
  getEditor: () => Promise<Editor>;
}
