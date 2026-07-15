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
 * **Concurrent transitions:** if two factories transition in the same
 * transaction (rare — would require a host-driven setContent that crosses
 * two trigger contexts), each emits independently and listeners observe a
 * sequence of detail values. Consumers tracking "current trigger" stay
 * correct because the final `onStart`/`onUpdate` wins; `onExit` listeners
 * receive a `null` between the two activations only if the previous trigger's
 * range was actually exited.
 */

import type { Editor } from "@tiptap/core";

import type { TriggerChangeEventDetail } from "./types.js";

const lastDetailByEditor = new WeakMap<
  Editor,
  TriggerChangeEventDetail | null
>();

/**
 * Dispatch `cds-aichat-trigger-change` on the editor's DOM if the detail has
 * changed since the last call for the same editor. No-op transitions are
 * coalesced.
 */
export function dispatchTriggerChange(
  editor: Editor,
  detail: TriggerChangeEventDetail | null,
): void {
  const previous = lastDetailByEditor.get(editor) ?? null;
  if (areDetailsEqual(previous, detail)) {
    return;
  }
  lastDetailByEditor.set(editor, detail);
  editor.view.dom.dispatchEvent(
    new CustomEvent("cds-aichat-trigger-change", {
      detail,
      bubbles: true,
      composed: true,
    }),
  );
}

function areDetailsEqual(
  a: TriggerChangeEventDetail | null,
  b: TriggerChangeEventDetail | null,
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
