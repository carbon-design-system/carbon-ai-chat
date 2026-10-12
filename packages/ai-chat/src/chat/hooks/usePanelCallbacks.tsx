/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useMemo } from 'react';
import { createPanelCallbacks } from '../utils/panelCallbacks';

export function usePanelCallbacks({
  requestFocus,
}: {
  requestFocus: () => void;
}) {
  return useMemo(() => createPanelCallbacks(requestFocus), [requestFocus]);
}
