/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Stands in for `@web/test-runner-commands` in the browser project. Only
// `@open-wc/semantic-dom-diff`'s web-test-runner snapshot path imports it, and
// its real browser module connects to web-test-runner's dev server, which
// Vitest doesn't run. For keyboard and pointer input, use the helpers in
// ./input.js.

function unavailable(name: string): never {
  throw new Error(
    `${name} from @web/test-runner-commands isn't available under Vitest; use src/__tests__/browser/input.js for input`
  );
}

export const getSnapshot = () => unavailable('getSnapshot');
export const getSnapshotConfig = () => unavailable('getSnapshotConfig');
export const saveSnapshot = () => unavailable('saveSnapshot');
