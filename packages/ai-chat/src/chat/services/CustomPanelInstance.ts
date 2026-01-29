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
import { BusEventType } from "../../types/events/eventBusTypes";
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
      const { store, eventBus, instance } = serviceManager;

      // For workspace panels, close any existing workspace before opening a new one
      if (panelType === PanelType.WORKSPACE) {
        const state = store.getState();
        if (state.workspacePanelState.isOpen) {
          // Close the existing workspace panel first
          customPanelInstance.close();
        }
      }

      // For workspace panels, extract and store workspaceId and additionalData if provided
      if (panelType === PanelType.WORKSPACE && options) {
        const workspaceOptions = options as WorkspaceCustomPanelConfigOptions;
        if (workspaceOptions.workspaceId || workspaceOptions.additionalData) {
          store.dispatch(
            actions.setWorkspacePanelData({
              workspaceID: workspaceOptions.workspaceId,
              additionalData: workspaceOptions.additionalData,
            }),
          );
        }
      }

      // Fire pre-open event for workspace panel
      if (panelType === PanelType.WORKSPACE) {
        const state = store.getState();
        const { workspaceID, localMessageItem, fullMessage, additionalData } =
          state.workspacePanelState;

        eventBus.fire(
          {
            type: BusEventType.WORKSPACE_PRE_OPEN,
            data: {
              workspaceId: workspaceID,
              additionalData,
              message: localMessageItem?.item,
              fullMessage,
            },
          },
          instance,
        );
      }

      store.dispatch(setConfig(resolvedOptions));
      store.dispatch(setOpen(true));

      // Fire open event for workspace panel
      if (panelType === PanelType.WORKSPACE) {
        const state = store.getState();
        const { workspaceID, localMessageItem, fullMessage, additionalData } =
          state.workspacePanelState;

        eventBus.fire(
          {
            type: BusEventType.WORKSPACE_OPEN,
            data: {
              workspaceId: workspaceID,
              additionalData,
              message: localMessageItem?.item,
              fullMessage,
            },
          },
          instance,
        );
      }
    },

    close() {
      const { store, eventBus, instance } = serviceManager;

      // For workspace panel, capture state BEFORE closing to preserve data for events
      let workspaceEventData;
      if (panelType === PanelType.WORKSPACE) {
        const state = store.getState();
        const { workspaceID, localMessageItem, fullMessage, additionalData } =
          state.workspacePanelState;

        workspaceEventData = {
          workspaceId: workspaceID,
          additionalData,
          message: localMessageItem?.item,
          fullMessage,
        };

        // Fire pre-close event
        eventBus.fire(
          {
            type: BusEventType.WORKSPACE_PRE_CLOSE,
            data: workspaceEventData,
          },
          instance,
        );
      }

      store.dispatch(setOpen(false));

      // Fire close event for workspace panel using captured data
      if (panelType === PanelType.WORKSPACE && workspaceEventData) {
        eventBus.fire(
          {
            type: BusEventType.WORKSPACE_CLOSE,
            data: workspaceEventData,
          },
          instance,
        );
      }
    },
  };

  if (hostElement) {
    customPanelInstance.hostElement = hostElement;
  }

  return Object.freeze(customPanelInstance);
}

export { createCustomPanelInstance, CustomPanelInstance };
