/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Selection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { SuggestionItem, SuggestionConfig } from "../types.js";
import { triggerPluginKey } from "./trigger-plugin.js";

/**
 * Insert a token node at the current trigger position, replacing the trigger
 * character and query text. Dismisses the trigger after insertion.
 */
export function insertToken(
  view: EditorView,
  item: SuggestionItem,
  config: SuggestionConfig,
): boolean {
  const triggerState = triggerPluginKey.getState(view.state);
  if (!triggerState) {
    return false;
  }

  const { schema } = view.state;
  const tokenType = config.type ?? "mention";
  const triggerChar = config.trigger;
  const rawValue = item.value ?? `${triggerChar}${item.label}`;

  const tokenNode = schema.nodes.token.create({
    id: item.id,
    label: item.label,
    type: tokenType,
    value: rawValue,
    data: { ...item },
  });

  // Calculate replacement range: from trigger position to current cursor
  const from = triggerState.triggerOffset;
  const to = view.state.selection.from;

  // Replace trigger + query with the token node, then add a space after
  const spaceAfter = schema.text(" ");
  const tr = view.state.tr
    .replaceWith(from, to, [tokenNode, spaceAfter])
    .setMeta(triggerPluginKey, { dismiss: true });

  // Move cursor after the token + space
  const newCursorPos = from + tokenNode.nodeSize + spaceAfter.nodeSize;
  tr.setSelection(Selection.near(tr.doc.resolve(newCursorPos)));

  view.dispatch(tr);
  view.focus();
  return true;
}

/**
 * Replace the entire input text with a value (used for autocomplete type
 * where selecting an item replaces the typed text, not inserts a token).
 */
export function replaceWithText(view: EditorView, text: string): boolean {
  const { schema, doc } = view.state;

  const newDoc =
    text.length > 0
      ? schema.nodes.paragraph.create(null, schema.text(text))
      : schema.nodes.paragraph.create();

  const tr = view.state.tr
    .replaceWith(0, doc.content.size, newDoc)
    .setMeta(triggerPluginKey, { dismiss: true });

  // Place cursor at end
  tr.setSelection(Selection.near(tr.doc.resolve(tr.doc.content.size - 1)));

  view.dispatch(tr);
  view.focus();
  return true;
}
