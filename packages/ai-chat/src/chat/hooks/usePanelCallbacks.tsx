/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useCallback } from "react";

interface UsePanelCallbacksProps {
  requestFocus: () => void;
}

interface UsePanelCallbacksReturn {
  onPanelOpenStart: () => void;
  onPanelOpenEnd: () => void;
  onPanelCloseStart: () => void;
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

  const onPanelOpenEnd = useCallback(() => {
    // Request focus after panel is fully open and content is rendered
    requestFocus();
  }, [requestFocus]);

  const onPanelCloseStart = useCallback(() => {
    // Don't request focus here - panel is closing
  }, []);

  const onPanelCloseEnd = useCallback(() => {
    // Explicitly request focus to ensure it returns to input field
    // useFocusManager will determine the correct focus target based on panel state
    requestFocus();
  }, [requestFocus]);

  return {
    onPanelOpenStart,
    onPanelOpenEnd,
    onPanelCloseStart,
    onPanelCloseEnd,
  };
}

// Made with Bob
