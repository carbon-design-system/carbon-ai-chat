/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { CustomPanels, PanelType } from "../../types/instance/apiTypes";
import { DEFAULT_CUSTOM_PANEL_ID } from "../utils/constants";
import { DEFAULT_PANEL_CONFIG_OPTIONS_BY_TYPE } from "../store/reducerUtils";
import {
  createCustomPanelInstance,
  CustomPanelInstance,
} from "./CustomPanelInstance";
import { ServiceManager } from "./ServiceManager";

/**
 * This function takes in the service manager to help create a custom panel manager. The panel manager is created
 * using a function instead of a class because a private property at runtime can still be accessible. Instead of
 * creating a private panels property we create the variable within the scope of the function.
 */
function createCustomPanelManager(serviceManger: ServiceManager): CustomPanels {
  // A panels object holding all created panels. In the future if we ever support multiple panels, Deb would be able to
  // populate this object.
  const panels: Record<string, CustomPanelInstance> = {
    [DEFAULT_CUSTOM_PANEL_ID]: createCustomPanelInstance(
      serviceManger,
      DEFAULT_PANEL_CONFIG_OPTIONS_BY_TYPE[PanelType.DEFAULT],
    ),
  };

  const panelByLocation: Record<PanelType, string> = {
    [PanelType.DEFAULT]: DEFAULT_CUSTOM_PANEL_ID,
  };

  return Object.freeze({
    getPanel(panelLocation: PanelType = PanelType.DEFAULT) {
      const targetPanelId =
        panelByLocation[panelLocation] ?? DEFAULT_CUSTOM_PANEL_ID;
      return panels[targetPanelId];
    },
  });
}

export { createCustomPanelManager, CustomPanels as CustomPanelManager };
