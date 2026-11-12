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

import { ServiceManager } from '../../sdk/services/ServiceManager';

import {
  captureMessageEvent,
  eventLocalItems,
  watchPayloadEdits,
} from '../../sdk/utils/messageEventOwnership';

import { deepFreeze } from '../../sdk/utils/lang/objectUtils';

import { Message } from '../../types/messaging/Messages';

import { LocalMessageItem } from '../../types/messaging/LocalMessageItem';

import { DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS, viewActions } from '../state';

import { chatStore } from './attachChatView';

/**
 * Opens the history panel. The header menu and the history panel's `open`
 * both come here, so `historyPanel:pre:open` fires once before every open.
 * Handlers can't cancel it, and the open doesn't wait for them. A handler
 * queued behind a slow earlier one may run after the panel is open.
 */
function openHistoryPanel(serviceManager: ServiceManager) {
  serviceManager.fire({ type: BusEventType.HISTORY_PANEL_PRE_OPEN });
  serviceManager.store.dispatch(viewActions.setHistoryPanelOpen(true));
}

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
  // The message and item a preview card opened the workspace from, until it closes.
  let workspaceSource: { messageID: string; itemID?: string };

  /**
   * The IDs of the message and item the workspace state holds, if any. A preview card
   * writes them just before it opens the workspace, which then clears them.
   */
  function workspaceSourceOf() {
    const { fullMessage, localMessageItem } =
      chatStore(serviceManager).getState().view.workspacePanelState;
    if (!fullMessage || !localMessageItem) {
      return undefined;
    }
    const itemID = serviceManager.publicStateService.messageItemIDOf(
      localMessageItem.ui_state.id
    );
    return itemID
      ? { messageID: fullMessage.id, itemID }
      : { messageID: fullMessage.id };
  }

  function captureWorkspaceEvent() {
    const store = chatStore(serviceManager);
    const { workspaceID, localMessageItem, fullMessage, additionalData } =
      store.getState().view.workspacePanelState;
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
      ...workspaceSource,
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
    const store = chatStore(serviceManager);
    const { restartCount } = serviceManager;
    const before = store.getState().view.workspacePanelState;
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
    const checkEdits = watchPayloadEdits(serviceManager, type, data);
    try {
      await serviceManager.eventBus.fire(
        { type, data },
        serviceManager.instance
      );
    } finally {
      checkEdits();
      let current = store.getState().view.workspacePanelState;
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
      current = store.getState().view.workspacePanelState;
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
        const action = viewActions.setWorkspacePanelData({
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
      setConfig: viewActions.setWorkspaceCustomPanelConfigOptions,
      setOpen: viewActions.setWorkspaceCustomPanelOpen,
    },
    [PanelType.DEFAULT]: {
      setConfig: viewActions.setCustomPanelConfigOptions,
      setOpen: viewActions.setCustomPanelOpen,
    },
    [PanelType.HISTORY]: {
      setOpen: viewActions.setHistoryPanelOpen,
    },
  } as const;

  const { setOpen } =
    panelActions[panelType] ?? panelActions[PanelType.DEFAULT];
  // The history panel's `open` returns before it would set options.
  const { setConfig } =
    panelType === PanelType.WORKSPACE
      ? panelActions[PanelType.WORKSPACE]
      : panelActions[PanelType.DEFAULT];

  const customPanelInstance: CustomPanelInstance = {
    async open(
      options?: CustomPanelOpenOptions | WorkspaceCustomPanelConfigOptions
    ) {
      // The history panel has no options to show, so it ignores them.
      if (panelType === PanelType.HISTORY) {
        openHistoryPanel(serviceManager);
        return;
      }

      const resolvedOptions = (options ??
        defaultPanelOptions) as CustomPanelConfigOptions;
      const store = chatStore(serviceManager);
      const source =
        panelType === PanelType.WORKSPACE ? workspaceSourceOf() : undefined;

      // For workspace panels, close any existing workspace before opening a new one
      if (panelType === PanelType.WORKSPACE) {
        const state = store.getState();
        if (state.view.workspacePanelState.isOpen) {
          // Close the existing workspace panel first
          customPanelInstance.close();
        }
      }

      // For workspace panels, extract and store workspaceId and additionalData if provided
      if (panelType === PanelType.WORKSPACE && options) {
        const workspaceOptions = options as WorkspaceCustomPanelConfigOptions;
        if (workspaceOptions.workspaceId || workspaceOptions.additionalData) {
          const action = viewActions.setWorkspacePanelData({
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
        workspaceSource = source;
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
      const closingSource = workspaceSource;
      if (panelType === PanelType.WORKSPACE) {
        workspaceEventData = captureWorkspaceEvent();
        await fireWorkspaceEvent(
          BusEventType.WORKSPACE_PRE_CLOSE,
          workspaceEventData
        );
      }

      store.dispatch(setOpen(false));
      // An open that started while this close waited has its own source.
      if (workspaceSource === closingSource) {
        workspaceSource = undefined;
      }

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

export { createCustomPanelInstance, CustomPanelInstance, openHistoryPanel };
