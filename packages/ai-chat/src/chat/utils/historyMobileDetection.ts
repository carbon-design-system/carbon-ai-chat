/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { getCSSVariableValue } from './colors';
import actions from '../store/actions';
import type { ServiceManager } from '../services/ServiceManager';

export interface HistoryMobileDetectionOptions {
  container: HTMLElement | null;
  useCustomHostElement: boolean;
  serviceManager: Pick<ServiceManager, 'store'>;
}

export function updateHistoryMobileDetection(
  {
    container,
    useCustomHostElement,
    serviceManager,
  }: HistoryMobileDetectionOptions,
  width: number
): void {
  if (!container) {
    return;
  }

  // Float mode (ChatContainer) always uses mobile mode
  const isFloatMode = !useCustomHostElement;

  // Helper to parse CSS length value with fallback
  const parseCSSLength = (variableName: string, fallback: number): number => {
    const value = getCSSVariableValue(variableName, container);
    if (!value) {
      return fallback;
    }
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const messagesMinWidth = parseCSSLength(
    '--cds-aichat-messages-min-width',
    320
  );
  const historyWidth = parseCSSLength('--cds-aichat-history-width', 320);
  const requiredWidthForHistory = messagesMinWidth + historyWidth;
  const shouldBeMobile = isFloatMode || width < requiredWidthForHistory;

  // Get current state directly from store to avoid dependency loop
  const currentState = serviceManager.store.getState();
  const currentIsMobile = currentState.historyPanelState.isMobile;

  if (currentIsMobile !== shouldBeMobile) {
    const config = currentState.config.public;
    let newIsOpen = currentState.historyPanelState.isOpen;

    // Only auto-adjust open state if NOT using startClosed
    if (!config.history?.startClosed) {
      // Default behavior: open in desktop, closed in mobile
      newIsOpen = !shouldBeMobile;
    }
    // If startClosed is true, preserve current state

    serviceManager.store.dispatch(
      actions.setHistoryPanelOptions(shouldBeMobile, newIsOpen)
    );
  }
}
