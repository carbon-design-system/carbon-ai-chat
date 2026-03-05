/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  HistoryPanelInstance,
  HistoryCustomPanelConfigOptions,
} from "../../types/instance/apiTypes";
import actions from "../store/actions";
import { ServiceManager } from "./ServiceManager";

/**
 * This function takes in the service manager to help create a history panel instance. The panel instance is created
 * using a function instead of a class because a private property at runtime can still be accessible. The service
 * manager is passed in instead made a private property.
 */
function createHistoryPanelInstance(
  serviceManager: ServiceManager,
): HistoryPanelInstance {
  const historyPanelInstance: HistoryPanelInstance = {
    async open(options?: HistoryCustomPanelConfigOptions) {
      const { store } = serviceManager;

      // If options are provided, update the panel options first
      if (options) {
        // Extract all valid options for the state
        const stateOptions: Partial<HistoryCustomPanelConfigOptions> = {};

        // Dynamically copy all defined properties from options
        for (const key in options) {
          if (
            Object.prototype.hasOwnProperty.call(options, key) &&
            options[key as keyof HistoryCustomPanelConfigOptions] !== undefined
          ) {
            stateOptions[key as keyof HistoryCustomPanelConfigOptions] =
              options[key as keyof HistoryCustomPanelConfigOptions];
          }
        }

        if (Object.keys(stateOptions).length > 0) {
          store.dispatch(actions.setHistoryPanelOptions(stateOptions));
        }
      }

      // Open the panel
      store.dispatch(actions.setHistoryPanelOpen(true));
    },

    async close() {
      const { store } = serviceManager;
      store.dispatch(actions.setHistoryPanelOpen(false));
    },

    setOptions(options: Partial<HistoryCustomPanelConfigOptions>) {
      const { store } = serviceManager;

      // Extract all valid options for the state
      const stateOptions: Partial<HistoryCustomPanelConfigOptions> = {};

      // Dynamically copy all defined properties from options
      for (const key in options) {
        if (
          Object.prototype.hasOwnProperty.call(options, key) &&
          options[key as keyof HistoryCustomPanelConfigOptions] !== undefined
        ) {
          stateOptions[key as keyof HistoryCustomPanelConfigOptions] =
            options[key as keyof HistoryCustomPanelConfigOptions];
        }
      }

      if (Object.keys(stateOptions).length > 0) {
        store.dispatch(actions.setHistoryPanelOptions(stateOptions));
      }
    },
  };

  return Object.freeze(historyPanelInstance);
}

export { createHistoryPanelInstance, HistoryPanelInstance };
