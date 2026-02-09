/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useSelector } from "./useSelector";
import { AppState } from "../../types/state/AppState";
import { CarbonTheme } from "../../types/config/PublicConfig";

/**
 * Custom hook to get the current Carbon theme and determine if it's a dark theme.
 *
 * @returns An object containing:
 *   - carbonTheme: The current Carbon theme (G10, G90, G100, or White)
 *   - isDarkTheme: Boolean indicating if the current theme is dark (G90 or G100)
 */
export function useCarbonTheme() {
  const carbonTheme = useSelector(
    (state: AppState) =>
      state.config.derived.themeWithDefaults.derivedCarbonTheme,
  );

  const isDarkTheme =
    carbonTheme === CarbonTheme.G90 || carbonTheme === CarbonTheme.G100;

  return { carbonTheme, isDarkTheme };
}
