/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Plugin } from "prosemirror-state";
import type { Schema } from "prosemirror-model";

/**
 * Creates a plugin that enforces plain-text-only paste.
 * Intercepts paste and drop events, extracts plain text, and inserts
 * it as paragraph nodes split on newlines.
 */
export function createPastePlugin(): Plugin {
  return new Plugin({
    props: {
      handlePaste(view, event, _slice) {
        const text = event.clipboardData?.getData("text/plain");
        if (text == null) {
          return false;
        }

        const { schema } = view.state;
        const lines = text.replace(/\r\n?/g, "\n").split("\n");
        const nodes = linesToNodes(schema, lines);

        const { from, to } = view.state.selection;
        const tr = view.state.tr.replaceWith(from, to, nodes);
        view.dispatch(tr.scrollIntoView());
        return true;
      },

      handleDrop(view, event, _slice, moved) {
        // Allow internal drag-and-drop (moved content within the editor)
        if (moved) {
          return false;
        }

        // Block external drops to prevent rich content
        const text = event.dataTransfer?.getData("text/plain");
        if (!text) {
          return true; // block the drop
        }

        const { schema } = view.state;
        const lines = text.replace(/\r\n?/g, "\n").split("\n");
        const nodes = linesToNodes(schema, lines);

        const pos = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        if (!pos) {
          return true;
        }

        const tr = view.state.tr.replaceWith(pos.pos, pos.pos, nodes);
        view.dispatch(tr.scrollIntoView());
        event.preventDefault();
        return true;
      },
    },
  });
}

function linesToNodes(schema: Schema, lines: string[]) {
  return lines.map((line) => {
    if (line.length === 0) {
      return schema.nodes.paragraph.create();
    }
    return schema.nodes.paragraph.create(null, schema.text(line));
  });
}
