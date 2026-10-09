/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import dayjs from 'dayjs';
import type React from 'react';
import LocalizedFormat from 'dayjs/plugin/localizedFormat.js';
import merge from 'lodash-es/merge.js';
import isEqual from 'lodash-es/isEqual.js';

import { setVarsForSelector } from '@carbon/ai-chat-components/es/components/shared/dynamic-css-var-sheet.js';

import { createServiceManager } from '../services/loadServices';
import actions from '../store/actions';
import { selectInputIsReadonly } from '../store/selectors';

import { ServiceManager } from '../services/ServiceManager';
import { createAppConfig } from '../store/doCreateStore';
import { setIntl } from './intlUtils';
import { consoleDebug, consoleError, consoleWarn, debugLog } from './miscUtils';
import createHumanAgentService from '../services/haa/HumanAgentServiceImpl';

import {
  BusEventChunkUserDefinedResponse,
  BusEventType,
  BusEventUserDefinedResponse,
  BusEventCustomFooterSlot,
  BusEventCustomRequestFooterSlot,
  MainWindowOpenReason,
  MessageSendSource,
  ViewChangeReason,
} from '../../types/events/eventBusTypes';
import { VIEW_STATE_ALL_CLOSED } from '../store/reducerUtils';
import { PublicConfig } from '../../types/config/PublicConfig';
import {
  ChatInstance,
  IncreaseOrDecrease,
  SendOptions,
} from '../../types/instance/ChatInstance';
import { TypeAndHandler } from '../../types/instance/EventHandlers';
import { AddMessageOptions } from '../../types/config/MessagingConfig';
import { RenderCustomRequestFooterState } from '../../types/component/ChatContainer';
import { loadLocale } from './languageUtils';
import { HistoryItem } from '../../types/messaging/History';
import {
  MessageRequest,
  MessageResponse,
  StreamChunk,
} from '../../types/messaging/Messages';
import {
  CatastrophicErrorPanelState,
  ViewState,
  ViewType,
} from '../../types/state/AppState';
import { AutoScrollOptions } from '../../types/utilities/HasDoAutoScroll';

let bootContainerRulesInstalled = false;

/**
 * Install boot-container size rules on the shared dynamic stylesheet so a
 * strict CSP can drop style-src-attr 'unsafe-inline'. The container fills
 * the host element when one is provided and otherwise stays collapsed
 * (0×0) until the chat floats out.
 */
function ensureBootContainerStyleRules(): void {
  if (bootContainerRulesInstalled) {
    return;
  }
  setVarsForSelector('.cds-aichat--boot-container--filled', {
    width: '100% !important',
    height: '100% !important',
  });
  setVarsForSelector('.cds-aichat--boot-container--collapsed', {
    width: '0 !important',
    height: '0 !important',
  });
  bootContainerRulesInstalled = true;
}

/**
 * Default values applied to the provided `PublicConfig` before boot. This keeps
 * the rest of the boot pipeline free from null checks for optional config
 * branches. Callers can override any of these via the incoming partial config.
 */
export const DEFAULT_PUBLIC_CONFIG: Partial<PublicConfig> = {
  assistantName: 'watsonx',
  openChatByDefault: false,
  shouldTakeFocusIfOpensAutomatically: true,
  serviceDesk: {},
  messaging: {},
  launcher: {
    isOn: true,
  },
};

/**
 * Merges a user-supplied partial config with {@link DEFAULT_PUBLIC_CONFIG} to
 * produce a complete `PublicConfig` used throughout the app.
 */
export function mergePublicConfig(config: Partial<PublicConfig>): PublicConfig {
  return merge({}, DEFAULT_PUBLIC_CONFIG, config) as PublicConfig;
}

/**
 * Creates a {@link ServiceManager}, initializes localization, wires the
 * `humanAgentService`, and constructs the {@link ChatInstance}.
 *
 * This function does not render; the caller should call `instance.render()`
 * after setting up any lifecycle hooks.
 */
