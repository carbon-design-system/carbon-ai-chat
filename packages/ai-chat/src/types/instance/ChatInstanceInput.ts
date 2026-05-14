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
   * @deprecated Use {@link ChatInstanceInput.updateContent} instead. The
   * equivalent updater on a plain-text-only document is:
   *
   * ```ts
   * instance.input.updateContent((prev) => ({
   *   type: "doc",
   *   content: [{
   *     type: "paragraph",
   *     content: [{ type: "text", text: updater(getRawText(prev)) }],
   *   }],
   * }));
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
   * Throws "Input is not currently rendered" when called before the
   * input is mounted.
   *
   * @example
   * ```ts
   * instance.input.updateContent(() => ({
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
   * escape hatch: `instance.input.getEditor()?.commands.insertContent(...)`.
   *
   * @experimental
   */
  updateContent: (updater: (previous: JSONContent) => JSONContent) => void;

  /**
   * Updates the pending structured data that will be merged into the next outgoing {@link MessageRequest}
   * when the user sends a message via the UI send button or Enter key. The updater function receives the
   * current pending structured data (or `undefined` if none is set) and should return the new value.
   * Return `undefined` to clear the pending structured data.
   *
   * This is the primary mechanism for pushing structured inputs (form fields, file references, etc.)
   * into the active input so they are included when the user hits Send.
   *
   * @example
   * ```ts
   * // Add a field to the pending structured data
   * instance.input.updateStructuredData((prev) => ({
   *   ...prev,
   *   fields: [
   *     ...(prev?.fields ?? []),
   *     { id: 'rating', type: 'number', value: 4 }
   *   ]
   * }));
   *
   * // Replace all pending structured data
   * instance.input.updateStructuredData(() => ({
   *   fields: [{ id: 'selection', type: 'multi_select', value: ['a', 'b'] }]
   * }));
   *
   * // Clear pending structured data
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
   * Returns the live Tiptap `Editor` instance, or `null` when the
   * input is not currently rendered. Probe semantics — safe to call
   * repeatedly; never throws.
   *
   * Sole escape hatch from the curated public surface. Use it for direct
   * Tiptap operations the facade doesn't cover:
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
   * **Working with `getEditor()` from React** — two patterns:
   *
   * 1. **Don't capture in state.** `useState(getEditor())` retains a
   *    stale reference after recreate; the editor is destroyed when
   *    `tiptap.extensions` (or any chat-domain config) changes. Call
   *    `getEditor()` inside handlers, or use a `useEffect` keyed on the
   *    configs that trigger recreate:
   *    ```ts
   *    useEffect(() => {
   *      const editor = chat.instance.input.getEditor();
   *      if (!editor) return;
   *      const handler = () => { ... };
   *      editor.on("update", handler);
   *      return () => editor.off("update", handler);
   *    }, [extensions, mention, command]);
   *    ```
   *
   * 2. **Memoize the configs.** `tiptap.extensions` (and the chat-domain
   *    configs) must be reference-stable across renders. The editor
   *    recreates on every reference change; an unmemoized array
   *    re-creates the editor on every host render, losing selection
   *    mid-edit.
   *
   * Hosts wanting a throw-on-unmount contract write the three-line guard
   * themselves: `const ed = instance.input.getEditor(); if (!ed) throw
   * new Error("input not mounted"); ed.commands.focus();`. No Carbon
   * helper.
   *
   * @experimental
   */
  getEditor: () => Editor | null;
}
