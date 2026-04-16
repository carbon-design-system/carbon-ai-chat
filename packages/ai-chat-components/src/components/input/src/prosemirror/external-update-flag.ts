/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { EditorView } from "prosemirror-view";

/**
 * Shared flag to mark an EditorView dispatch as originating from an external
 * update (e.g. `setExternalRawValue`). Used by the value-sync and
 * typing-indicator plugins to avoid re-emitting change/typing events
 * for externally driven document changes.
 *
 * Uses a WeakMap so entries are automatically cleaned up when the view is GC'd.
 */
const externalUpdateFlag = new WeakMap<EditorView, boolean>();

export function isExternalUpdate(view: EditorView): boolean {
  return externalUpdateFlag.get(view) ?? false;
}

export function setExternalUpdate(view: EditorView, value: boolean): void {
  externalUpdateFlag.set(view, value);
}
