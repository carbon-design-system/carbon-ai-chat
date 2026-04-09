/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { serializeDoc, parseRawValue } from "./serializer.js";
import { isExternalUpdate, setExternalUpdate } from "./external-update-flag.js";

export interface ValueSyncState {
  rawValue: string;
}

export const valueSyncPluginKey = new PluginKey<ValueSyncState>("valueSync");

export interface ValueSyncController {
  /**
   * Apply an external rawValue change to the editor. Compares with the
   * current serialized doc — if different, replaces the entire doc content.
   * Uses a meta flag to prevent the plugin from re-emitting a change event.
   */
  setExternalRawValue(view: EditorView, newRawValue: string): void;
}

/**
 * Creates the value-sync plugin and its controller.
 *
 * The plugin serializes the doc to `rawValue` after every transaction and
 * emits `cds-aichat-input-change` on the editor's DOM when the value changes.
 *
 * The controller allows the InputShell to push external rawValue updates
 * (from `updateRawValue` API) into the editor without feedback loops.
 */
export function createValueSyncPlugin(): {
  plugin: Plugin<ValueSyncState>;
  controller: ValueSyncController;
} {
  const plugin = new Plugin<ValueSyncState>({
    key: valueSyncPluginKey,

    state: {
      init(_, state) {
        return { rawValue: serializeDoc(state.doc) };
      },

      apply(tr, prevPluginState, _oldState, newState) {
        if (!tr.docChanged) {
          return prevPluginState;
        }
        return { rawValue: serializeDoc(newState.doc) };
      },
    },

    view() {
      return {
        update(view, prevState) {
          const prev = valueSyncPluginKey.getState(prevState);
          const curr = valueSyncPluginKey.getState(view.state);
          if (!curr || !prev || curr.rawValue === prev.rawValue) {
            return;
          }

          // Don't re-emit when the change originated from an external update
          if (isExternalUpdate(view)) {
            setExternalUpdate(view, false);
            return;
          }

          view.dom.dispatchEvent(
            new CustomEvent("cds-aichat-input-change", {
              detail: { rawValue: curr.rawValue },
              bubbles: true,
              composed: true,
            }),
          );
        },
      };
    },
  });

  const controller: ValueSyncController = {
    setExternalRawValue(view: EditorView, newRawValue: string) {
      const currentState = valueSyncPluginKey.getState(view.state);
      if (currentState && currentState.rawValue === newRawValue) {
        return;
      }

      const { schema } = view.state;
      const newDoc = parseRawValue(schema, newRawValue);
      const tr = view.state.tr.replaceWith(
        0,
        view.state.doc.content.size,
        newDoc.content,
      );
      tr.setMeta(valueSyncPluginKey, { external: true });
      // Mark on the view so the update handler can detect external origin
      setExternalUpdate(view, true);
      view.dispatch(tr);
    },
  };

  return { plugin, controller };
}
