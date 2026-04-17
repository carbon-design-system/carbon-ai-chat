/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ViewPlugin,
  Decoration,
  DecorationSet,
  EditorView,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import type { ViewUpdate } from "@codemirror/view";

// Line decorations for diff syntax
const insertedLineDeco = Decoration.line({ class: "cm-diff-line-inserted" });
const deletedLineDeco = Decoration.line({ class: "cm-diff-line-deleted" });

/**
 * Creates a CodeMirror decorator that applies line-level background colors
 * to diff syntax (inserted and deleted lines).
 *
 * This decorator identifies lines starting with '+' (insertions) or '-' (deletions)
 * and applies appropriate CSS classes for background coloring. It excludes diff
 * metadata lines like '+++', '---', and '@@'.
 *
 * @example
 * ```typescript
 * import { EditorView } from '@codemirror/view';
 * import { createDiffDecorator } from './diff-decorator';
 *
 * const view = new EditorView({
 *   extensions: [
 *     createDiffDecorator(),
 *     // ... other extensions
 *   ],
 * });
 * ```
 *
 * @returns CodeMirror ViewPlugin that decorates diff lines
 */
export function createDiffDecorator() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();

        for (const { from, to } of view.visibleRanges) {
          for (let pos = from; pos <= to; ) {
            const line = view.state.doc.lineAt(pos);
            const text = line.text;

            // Check if line is an insertion (starts with + but not +++)
            if (text.startsWith("+") && !text.startsWith("+++")) {
              builder.add(line.from, line.from, insertedLineDeco);
            }
            // Check if line is a deletion (starts with - but not ---)
            else if (text.startsWith("-") && !text.startsWith("---")) {
              builder.add(line.from, line.from, deletedLineDeco);
            }

            pos = line.to + 1;
          }
        }

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}
