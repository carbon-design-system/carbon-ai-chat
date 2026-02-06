/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useMemo } from "react";
import { isBrowser } from "../utils/browserUtils";
import type { PublicConfig } from "../../types/config/PublicConfig";
import type { PersistedState } from "../../types/state/AppState";

interface UseDerivedStateProps {
  publicConfig: PublicConfig;
  persistedToBrowserStorage: PersistedState;
  isHydratingCounter: number;
  catastrophicErrorType: string | null | boolean;
  viewStateMainWindow: boolean;
}

interface DerivedState {
  hostname: string;
  showDisclaimer: boolean;
  showHomeScreen: boolean;
  useHomeScreenVersion: boolean;
  shouldShowHydrationPanel: boolean;
  isHydratingComplete: boolean;
}

/**
 * Custom hook to compute derived state values with memoization
 */
export function useDerivedState({
  publicConfig,
  persistedToBrowserStorage,
  isHydratingCounter,
  catastrophicErrorType,
  viewStateMainWindow,
}: UseDerivedStateProps): DerivedState {
  return useMemo(() => {
    const hostname = isBrowser() ? window.location.hostname : "localhost";
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
  }, [
    publicConfig.disclaimer?.isOn,
    publicConfig.homescreen?.isOn,
    persistedToBrowserStorage.disclaimersAccepted,
    persistedToBrowserStorage.homeScreenState.isHomeScreenOpen,
    persistedToBrowserStorage.hasSentNonWelcomeMessage,
    isHydratingCounter,
    catastrophicErrorType,
    viewStateMainWindow,
  ]);
}

// Made with Bob
