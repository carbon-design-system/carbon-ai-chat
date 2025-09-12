/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { CustomPanels } from "../../types/instance/apiTypes";
import { DEFAULT_CUSTOM_PANEL_ID } from "../utils/constants";
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
    [DEFAULT_CUSTOM_PANEL_ID]: createCustomPanelInstance(serviceManger),
  };

  return Object.freeze({
    getPanel() {
      return panels[DEFAULT_CUSTOM_PANEL_ID];
    },
  });
}

export { createCustomPanelManager, CustomPanels as CustomPanelManager };
