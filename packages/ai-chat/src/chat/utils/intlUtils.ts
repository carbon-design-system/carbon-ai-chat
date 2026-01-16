/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createIntl } from "./i18n";
import { LanguagePack } from "../../types/config/PublicConfig";
import { ServiceManager } from "../services/ServiceManager";

/**
 * A simple utility function to set the i18n formatter on the given service manager.
 * This replaces the previous react-intl based implementation.
 */
function setIntl(
  serviceManager: ServiceManager,
  locale: string,
  messages: LanguagePack,
) {
  serviceManager.intl = createIntl({ locale, messages });
}

export { setIntl };
