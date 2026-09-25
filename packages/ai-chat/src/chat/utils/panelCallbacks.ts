/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

export function createPanelCallbacks(requestFocus: () => void) {
  return {
    onPanelOpenStart() {},
    onPanelOpenEnd: requestFocus,
    onPanelCloseStart() {},
    onPanelCloseEnd: requestFocus,
  };
}
