/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat.js';
import merge from 'lodash-es/merge.js';
import isEqual from 'lodash-es/isEqual.js';

import { createServiceManager } from '../../shared/services/loadServices';
import actions from '../../shared/store/actions';
import { selectInputIsReadonly } from '../../shared/store/selectors';

import { ServiceManager } from '../../shared/services/ServiceManager';
import { createAppConfig } from './appConfig';
import { createCustomPanelManager } from '../services/CustomPanelManager';
import { attachChatView, chatStore } from '../services/attachChatView';
import { setIntl } from '../../shared/utils/intlUtils';
import {
  consoleDebug,
  consoleError,
  consoleWarn,
  debugLog,
} from '../../shared/utils/miscUtils';
import createHumanAgentService from '../../shared/services/haa/HumanAgentServiceImpl';
import { createConversationInstance } from '../../shared/services/conversationInstance';
import { createWriteableElements } from './writeableElements';

import {
  MainWindowOpenReason,
  MessageSendSource,
  ViewChangeReason,
} from '../../types/events/eventBusTypes';
import { VIEW_STATE_ALL_CLOSED } from '../../shared/store/reducerUtils';
import { PublicConfig } from '../../types/config/PublicConfig';
import {
  ChatInstance,
  IncreaseOrDecrease,
  SendOptions,
} from '../../types/instance/ChatInstance';
import { AddMessageOptions } from '../../types/config/MessagingConfig';
import { loadLocale } from '../../shared/utils/languageUtils';
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
import { viewActions } from '../../view/state';

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
 * This function does not render. Its caller, `cds-aichat-container`, renders
 * the app after the host's `onBeforeRender`.
 */
export async function initServiceManagerAndInstance(options: {
  publicConfig: PublicConfig;
}): Promise<{ serviceManager: ServiceManager; instance: ChatInstance }> {
  const { publicConfig } = options;

  // Extend dayjs with LocalizedFormat plugin once before usage
  dayjs.extend(LocalizedFormat);

  // Create service manager
  const appConfig = createAppConfig(publicConfig);
  const serviceManager = createServiceManager(appConfig);
  attachChatView(serviceManager, publicConfig);

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

  // Create the chat instance. Its conversation members are the ones a chat
  // `createChatSDK` starts has; the rest drive the view.
  const conversation = createConversationInstance(
    serviceManager,
    () => instance
  );
  const instance: ChatInstance = {
    ...conversation,

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
      serviceManager.view.current?.instance.doAutoScroll(options);
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
        viewActions.setLauncherProperty('showUnreadIndicator', isVisible)
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

    getState: serviceManager.publicStateService.getLive,

    writeableElements: createWriteableElements(),

    scrollToMessage: (messageID: string, animate?: boolean) => {
      debugLog('Called instance.scrollToMessage', messageID, animate);
      serviceManager.view.current?.instance.scrollToMessage(messageID, animate);
    },

    updateCatastrophicErrorPanel: (
      panelState: Partial<CatastrophicErrorPanelState>
    ) => {
      debugLog('Called instance.updateCatastrophicPanel');

      if (
        panelState.isOpen &&
        chatStore(serviceManager).getState().view.catastrophicErrorType !== true
      ) {
        serviceManager.store.dispatch(
          viewActions.setViewValue('catastrophicErrorType', true)
        );
      }

      serviceManager.store.dispatch(
        viewActions.updateCatastrophicErrorPanel(panelState)
      );
    },

    customPanels: createCustomPanelManager(serviceManager),

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
      serviceManager.messageCoordinator.updateIsMessageLoadingCounter(
        direction,
        message
      );
    },

    updateIsChatLoadingCounter(direction: string): void {
      debugLog('Called instance.updateIsChatLoadingCounter', direction);
      serviceManager.messageCoordinator.updateIsChatLoadingCounter(direction);
    },

    messaging: {
      addMessage: (
        message: MessageResponse,
        options: AddMessageOptions = {}
      ) => {
        debugLog('Called instance.messaging.addMessage', message, options);
        if (
          serviceManager.messageCoordinator.isRequestFromPreviousConversation(
            message.request_id
          )
        ) {
          return Promise.resolve();
        }
        serviceManager.messageCoordinator.messageLoadingManager.end();
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

      ...conversation.messaging,
    },

    requestFocus: () => {
      debugLog('Called instance.requestFocus');
      return serviceManager.view.current?.instance.requestFocus() === true;
    },

    serviceDesk: conversation.serviceDesk,

    destroySession: async (keepOpenState: boolean) => {
      debugLog('Called instance.destroySession', keepOpenState);
      return serviceManager.actions.destroySession(keepOpenState);
    },
  };

  // Add serviceManager for testing if the flag is enabled (exclude instance to avoid circular reference)
  if (
    chatStore(serviceManager).getState().config.public
      .exposeServiceManagerForTesting
  ) {
    const { instance: _, ...serviceManagerForTesting } = serviceManager;
    instance.serviceManager = serviceManagerForTesting as ServiceManager;
  }

  if (serviceManager.store.getState().config.public.debug) {
    consoleDebug('[chatBoot] Created chat instance', instance);
  }

  serviceManager.instance = instance;
  serviceManager.messageCoordinator.onInstanceReady();

  return { serviceManager, instance };
}

/**
 * Applies the first view transition after boot, deciding between restoring a
 * session or opening the default view. Keeps this sequencing in one place so
 * tests and callers can reason about what happens immediately after boot.
 */
export async function performInitialViewChange(serviceManager: ServiceManager) {
  const initialState = chatStore(serviceManager).getState();
  const { wasLoadedFromBrowser } = initialState.view.persistedToBrowserStorage;
  const { targetViewState } = initialState.view;
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
