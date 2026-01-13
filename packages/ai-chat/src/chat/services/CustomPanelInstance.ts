/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  CustomPanelConfigOptions,
  WorkspaceCustomPanelConfigOptions,
  CustomPanelInstance,
  CustomPanelOpenOptions,
  PanelType,
} from "../../types/instance/apiTypes";
import actions from "../store/actions";
import { DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS } from "../store/reducerUtils";
import { ServiceManager } from "./ServiceManager";

/**
 * This function takes in the service manager to help create a custom panel instance. The panel instance is created
 * using a function instead of a class because a private property at runtime can still be accessible. The service
 * manager is passed in instead made a private property.
 */
function createCustomPanelInstance(
  panelType: PanelType,
  serviceManager: ServiceManager,
  defaultPanelOptions: CustomPanelOpenOptions = DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
): CustomPanelInstance {
  let hostElement;

  const panelActions = {
    [PanelType.WORKSPACE]: {
      setConfig: actions.setWorkspaceCustomPanelConfigOptions,
      setOpen: actions.setWorkspaceCustomPanelOpen,
    },
    [PanelType.DEFAULT]: {
      setConfig: actions.setCustomPanelConfigOptions,
      setOpen: actions.setCustomPanelOpen,
    },
  } as const;

  const { setConfig, setOpen } =
    panelActions[panelType] ?? panelActions[PanelType.DEFAULT];

  const customPanelInstance: CustomPanelInstance = {
    open(options?: CustomPanelOpenOptions | WorkspaceCustomPanelConfigOptions) {
      const resolvedOptions = (options ??
        defaultPanelOptions) as CustomPanelConfigOptions;
      const { store } = serviceManager;

      store.dispatch(setConfig(resolvedOptions));
      store.dispatch(setOpen(true));
    },

    close() {
      const { store } = serviceManager;
      store.dispatch(setOpen(false));
    },
  };

  if (hostElement) {
    customPanelInstance.hostElement = hostElement;
  }

  return Object.freeze(customPanelInstance);
}

export { createCustomPanelInstance, CustomPanelInstance };
