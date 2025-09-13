/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LanguagePack } from "../../../types/config/PublicConfig";

/**
 * Returns the aria-label string from the provided language pack for the launcher button based on the open and view
 * state.
 */
function getLauncherButtonAriaLabel(
  languagePack: LanguagePack,
  isLauncherHidden: boolean,
) {
  return isLauncherHidden
    ? languagePack.launcher_isOpen
    : languagePack.launcher_isClosed;
}

export { getLauncherButtonAriaLabel };