export async function initServiceManagerAndInstance(options: {
  publicConfig: PublicConfig;
  container: HTMLElement;
  customHostElement?: HTMLElement;
}): Promise<{ serviceManager: ServiceManager; instance: ChatInstance }> {
  const { publicConfig, container, customHostElement } = options;

  // Extend dayjs with LocalizedFormat plugin once before usage
  dayjs.extend(LocalizedFormat);

  // Create service manager
  const appConfig = createAppConfig(publicConfig);
  const serviceManager = createServiceManager(appConfig);

  // Set container + hosting information
  serviceManager.container = container;
  serviceManager.customHostElement = customHostElement;

  ensureBootContainerStyleRules();
  container.classList.add('cds-aichat--boot-container');
  container.classList.toggle(
    'cds-aichat--boot-container--filled',
    !!serviceManager.customHostElement
  );
  container.classList.toggle(
    'cds-aichat--boot-container--collapsed',
    !serviceManager.customHostElement
  );

  // Load language and locale
  const languagePack = serviceManager.store.getState().languagePack;
  const localePack = await loadLocale(
    serviceManager.store.getState().config.public.locale || 'en'
  );

  // Set up human agent service (created once here; may be recreated
  // dynamically later by config updates)
  serviceManager.humanAgentService = createHumanAgentService(serviceManager);

  // Update Redux with new values for language, locale, and messages
  setIntl(serviceManager, localePack.name, languagePack);

  // Tell dayjs to globally use the locale
  dayjs.locale(localePack);

  // Validate UploadConfig at startup so misconfiguration is surfaced early,
  // regardless of whether the main window is open.
  const uploadConfig = serviceManager.store.getState().config.public.upload;
  if (uploadConfig?.isOn && !uploadConfig.onFileUpload) {
    consoleError(
      '[upload] UploadConfig.isOn is true but onFileUpload is not provided. ' +
        'File upload will be disabled. Please provide an onFileUpload handler in config.upload.'
    );
  } else if (uploadConfig?.onFileUpload && !uploadConfig.isOn) {
    consoleError(
      '[upload] UploadConfig.onFileUpload is provided but isOn is not true. ' +
        'File upload will be disabled. Set isOn: true in config.upload to enable it.'
    );
  }

  // Create the chat instance
  const instance: ChatInstance = {
    on: (handlers: TypeAndHandler | TypeAndHandler[]) => {
      serviceManager.eventBus.on(handlers);
      return instance;
    },

    off: (handlers: TypeAndHandler | TypeAndHandler[]) => {
      serviceManager.eventBus.off(handlers);
      return instance;
    },

    once: (handlers: TypeAndHandler | TypeAndHandler[]) => {
      serviceManager.eventBus.once(handlers);
      return instance;
    },

    send: async (message: MessageRequest | string, options?: SendOptions) => {
      debugLog('Called instance.send', message, options);
      if (selectInputIsReadonly(serviceManager.store.getState())) {
        throw new Error('You are unable to send messages in read only mode.');
      }
      return serviceManager.actions.send(
        message,
        MessageSendSource.INSTANCE_SEND,
        options
      );
    },

    doAutoScroll: (options: AutoScrollOptions = {}) => {
      debugLog('Called instance.doAutoScroll', options);
      serviceManager.mainWindow?.doAutoScroll?.(options);
    },

    updateInputFieldVisibility: (isVisible: boolean) => {
      consoleWarn(
        'instance.updateInputFieldVisibility is deprecated. Use The input.isVisible property to configure this behavior.'
      );
      serviceManager.store.dispatch(
        actions.updateInputState({ fieldVisible: isVisible }, false)
      );
    },

    updateInputIsDisabled: (isDisabled: boolean) => {
      consoleWarn(
        'instance.updateInputIsDisabled is deprecated. Use the input.isDisabled property to configure this behavior.'
      );
      serviceManager.store.dispatch(
        actions.updateInputState({ isReadonly: isDisabled }, false)
      );
    },

    updateAssistantUnreadIndicatorVisibility: (isVisible: boolean) => {
      consoleWarn(
        'instance.updateAssistantUnreadIndicatorVisibility is deprecated. Use launcher.showUnreadIndicator to configure this behavior.'
      );
      debugLog(
        'Called instance.updateAssistantUnreadIndicatorVisibility',
        isVisible
      );
      serviceManager.store.dispatch(
        actions.setLauncherProperty('showUnreadIndicator', isVisible)
      );
    },

    changeView: async (
      newView: ViewType | Partial<ViewState>
    ): Promise<void> => {
      debugLog('Called instance.changeView', newView);

      let issueWithNewView = false;

      const viewTypeValues = Object.values<string>(ViewType);
      if (typeof newView === 'string') {
        if (!viewTypeValues.includes(newView)) {
          consoleError(
            `You tried to change the view but the view you specified is not a valid view name. Please use` +
              ` the valid view names; ${viewTypeValues.join(', ')}.`
          );
          issueWithNewView = true;
        }
      } else if (typeof newView === 'object') {
        Object.keys(newView).forEach((key) => {
          if (!viewTypeValues.includes(key)) {
            consoleError(
              `You tried to change the state of multiple views by providing an object, however you included the key` +
                ` "${key}" within the object which is not a valid view name. Please use the valid view names; ` +
                `${viewTypeValues.join(', ')}.`
            );
            issueWithNewView = true;
          }
        });
      } else {
        consoleError(
          'You tried to change the view but the view you provided was not a string or an object. You can either change' +
            ' to one of the supported views by providing a string, ex. "launcher" or "mainWindow". Or you can' +
            ' change the state of multiple views by providing an object, ex. { "launcher": true, "mainWindow": false,' +
            ' }. Please use one of these supported options.'
        );
        issueWithNewView = true;
      }

      if (!issueWithNewView) {
        await serviceManager.actions.changeView(newView, {
          viewChangeReason: ViewChangeReason.CALLED_CHANGE_VIEW,
        });
      }
    },

    input: {
      updateRawValue: (updater: (previous: string) => string) => {
        debugLog('Called instance.input.updateRawValue');
        serviceManager.actions.updateRawInputValue(updater);
      },

      updateStructuredData: (updater) => {
        debugLog('Called instance.input.updateStructuredData');
        serviceManager.actions.updateStructuredData(updater);
      },

      updateContent: (updater) => {
        debugLog('Called instance.input.updateContent');
        return serviceManager.actions.updateInputContent(updater);
      },

      getEditor: () => {
        debugLog('Called instance.input.getEditor()');
        return serviceManager.actions.ensureInputEditor();
      },
    },

    getState: () => serviceManager.actions.getPublicChatState(),

    writeableElements: serviceManager.writeableElements,

    scrollToMessage: (messageID: string, animate?: boolean) => {
      debugLog('Called instance.scrollToMessage', messageID, animate);
      serviceManager.mainWindow?.doScrollToMessage(messageID, animate);
    },

    updateCatastrophicErrorPanel: (
      panelState: Partial<CatastrophicErrorPanelState>
    ) => {
      debugLog('Called instance.updateCatastrophicPanel');

      if (
        panelState.isOpen &&
        serviceManager.store.getState().catastrophicErrorType !== true
      ) {
        serviceManager.store.dispatch({
          type: 'SET_APP_STATE_VALUE',
          key: 'catastrophicErrorType',
          value: true,
        });
      }

      serviceManager.store.dispatch(
        actions.updateCatastrophicErrorPanel(panelState)
      );
    },

    customPanels: serviceManager.customPanelManager,

    restartConversation: async () => {
      debugLog('Called instance.restartConversation');
      consoleWarn(
        'instance.restartConversation is deprecated. Use instance.messaging.restartConversation instead.'
      );
      return instance.messaging.restartConversation();
    },

    updateIsMessageLoadingCounter(
      direction: IncreaseOrDecrease,
      message?: string
    ): void {
      debugLog('Called instance.updateIsMessageLoadingCounter', direction);
      const { store } = serviceManager;

      if (direction === 'reset') {
        store.dispatch(actions.resetIsLoadingCounter());
      } else if (direction === 'increase') {
        store.dispatch(actions.addIsLoadingCounter(1, message));
      } else if (direction === 'decrease') {
        if (
          store.getState().assistantMessageState.isMessageLoadingCounter <= 0
        ) {
          return;
        }
        store.dispatch(actions.addIsLoadingCounter(-1, message));
      } else if (!direction && message) {
        store.dispatch(actions.addIsLoadingCounter(0, message));
      } else if (direction) {
        consoleError(
          `[updateIsMessageLoadingCounter] Invalid direction: ${direction}. Valid values are undefined (with loading message), "reset", "increase" and "decrease".`
        );
      }
    },

    updateIsChatLoadingCounter(direction: string): void {
      debugLog('Called instance.updateIsChatLoadingCounter', direction);
      const { store } = serviceManager;

      if (direction === 'reset') {
        store.dispatch(actions.resetIsHydratingCounter());
      } else if (direction === 'increase') {
        store.dispatch(actions.addIsHydratingCounter(1));
      } else if (direction === 'decrease') {
        if (store.getState().assistantMessageState.isHydratingCounter <= 0) {
          return;
        }
        store.dispatch(actions.addIsHydratingCounter(-1));
      } else {
        consoleError(
          `[updateIsChatLoadingCounter] Invalid direction: ${direction}. Valid values are "reset", "increase" and "decrease".`
        );
      }
    },

    messaging: {
      addMessage: (
        message: MessageResponse,
        options: AddMessageOptions = {}
      ) => {
        debugLog('Called instance.messaging.addMessage', message, options);
        if (
          serviceManager.messageService.isRequestFromPreviousConversation(
            message.request_id
          )
        ) {
          return Promise.resolve();
        }
        serviceManager.messageService.messageLoadingManager.end();
        return serviceManager.actions.receive(
          message,
          options?.isLatestWelcomeNode ?? false,
          null
        );
      },

      addMessageChunk: async (
        chunk: StreamChunk,
        options: AddMessageOptions = {}
      ) => {
        debugLog('Called instance.messaging.addMessageChunk', chunk, options);
        try {
          await serviceManager.actions.receiveChunk(chunk, null, options);
        } catch (error) {
          consoleError('Error in addMessageChunk', error);
          throw error;
        }
      },

      upsertMessage: async (messageID, state, updater) => {
        debugLog('Called instance.messaging.upsertMessage', messageID, state);
        const { restartCount } = serviceManager;
        try {
          await serviceManager.messageUpsertCoordinator.upsert(
            messageID,
            state,
            updater
          );
        } catch (error) {
          if (restartCount === serviceManager.restartCount) {
            serviceManager.messageService.messageLoadingManager.end();
          }
          throw error;
        }
      },

      removeMessages: async (messageIDs: string[]) => {
        debugLog('Called instance.messaging.removeMessages', messageIDs);
        return serviceManager.actions.removeMessages(messageIDs);
      },

      clearConversation: () => {
        debugLog('Called instance.messaging.clearConversation');
        return serviceManager.actions.restartConversation({
          skipHydration: true,
          endHumanAgentConversation: false,
          fireEvents: false,
        });
      },

      insertHistory: (messages: HistoryItem[]) => {
        debugLog('Called instance.messaging.insertHistory', messages);
        return serviceManager.actions.insertHistory(messages);
      },

      restartConversation: async () => {
        debugLog('Called instance.messaging.restartConversation');
        return serviceManager.actions.restartConversation();
      },
    },

    requestFocus: () => {
      debugLog('Called instance.requestFocus');
      serviceManager.appWindow?.requestFocus();
    },

    serviceDesk: {
      endConversation: () => {
        debugLog('Called instance.serviceDesk.endConversation');
        return serviceManager.actions.agentEndConversation(false);
      },

      updateIsSuspended: async (isSuspended: boolean) => {
        debugLog('Called instance.serviceDesk.updateIsSuspended', isSuspended);
        return serviceManager.actions.agentUpdateIsSuspended(isSuspended);
      },
    },

    destroySession: async (keepOpenState: boolean) => {
      debugLog('Called instance.destroySession', keepOpenState);
      return serviceManager.actions.destroySession(keepOpenState);
    },
  };

  // Add serviceManager for testing if the flag is enabled (exclude instance to avoid circular reference)
  if (
    serviceManager.store.getState().config.public.exposeServiceManagerForTesting
  ) {
    const { instance: _, ...serviceManagerForTesting } = serviceManager;
    instance.serviceManager = serviceManagerForTesting as ServiceManager;
  }

  if (serviceManager.store.getState().config.public.debug) {
    consoleDebug('[chatBoot] Created chat instance', instance);
  }

  serviceManager.instance = instance;

  return { serviceManager, instance };
}

