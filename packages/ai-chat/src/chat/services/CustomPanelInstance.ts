/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { CustomPanelInstance } from "../../types/instance/apiTypes";
import actions from "../store/actions";
import { DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS } from "../store/reducerUtils";
import { CustomPanelConfigOptions } from "../../types/state/AppState";
import { ServiceManager } from "./ServiceManager";

/**
 * This function takes in the service manager to help create a custom panel instance. The panel instance is created
 * using a function instead of a class because a private property at runtime can still be accessible. The service
 * manager is passed in instead made a private property.
 */
function createCustomPanelInstance(
  serviceManager: ServiceManager,
): CustomPanelInstance {
  let hostElement;

  const customPanelInstance: CustomPanelInstance = {
    open(
      options: CustomPanelConfigOptions = DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
    ) {
      const { store } = serviceManager;
      store.dispatch(actions.setCustomPanelConfigOptions(options));
      store.dispatch(actions.setCustomPanelOpen(true));
    },
    close() {
      serviceManager.store.dispatch(actions.setCustomPanelOpen(false));
    },
  };

  if (hostElement) {
    customPanelInstance.hostElement = hostElement;
  }

  return Object.freeze(customPanelInstance);
}

export { createCustomPanelInstance, CustomPanelInstance };
