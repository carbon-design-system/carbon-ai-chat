/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The state of the history panel.
 */
interface HistoryPanelState {
  /**
   * Determines if the history panel should be open.
   */
  isOpen: boolean;

  /** Indicates if the history panel should open in chat panel. */
  isMobile: boolean;
}

export type { HistoryPanelState };
