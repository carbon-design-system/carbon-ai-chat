/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { PublicConfig } from '../../types/config/PublicConfig';
import type { PersistedState } from '../../types/state/AppState';

export interface DerivedStateOptions {
  publicConfig: PublicConfig;
  persistedToBrowserStorage: PersistedState;
  isHydratingCounter: number;
  catastrophicErrorType: string | null | boolean;
  viewStateMainWindow: boolean;
}

export interface DerivedState {
  hostname: string;
  showDisclaimer: boolean;
  showHomeScreen: boolean;
  useHomeScreenVersion: boolean;
  shouldShowHydrationPanel: boolean;
  isHydratingComplete: boolean;
}

export function getDerivedState(
  {
    publicConfig,
    persistedToBrowserStorage,
    isHydratingCounter,
    catastrophicErrorType,
    viewStateMainWindow,
  }: DerivedStateOptions,
  hostname: string
): DerivedState {
  const showDisclaimer =
    publicConfig.disclaimer?.isOn &&
    !persistedToBrowserStorage.disclaimersAccepted[hostname];
  const showHomeScreen =
    publicConfig.homescreen?.isOn &&
    persistedToBrowserStorage.homeScreenState.isHomeScreenOpen &&
    !showDisclaimer;
  const useHomeScreenVersion =
    Boolean(publicConfig.homescreen?.isOn) &&
    !persistedToBrowserStorage.hasSentNonWelcomeMessage;
  const shouldShowHydrationPanel =
    Boolean(isHydratingCounter) &&
    !catastrophicErrorType &&
    viewStateMainWindow;
  const isHydratingComplete = isHydratingCounter === 0;

  return {
    hostname,
    showDisclaimer,
    showHomeScreen,
    useHomeScreenVersion,
    shouldShowHydrationPanel,
    isHydratingComplete,
  };
}
