/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { HomeScreenConfig } from "../../types/config/HomeScreenConfig";

/**
 * Returns a copy of the given config, but removes any starters that are empty.
 */
function withoutEmptyStarters(config: HomeScreenConfig): HomeScreenConfig {
  let newConfig = config;
  if (config?.starters?.buttons?.length) {
    newConfig = {
      ...config,
      starters: {
        ...config.starters,
        buttons: config.starters.buttons.filter((button) =>
          Boolean(button.label?.trim()),
        ),
      },
    };
    if (!newConfig?.starters?.buttons?.length) {
      // If we end up with no starters, then turn them off.
      newConfig.starters.isOn = false;
    }
  }

  return newConfig;
}

export { withoutEmptyStarters };
