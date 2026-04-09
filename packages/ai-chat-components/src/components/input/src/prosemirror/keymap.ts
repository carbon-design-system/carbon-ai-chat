/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { keymap } from "prosemirror-keymap";
import { baseKeymap, splitBlock } from "prosemirror-commands";
import { undo, redo } from "prosemirror-history";
import type { Plugin } from "prosemirror-state";
import { triggerPluginKey } from "./trigger-plugin.js";
import { serializeDoc } from "./serializer.js";

/**
 * Ref holding a function that forwards keyboard events to the autocomplete
 * element when the trigger is active. Set by InputShell at runtime.
 */
export interface AutocompleteKeyForwarderRef {
  current: ((event: KeyboardEvent) => void) | null;
}

/**
 * Creates the keymap plugins for the chat input.
 *
 * - Enter: send message (if no trigger active and input has content)
 * - Shift-Enter: insert newline (split block)
 * - Escape: dismiss trigger or blur editor
 * - ArrowUp/Down: forward to autocomplete when trigger is active
 * - Mod-z / Mod-Shift-z / Mod-y: undo/redo
 * - Base keymap: standard text editing (backspace, delete, etc.)
 */
export function createInputKeymap(
  forwarderRef: AutocompleteKeyForwarderRef,
): Plugin[] {
  const chatKeymap = keymap({
    Enter(state, _dispatch, view) {
      // If trigger is active, forward to autocomplete
      const triggerState = triggerPluginKey.getState(state);
      if (triggerState && forwarderRef.current && view) {
        forwarderRef.current(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        );
        return true;
      }

      // Send if there's content
      const rawValue = serializeDoc(state.doc).trim();
      if (rawValue.length > 0 && view) {
        view.dom.dispatchEvent(
          new CustomEvent("cds-aichat-input-send", {
            detail: { text: rawValue },
            bubbles: true,
            composed: true,
          }),
        );
      }
      // Always consume Enter to prevent newline insertion
      return true;
    },

    "Shift-Enter": splitBlock,

    Escape(state, dispatch, view) {
      const triggerState = triggerPluginKey.getState(state);
      if (triggerState) {
        if (forwarderRef.current) {
          forwarderRef.current(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
          );
        } else if (dispatch) {
          dispatch(state.tr.setMeta(triggerPluginKey, { dismiss: true }));
        }
        return true;
      }

      // Blur the editor
      if (view) {
        (view.dom as HTMLElement).blur();
      }
      return true;
    },

    ArrowUp(state) {
      const triggerState = triggerPluginKey.getState(state);
      if (triggerState && forwarderRef.current) {
        forwarderRef.current(
          new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
        );
        return true;
      }
      return false;
    },

    ArrowDown(state) {
      const triggerState = triggerPluginKey.getState(state);
      if (triggerState && forwarderRef.current) {
        forwarderRef.current(
          new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
        );
        return true;
      }
      return false;
    },
  });

  const historyKeymap = keymap({
    "Mod-z": undo,
    "Mod-Shift-z": redo,
    "Mod-y": redo,
  });

  return [chatKeymap, historyKeymap, keymap(baseKeymap)];
}