/**
 * Applies the first view transition after boot, deciding between restoring a
 * session or opening the default view. Keeps this sequencing in one place so
 * tests and callers can reason about what happens immediately after boot.
 */
export async function performInitialViewChange(serviceManager: ServiceManager) {
  const initialState = serviceManager.store.getState();
  const { wasLoadedFromBrowser } = initialState.persistedToBrowserStorage;
  const { targetViewState } = initialState;
  const { openChatByDefault } = initialState.config.public;

  if (targetViewState.mainWindow) {
    let mainWindowOpenReason = MainWindowOpenReason.SESSION_HISTORY;
    if (openChatByDefault && !wasLoadedFromBrowser) {
      mainWindowOpenReason = MainWindowOpenReason.OPEN_BY_DEFAULT;
    }
    await serviceManager.actions.changeView(targetViewState, {
      viewChangeReason: ViewChangeReason.WEB_CHAT_LOADED,
      mainWindowOpenReason,
    });
  } else {
    const viewChangeReason = ViewChangeReason.WEB_CHAT_LOADED;
    const tryHydrating = false;
    const forceViewChange = isEqual(targetViewState, VIEW_STATE_ALL_CLOSED);

    await serviceManager.actions.changeView(
      targetViewState,
      { viewChangeReason },
      tryHydrating,
      forceViewChange
    );
  }
}

