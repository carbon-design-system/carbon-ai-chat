/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Shared helper for the carbon factories' suggestion-render lifecycles to
 * dispatch `cds-aichat-trigger-change` events directly. There is no central
 * bridge extension (per PLAN.md decision 4) — each factory calls this helper
 * from its own `onStart`/`onUpdate`/`onExit` callbacks.
 *
 * **Concurrent transitions:** when two factories transition in the same
 * synchronous turn (e.g. autocomplete exits while mention starts), plugin
 * view updates run in extension-registration order. The later `onExit`
 * (dispatching `null`) must not overwrite the earlier `onStart` from a
 * different plugin. Pass `exitingType` when calling with `null` so the helper
 * can detect and suppress that stale exit.
 */

import type { Editor } from '@tiptap/core';

import type { TriggerChangeEventDetail } from './types.js';

const lastDetailByEditor = new WeakMap<
  Editor,
  TriggerChangeEventDetail | null
>();

/**
 * Dispatch `cds-aichat-trigger-change` on the editor's DOM if the detail has
 * changed since the last call for the same editor. No-op transitions are
 * coalesced.
 *
 * When `detail` is `null` (an `onExit` call), pass `exitingType` so the
 * helper can suppress the exit if another plugin already claimed the trigger
 * in the same synchronous turn — preventing a late `onExit` from overwriting
 * an earlier `onStart` from a different extension.
 */
export function dispatchTriggerChange(
  editor: Editor,
  detail: TriggerChangeEventDetail | null,
  exitingType?: string
): void {
  const previous = lastDetailByEditor.get(editor) ?? null;
  // Suppress a null dispatch when a different plugin already activated in this
  // turn — its onStart updated lastDetail to a non-null value with a different
  // type, so this onExit is stale.
  const isStaleExit =
    detail === null &&
    exitingType !== undefined &&
    previous !== null &&
    previous.type !== exitingType;
  if (isStaleExit) {
    return;
  }
  if (areDetailsEqual(previous, detail)) {
    return;
  }
  lastDetailByEditor.set(editor, detail);
  editor.view.dom.dispatchEvent(
    new CustomEvent('cds-aichat-trigger-change', {
      detail,
      bubbles: true,
      composed: true,
    })
  );
}

/**
 * Reset the coalescing state for an editor. Call this when the controller
 * dismisses a trigger externally (not via the extension) so that the next
 * `dispatchTriggerChange` call for the same detail re-dispatches instead of
 * being swallowed as a no-op.
 */
export function resetTriggerChangeState(editor: Editor): void {
  lastDetailByEditor.delete(editor);
}

function areDetailsEqual(
  a: TriggerChangeEventDetail | null,
  b: TriggerChangeEventDetail | null
): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    a.type === b.type &&
    a.query === b.query &&
    a.triggerOffset === b.triggerOffset
  );
}
