/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { AppState } from '../../types/state/AppState';
import { CarbonTheme } from '../../types/config/CarbonTheme';

export function selectCarbonTheme(state: AppState) {
  return state.config.derived.themeWithDefaults.derivedCarbonTheme;
}

export function getCarbonTheme(carbonTheme: CarbonTheme) {
  return {
    carbonTheme,
    isDarkTheme:
      carbonTheme === CarbonTheme.G90 || carbonTheme === CarbonTheme.G100,
  };
}
