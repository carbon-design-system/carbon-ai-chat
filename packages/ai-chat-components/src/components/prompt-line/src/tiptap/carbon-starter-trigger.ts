/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * `carbonStarterTrigger` factory. Watches the editor's empty + focused +
 * editable state and emits `cds-aichat-trigger-change` with `type: "starter"`
 * via the shared `dispatchTriggerChange` helper.
 *
 * Items are stored on `extension.storage.items` so the prompt-line / shell
 * can swap the list at runtime without recreating the editor.
 */

import { Extension, type Editor } from '@tiptap/core';

import {
  dispatchTriggerChange,
  resetTriggerChangeState,
} from './trigger-utils.js';
import type { SuggestionItem } from './types.js';

export interface StarterTriggerStorage {
  items: SuggestionItem[];
  isOn: boolean;
}

/** Read the starter trigger's live storage, or `undefined` if not installed. */
export function readStarterStorage(
  editor: Editor | null | undefined
): StarterTriggerStorage | undefined {
  return (editor?.storage as unknown as Record<string, unknown> | undefined)
    ?.carbonStarterTrigger as StarterTriggerStorage | undefined;
}

/**
 * Apply a starter-config patch to the live editor. Starter differences never
 * justify recreating the editor — that would drop undo history — so they are
 * written in place. The empty transaction re-runs this extension's
 * `onTransaction` hook, so a toggle takes effect against the current selection
 * instead of waiting for the next keystroke. No-ops when nothing changed, so
 * callers do not have to guard.
 */
export function writeStarterStorage(
  editor: Editor | null | undefined,
  patch: Partial<StarterTriggerStorage>
): void {
  const storage = readStarterStorage(editor);
  if (!editor || !storage) {
    return;
  }
  const entries = Object.entries(patch) as [
    keyof StarterTriggerStorage,
    StarterTriggerStorage[keyof StarterTriggerStorage],
  ][];
  if (entries.every(([key, value]) => storage[key] === value)) {
    return;
  }
  Object.assign(storage, patch);
  editor.view.dispatch(editor.state.tr);
}

export function carbonStarterTrigger(
  initialItems: SuggestionItem[],
  initialIsOn = true
): Extension {
  return Extension.create<unknown, StarterTriggerStorage>({
    name: 'carbonStarterTrigger',

    addStorage() {
      return { items: initialItems, isOn: initialIsOn };
    },

    onCreate() {
      this.storage.items = initialItems;
      this.storage.isOn = initialIsOn;
    },

    onUpdate() {
      maybeEmit(this.editor);
    },

    onTransaction() {
      if (this.editor.isFocused) {
        maybeEmit(this.editor);
      }
    },

    onFocus({ editor }) {
      maybeEmit(editor);
    },

    onBlur({ editor }) {
      // Clear coalescing state on blur so the next focus can re-emit the
      // starter trigger even if the detail hasn't changed (e.g. after the
      // send button was clicked, which uses keepCoalesced: true on dismiss).
      resetTriggerChangeState(editor);
    },
  });
}

function maybeEmit(editor: Editor, forceClear = false): void {
  const storage = readStarterStorage(editor);
  const isActive =
    !forceClear &&
    storage?.isOn !== false &&
    (storage?.items.length ?? 0) > 0 &&
    editor.isEditable &&
    editor.isFocused &&
    editor.isEmpty;
  if (!isActive) {
    dispatchTriggerChange(editor, null);
    return;
  }
  dispatchTriggerChange(editor, {
    type: 'starter',
    query: '',
    triggerOffset: 0,
  });
}