/**
 * A minimal shallow-equivalence checker for plain objects used during initial
 * view-change decision making. Avoids pulling in a deep-equality dependency for
 * this narrow use.
 */

/**
 * Attaches event handlers to the `ChatInstance` that track user-defined
 * response items in React state so they can be rendered via portals.
 *
 * On restart events, the tracked state is cleared. Returns a function that
 * removes the handlers again, so a remount does not collect twice.
 */
export function attachUserDefinedResponseHandlers(
  webChatInstance: ChatInstance,
  setBySlot: React.Dispatch<
    React.SetStateAction<{
      [key: string]: {
        fullMessage?: any;
        messageItem?: any;
        partialItems?: any[];
        state?: any;
      };
    }>
  >
) {
  function userDefinedResponseHandler(event: BusEventUserDefinedResponse) {
    setBySlot((bySlot) => {
      return {
        ...bySlot,
        [event.data.slot]: {
          fullMessage: event.data.fullMessage,
          messageItem: event.data.message,
          state: event.data.state,
        },
      };
    });
  }

  function userDefinedChunkHandler(event: BusEventChunkUserDefinedResponse) {
    if ('complete_item' in event.data.chunk) {
      const messageItem = event.data.chunk.complete_item;
      setBySlot((bySlot) => {
        return {
          ...bySlot,
          [event.data.slot]: {
            messageItem,
          },
        };
      });
    } else if ('partial_item' in event.data.chunk) {
      const itemChunk = event.data.chunk.partial_item;
      setBySlot((bySlot) => {
        return {
          ...bySlot,
          [event.data.slot]: {
            partialItems: [
              ...(bySlot[event.data.slot]?.partialItems || []),
              itemChunk,
            ],
          },
        };
      });
    }
  }

  function restartHandler() {
    setBySlot({});
  }

  const handlers = [
    {
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: userDefinedChunkHandler,
    },
    {
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: userDefinedResponseHandler,
    },
    { type: BusEventType.RESTART_CONVERSATION, handler: restartHandler },
  ];
  webChatInstance.on(handlers);
  return () => {
    webChatInstance.off(handlers);
  };
}

