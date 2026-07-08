/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Tiptap value-sync extension. Emits `cds-aichat-prompt-change` on every
 * doc-changing transaction with the editor's current `getText()` (rawValue)
 * and `getJSON()` (Tiptap-native content shape).
 *
 * Origin-awareness lives in `extension.storage.lastTransactionIsHost`, set by
 * the plugin's `appendTransaction` hook before the view-update fires. Host
 * code dispatching transactions via `getEditor()?.view.dispatch(tr)` should
 * tag the transaction with `setHostOriginMeta(tr)` (see `./origin-meta.ts`)
 * if it wants downstream readers (typing-indicator) to recognize it.
 */

import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

import { isHostOrigin } from "./origin-meta.js";

export interface ValueSyncStorage {
  /** True iff the most recent doc-changing batch contained any host-origin tr. */
  lastTransactionIsHost: boolean;
}

export const ValueSync = Extension.create<unknown, ValueSyncStorage>({
  name: "carbonValueSync",

  addStorage() {
    return { lastTransactionIsHost: false };
  },

  addProseMirrorPlugins() {
    const { editor, storage } = this;
    return [
      new Plugin({
        appendTransaction(transactions) {
          storage.lastTransactionIsHost = transactions.some((tr) =>
            isHostOrigin(tr),
          );
          return null;
        },
        view: () => ({
          update(view, prevState) {
            if (view.state.doc === prevState.doc) {
              return;
            }
            view.dom.dispatchEvent(
              new CustomEvent("cds-aichat-prompt-change", {
                detail: {
                  rawValue: editor.getText(),
                  content: editor.getJSON(),
                },
                bubbles: true,
                composed: true,
              }),
            );
          },
        }),
      }),
    ];
  },
});
