/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import throttle from "lodash-es/throttle.js";
import { EditorView } from "@codemirror/view";

interface ContentSyncHooks {
  getEditorView(): EditorView | undefined;
  onAfterApply?(): void;
  throttleMs?: number;
}

export interface ContentSyncHandle {
  update(content: string): void;
  cancel(): void;
}

export function createContentSync({
  getEditorView,
  onAfterApply,
  throttleMs = 200,
}: ContentSyncHooks): ContentSyncHandle {
  const throttled = throttle(
    (content: string) => {
      const view = getEditorView();
      if (!view) {
        return;
      }

      const current = view.state.doc.toString();

      if (content === current) {
        return;
      }

      if (content.startsWith(current)) {
        const appended = content.slice(current.length);
        if (!appended.length) {
          return;
        }
        view.dispatch({
          changes: {
            from: current.length,
            to: current.length,
            insert: appended,
          },
        });
      } else if (current.startsWith(content)) {
        view.dispatch({
          changes: {
            from: content.length,
            to: current.length,
            insert: "",
          },
        });
      } else {
        view.dispatch({
          changes: {
            from: 0,
            to: current.length,
            insert: content,
          },
        });
      }

      if (onAfterApply) {
        requestAnimationFrame(() => {
          onAfterApply();
        });
      }
    },
    throttleMs,
    { leading: true, trailing: true },
  );

  return {
    update: (content: string) => throttled(content),
    cancel: () => throttled.cancel(),
  };
}