/**
 * Attaches event handlers to the `ChatInstance` that track custom
 * message footers in React state so they can be rendered via portals.
 *
 * On restart events, the tracked state is cleared. Returns a function that
 * removes the handlers again.
 */
export function attachCustomFooterHandler(
  webChatInstance: ChatInstance,
  setBySlot: React.Dispatch<
    React.SetStateAction<{
      [key: string]: {
        slotName: string;
        message: any;
        messageItem: any;
        additionalData?: Record<string, unknown>;
      };
    }>
  >
) {
  function customFooterSlotHandler(event: BusEventCustomFooterSlot) {
    setBySlot((bySlot) => {
      return {
        ...bySlot,
        [event.data.slotName]: {
          slotName: event.data.slotName,
          message: event.data.message,
          messageItem: event.data.messageItem,
          additionalData: event.data.additionalData as
            Record<string, unknown> | undefined,
        },
      };
    });
  }

  function restartHandler() {
    setBySlot({});
  }

  const handlers = [
    { type: BusEventType.CUSTOM_FOOTER_SLOT, handler: customFooterSlotHandler },
    { type: BusEventType.RESTART_CONVERSATION, handler: restartHandler },
  ];
  webChatInstance.on(handlers);
  return () => {
    webChatInstance.off(handlers);
  };
}

/**
 * Registers a handler that accumulates the footer slots below user messages in React state so they can be
 * rendered via portals.
 *
 * This event fires for every user message rather than only when a backend opts in, so `isEnabled` is asked on each
 * one: a host that passes no render prop accumulates nothing and re-renders on nothing. Asking per event rather
 * than gating the subscription is what lets a host supply the prop after the chat has booted.
 *
 * On restart events, the tracked state is cleared. Returns a function that
 * removes the handlers again.
 */
export function attachCustomRequestFooterHandler(
  webChatInstance: ChatInstance,
  setBySlot: React.Dispatch<
    React.SetStateAction<Record<string, RenderCustomRequestFooterState>>
  >,
  isEnabled: () => boolean
) {
  function customRequestFooterSlotHandler(
    event: BusEventCustomRequestFooterSlot
  ) {
    if (!isEnabled()) {
      return;
    }

    setBySlot((bySlot) => {
      return {
        ...bySlot,
        [event.data.slotName]: {
          slotName: event.data.slotName,
          message: event.data.message,
        },
      };
    });
  }

  function restartHandler() {
    setBySlot({});
  }

  const handlers = [
    {
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      handler: customRequestFooterSlotHandler,
    },
    { type: BusEventType.RESTART_CONVERSATION, handler: restartHandler },
  ];
  webChatInstance.on(handlers);
  return () => {
    webChatInstance.off(handlers);
  };
}
