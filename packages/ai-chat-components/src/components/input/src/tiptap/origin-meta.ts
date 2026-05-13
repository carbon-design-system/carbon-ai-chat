/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Transaction } from "@tiptap/pm/state";

/**
 * Tag a transaction as host-originated so the value-sync extension (and any
 * other origin-aware reader) can suppress its own change-event emission for
 * the round-trip. Replaces the legacy `external-update-flag.ts` WeakMap; the
 * meta key is shared with consumer code that dispatches transactions via
 * `getEditor()?.view.dispatch(tr)` and wants to opt out of the change loop.
 */
const HOST_ORIGIN_META_KEY = "aichatOrigin";
const HOST_ORIGIN_VALUE = "host";

export function setHostOriginMeta(tr: Transaction): Transaction {
  return tr.setMeta(HOST_ORIGIN_META_KEY, HOST_ORIGIN_VALUE);
}

export function isHostOrigin(tr: Transaction): boolean {
  return tr.getMeta(HOST_ORIGIN_META_KEY) === HOST_ORIGIN_VALUE;
}
