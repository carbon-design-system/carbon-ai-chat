/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';
import isEqual from 'lodash-es/isEqual.js';
import {
  CustomPanelConfigOptions,
  WorkspaceCustomPanelConfigOptions,
  CustomPanelInstance,
  CustomPanelOpenOptions,
  PanelType,
} from '../../types/instance/apiTypes';
import { BusEventType } from '../../types/events/eventBusTypes';
import actions from '../store/actions';
import { DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS } from '../store/reducerUtils';
import { ServiceManager } from './ServiceManager';
import {
  captureMessageEvent,
  eventLocalItems,
} from '../utils/messageEventOwnership';
import { deepFreeze } from '../utils/lang/objectUtils';
import { Message } from '../../types/messaging/Messages';
import { LocalMessageItem } from '../../types/messaging/LocalMessageItem';

/**
 * This function takes in the service manager to help create a custom panel instance. The panel instance is created
 * using a function instead of a class because a private property at runtime can still be accessible. The service
 * manager is passed in instead made a private property.
 */
function createCustomPanelInstance(
  panelType: PanelType,
  serviceManager: ServiceManager,
  defaultPanelOptions: CustomPanelOpenOptions = DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS
): CustomPanelInstance {
  let hostElement;
  let workspaceValues: { stored: unknown; working: unknown };
  let workspaceMessages: {
    message: Message;
    localItem: LocalMessageItem;
    working: { message: Message; localItems: Record<string, LocalMessageItem> };
  };

  function captureWorkspaceEvent() {
    const { store } = serviceManager;
    const { workspaceID, localMessageItem, fullMessage, additionalData } =
      store.getState().workspacePanelState;
    if (!workspaceValues || workspaceValues.stored !== additionalData) {
      workspaceValues = {
        stored: additionalData,
        working: cloneDeep(additionalData),
      };
    }
    if (
      fullMessage &&
      localMessageItem &&
      (workspaceMessages?.message !== fullMessage ||
        workspaceMessages?.localItem !== localMessageItem)
    ) {
      const working = cloneDeep({
        message: fullMessage,
        localItems: { [localMessageItem.ui_state.id]: localMessageItem },
      });
      if (Object.isFrozen(fullMessage)) {
        deepFreeze(working.message);
      }
      if (Object.isFrozen(localMessageItem.item)) {
        deepFreeze(working.localItems[localMessageItem.ui_state.id].item);
      }
      workspaceMessages = {
        message: fullMessage,
        localItem: localMessageItem,
        working,
      };
    }
    return {
      workspaceId: workspaceID,
      additionalData: workspaceValues.working,
      message:
        localMessageItem &&
        workspaceMessages?.working.localItems[localMessageItem.ui_state.id]
          ?.item,
      fullMessage: fullMessage && workspaceMessages?.working.message,
    };
  }

  async function fireWorkspaceEvent(
    type:
      | BusEventType.WORKSPACE_PRE_OPEN
      | BusEventType.WORKSPACE_OPEN
      | BusEventType.WORKSPACE_PRE_CLOSE
      | BusEventType.WORKSPACE_CLOSE,
    data: ReturnType<typeof captureWorkspaceEvent>
  ) {
    const { store, restartCount } = serviceManager;
    const before = store.getState().workspacePanelState;
    const working = data.additionalData;
    const messages = workspaceMessages;
    let messageEvent: ReturnType<typeof captureMessageEvent>;
    if (
      messages?.message &&
      messages.localItem &&
      data.fullMessage === messages.working.message &&
      store.getState().allMessagesByID[messages.message.id] === messages.message
    ) {
      const localItems = Object.fromEntries(
        Object.entries(store.getState().allMessageItemsByID).filter(
          ([, item]) => item?.fullMessageID === messages.message.id
        )
      );
      const workingItems = eventLocalItems(
        messages.message,
        messages.working.message,
        localItems
      );
      const selectedID = messages.localItem.ui_state.id;
      if (workingItems[selectedID]) {
        workingItems[selectedID].item =
          messages.working.localItems[selectedID].item;
      }
      messageEvent = captureMessageEvent(
        serviceManager,
        messages.message,
        localItems,
        {
          message: messages.working.message,
          localItems: workingItems,
        }
      );
    }
    const ownsData =
      workspaceValues?.working === working &&
      workspaceValues?.stored === before.additionalData;
    try {
      await serviceManager.eventBus.fire(
        { type, data },
        serviceManager.instance
      );
    } finally {
      let current = store.getState().workspacePanelState;
      if (
        messageEvent &&
        store.getState().allMessagesByID[messages.message.id] ===
          messages.message &&
        restartCount === serviceManager.restartCount &&
        current.fullMessage === before.fullMessage &&
        current.localMessageItem === before.localMessageItem &&
        current.workspaceID === before.workspaceID
      ) {
        messageEvent.commit();
        const committedMessage =
          store.getState().allMessagesByID[messages.message.id];
        const committedLocalItem =
          store.getState().allMessageItemsByID[messages.localItem.ui_state.id];
        if (
          workspaceMessages === messages &&
          committedMessage &&
          committedLocalItem &&
          isEqual(committedMessage, messages.working.message) &&
          isEqual(
            committedLocalItem.item,
            messages.working.localItems[messages.localItem.ui_state.id].item
          )
        ) {
          messages.message = committedMessage;
          messages.localItem = committedLocalItem;
        }
      }
      current = store.getState().workspacePanelState;
      if (
        ownsData &&
        restartCount === serviceManager.restartCount &&
        current.additionalData === before.additionalData &&
        current.workspaceID === before.workspaceID &&
        current.fullMessage === before.fullMessage &&
        current.localMessageItem === before.localMessageItem &&
        (!isEqual(before.additionalData, working) ||
          (current.fullMessage &&
            messages === workspaceMessages &&
            (current.fullMessage !== messages.message ||
              current.localMessageItem !== messages.localItem)))
      ) {
        const action = actions.setWorkspacePanelData({
          workspaceID: current.workspaceID,
          localMessageItem:
            current.localMessageItem && messages === workspaceMessages
              ? messages.localItem
              : current.localMessageItem,
          fullMessage:
            current.fullMessage && messages === workspaceMessages
              ? messages.message
              : current.fullMessage,
          additionalData: working,
        });
        workspaceValues = { stored: action.additionalData, working };
        store.dispatch(action);
      }
    }
  }

  const panelActions = {
    [PanelType.WORKSPACE]: {
      setConfig: actions.setWorkspaceCustomPanelConfigOptions,
      setOpen: actions.setWorkspaceCustomPanelOpen,
    },
    [PanelType.DEFAULT]: {
      setConfig: actions.setCustomPanelConfigOptions,
      setOpen: actions.setCustomPanelOpen,
    },
    [PanelType.HISTORY]: {
      setConfig: actions.setCustomPanelConfigOptions,
      setOpen: actions.setHistoryPanelOpen,
    },
  } as const;

  const { setConfig, setOpen } =
    panelActions[panelType] ?? panelActions[PanelType.DEFAULT];

  const customPanelInstance: CustomPanelInstance = {
    async open(
      options?: CustomPanelOpenOptions | WorkspaceCustomPanelConfigOptions
    ) {
      const resolvedOptions = (options ??
        defaultPanelOptions) as CustomPanelConfigOptions;
      const { store } = serviceManager;

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
          const action = actions.setWorkspacePanelData({
            workspaceID: workspaceOptions.workspaceId,
            additionalData: workspaceOptions.additionalData,
          });
          workspaceValues = {
            stored: action.additionalData,
            working: workspaceOptions.additionalData,
          };
          store.dispatch(action);
        }
      }

      // Fire pre-open event for workspace panel
      if (panelType === PanelType.WORKSPACE) {
        await fireWorkspaceEvent(
          BusEventType.WORKSPACE_PRE_OPEN,
          captureWorkspaceEvent()
        );
      }

      store.dispatch(setConfig(resolvedOptions));
      store.dispatch(setOpen(true));

      // Fire open event for workspace panel
      if (panelType === PanelType.WORKSPACE) {
        await fireWorkspaceEvent(
          BusEventType.WORKSPACE_OPEN,
          captureWorkspaceEvent()
        );
      }
    },

    async close() {
      const { store } = serviceManager;

      // For workspace panel, capture state BEFORE closing to preserve data for events
      let workspaceEventData;
      if (panelType === PanelType.WORKSPACE) {
        workspaceEventData = captureWorkspaceEvent();
        await fireWorkspaceEvent(
          BusEventType.WORKSPACE_PRE_CLOSE,
          workspaceEventData
        );
      }

      store.dispatch(setOpen(false));

      // Fire close event for workspace panel using captured data
      if (panelType === PanelType.WORKSPACE && workspaceEventData) {
        await fireWorkspaceEvent(
          BusEventType.WORKSPACE_CLOSE,
          workspaceEventData
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
