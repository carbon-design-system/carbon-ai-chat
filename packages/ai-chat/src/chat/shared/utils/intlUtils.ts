/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createIntl } from "react-intl";
import { LanguagePack } from "../../../types/instance/apiTypes";
import { ServiceManager } from "../services/ServiceManager";
import actions from "../store/actions";

/**
 * A simple utility function to set the intl object on the given service manager.
 */
function setIntl(
  serviceManager: ServiceManager,
  locale: string,
  messages: LanguagePack
) {
  serviceManager.intl = createIntl({ locale, messages });
  serviceManager.store.dispatch(
    actions.setAppStateValue("languagePack", messages)
  );
  serviceManager.store.dispatch(actions.setAppStateValue("locale", locale));
}

export { setIntl };
