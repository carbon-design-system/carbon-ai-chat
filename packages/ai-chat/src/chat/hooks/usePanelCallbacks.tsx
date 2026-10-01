/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useCallback } from 'react';

interface UsePanelCallbacksProps {
  requestFocus: () => void;
}

interface UsePanelCallbacksReturn {
  onPanelOpenStart: () => void;
  onPanelOpenEnd: (event: CustomEvent) => void;
  onPanelCloseStart: (event: CustomEvent) => void;
  onPanelCloseEnd: () => void;
}

/**
 * Custom hook to manage panel lifecycle callbacks
 */
export function usePanelCallbacks({
  requestFocus,
}: UsePanelCallbacksProps): UsePanelCallbacksReturn {
  const onPanelOpenStart = useCallback(() => {
    // Don't request focus here - panel content not yet rendered
  }, []);

  const onPanelOpenEnd = useCallback(
    (event: CustomEvent) => {
      if (event.detail?.isReactivation) {
        return;
      }
      requestFocus();
    },
    [requestFocus]
  );

  const onPanelCloseStart = useCallback(() => {}, []);

  const onPanelCloseEnd = useCallback(() => {}, []);

  return {
    onPanelOpenStart,
    onPanelOpenEnd,
    onPanelCloseStart,
    onPanelCloseEnd,
  };
}
