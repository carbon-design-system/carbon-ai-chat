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
import { consoleError } from '../utils/miscUtils';
import { Message } from '../../types/messaging/Messages';
import { LocalMessageItem } from '../../types/messaging/LocalMessageItem';

/**
 * Closes the open workspace so another can open. A close handler that throws is logged, and the workspace closes
 * anyway, without its close event.
 */
async function closeWorkspaceForNext(
  close: () => Promise<void>,
  serviceManager: ServiceManager
) {
  try {
    await close();
  } catch (error) {
    consoleError(
      'A workspace close handler failed while another workspace was opening. The open workspace closes anyway.',
      error
    );
    serviceManager.store.dispatch(actions.setWorkspaceCustomPanelOpen(false));
  }
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

  // How many workspace event handlers are running. A call made while one runs skips the queue below, since the call
  // that fired the event can't finish until the handler does.
  let workspaceHandlersRunning = 0;

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
    workspaceHandlersRunning++;
    try {
      await serviceManager.eventBus.fire(
        { type, data },
        serviceManager.instance
      );
    } finally {
      workspaceHandlersRunning--;
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

  // The unordered open and close. The panel's own methods below run them in call order.
  const panelOperations = {
    async open(
      options?: CustomPanelOpenOptions | WorkspaceCustomPanelConfigOptions
    ) {
      const resolvedOptions = (options ??
        defaultPanelOptions) as CustomPanelConfigOptions;
      const { store } = serviceManager;

      // The history panel only draws with history on, so opening it otherwise would report a panel nobody sees.
      if (
        panelType === PanelType.HISTORY &&
        !store.getState().config.public.history?.isOn
      ) {
        return;
      }

      // Finish closing the open workspace first: its close resets the workspace state, which would otherwise wipe
      // the ID and data stored below.
      if (
        panelType === PanelType.WORKSPACE &&
        store.getState().workspacePanelState.isOpen
      ) {
        await closeWorkspaceForNext(panelOperations.close, serviceManager);
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

      // For workspace panel, capture state BEFORE closing to preserve data for events. A closed workspace fires no
      // close events.
      let workspaceEventData;
      if (
        panelType === PanelType.WORKSPACE &&
        store.getState().workspacePanelState.isOpen
      ) {
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

  // A workspace's opens and closes wait on event handlers, so they run one after another in call order: a call
  // starts once the one before it has finished. A call made while a workspace event handler runs starts at once
  // instead, so a handler can await it.
  let workspaceQueue: Promise<unknown> = Promise.resolve();
  function inOrder(run: () => Promise<void>): Promise<void> {
    if (panelType !== PanelType.WORKSPACE || workspaceHandlersRunning > 0) {
      return run();
    }
    const result = workspaceQueue.then(run);
    workspaceQueue = result.catch(() => {});
    return result;
  }

  const customPanelInstance: CustomPanelInstance = {
    open(options?: CustomPanelOpenOptions | WorkspaceCustomPanelConfigOptions) {
      return inOrder(() => panelOperations.open(options));
    },

    close() {
      return inOrder(panelOperations.close);
    },
  };

  if (hostElement) {
    customPanelInstance.hostElement = hostElement;
  }

  return Object.freeze(customPanelInstance);
}

export {
  closeWorkspaceForNext,
  createCustomPanelInstance,
  CustomPanelInstance,
};
