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

import { createChatSDK } from '../../sdk/createChatSDK';
import { chatOf, claimOf, type ChatSDKHandle } from '../../sdk/handle';
import { ChatNamespaceError, type ChatClaim } from '../../sdk/registry';
import actions from '../../sdk/store/actions';

import { ServiceManager } from '../../sdk/services/ServiceManager';
import { createDerivedConfig } from './appConfig';
import { createCustomPanelManager } from '../services/CustomPanelManager';
import { attachChatView, chatStore } from '../services/attachChatView';
import { setIntl } from '../../sdk/utils/intlUtils';
import {
  callOnError,
  consoleDebug,
  consoleError,
  consoleWarn,
  debugLog,
} from '../../sdk/utils/miscUtils';
import { createConversationInstance } from '../../sdk/services/conversationInstance';
import { createWriteableElements } from './writeableElements';
import { dropSubscriptions, mountSubscriptions } from './mountSubscriptions';
import { applyConfigChangesDynamically } from './dynamicConfigUpdates';
import { renderAsUserDefinedMessage } from '../../sdk/utils/messageUtils';

import {
  BusEventType,
  MainWindowOpenReason,
  ViewChangeReason,
  type BusEventUserDefinedResponse,
} from '../../types/events/eventBusTypes';
import { VIEW_STATE_ALL_CLOSED } from '../../sdk/store/reducerUtils';
import { PublicConfig } from '../../types/config/PublicConfig';
import { OnErrorType } from '../../types/config/ErrorConfig';
import {
  ChatInstance,
  IncreaseOrDecrease,
  SendOptions,
} from '../../types/instance/ChatInstance';
import {
  AddMessageOptions,
  type MessageState,
} from '../../types/config/MessagingConfig';
import { loadLocale } from '../../sdk/utils/languageUtils';
import {
  Message,
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
import { viewActions } from '../state';
import { createMountViewState } from '../state/initialState';

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
  // Merging into a new object copies plain objects and arrays and keeps
  // functions and class instances by reference, so the host editing its
  // object later changes nothing (#1833).
  return merge({}, DEFAULT_PUBLIC_CONFIG, config) as PublicConfig;
}

/**
 * Boots the prebuilt chat through `createChatSDK`, with what only the prebuilt
 * chat has: the view partition, session storage, the formatter's locale, and
 * the full {@link ChatInstance}. History waits for the main window to open.
 *
 * With `lifecycle.reuseInstance` on, it takes a claim on the namespace: a chat
 * released there less than a grace window ago is adopted instead of booted
 * (ADR-0003), and aborting `signal` releases the claim, or destroys the chat
 * with `lifecycle.onUnmount: 'destroy'`. A namespace another mount holds
 * rejects with a `ChatNamespaceError`.
 *
 * This function does not render. Its caller, `cds-aichat-container`, attaches
 * the view and renders the app after the host's `onBeforeRender`.
 */
export async function bootPrebuiltChat(options: {
  publicConfig: PublicConfig;
  signal?: AbortSignal;
}): Promise<{
  handle: ChatSDKHandle;
  serviceManager: ServiceManager;
  instance: ChatInstance;
  /** The chat's claim on its namespace, with reuse on. */
  claim?: ChatClaim<ServiceManager>;
  /**
   * Whether removing the mount destroys the chat, with reuse on. Read it at
   * removal: it reads the chat's config, so an update counts.
   */
  destroysOnUnmount: () => boolean;
}> {
  const { publicConfig, signal } = options;
  // The chat once boot creates it or the claim gets it. Before then, the
  // mount's own config is the one adoption will apply.
  let chat: ServiceManager | undefined;
  const destroysOnUnmount = () =>
    (chat?.store.getState().config.public ?? publicConfig).lifecycle
      ?.onUnmount === 'destroy';

  // Extend dayjs with LocalizedFormat plugin once before usage
  dayjs.extend(LocalizedFormat);
  // Before the locale loads, as before, so config warnings print first.
  const derivedConfig = createDerivedConfig(publicConfig);
  const localePack = await loadLocale(publicConfig.locale || 'en');

  const handle = await createChatSDK(undefined, {
    appConfig: { public: publicConfig },
    sessionStorage: true,
    loadHistory: false,
    onServicesCreated: (serviceManager) => {
      chat = serviceManager;
      attachChatView(serviceManager, publicConfig, derivedConfig);
      if (publicConfig.lifecycle?.reuseInstance === true) {
        collectSlotlessResponses(serviceManager);
      }
      // Update Redux with new values for language, locale, and messages
      setIntl(
        serviceManager,
        localePack.name,
        serviceManager.store.getState().languagePack
      );
      // Tell dayjs to globally use the locale
      dayjs.locale(localePack);
    },
    createInstance: createPrebuiltInstance,
    reuse: publicConfig.lifecycle?.reuseInstance === true,
    signal,
    destroyOnAbort: destroysOnUnmount,
    adopt: (serviceManager) => adoptPrebuiltChat(serviceManager, publicConfig),
  });
  const serviceManager = chatOf(handle);
  chat = serviceManager;
  return {
    handle,
    serviceManager,
    instance: serviceManager.instance,
    claim: claimOf(handle),
    destroysOnUnmount,
  };
}

/**
 * Handles a boot failure that's part of reuse, and returns whether it did:
 *
 * - For the current mount, another chat holding the namespace is reported
 *   through `onError` and the console, and the mount renders nothing.
 * - For a mount already gone, its own release or a namespace taken meanwhile
 *   needs no report: nobody is left to tell.
 *
 * Any other failure returns `false`, for the caller to log.
 */
export function handleBootFailure(
  error: unknown,
  mount: {
    current: boolean;
    signal: AbortSignal;
    config: Pick<PublicConfig, 'onError'>;
  }
): boolean {
  if (!mount.current) {
    return error === mount.signal.reason || error instanceof ChatNamespaceError;
  }
  return reportNamespaceError(error, mount.config);
}

/**
 * Reports a namespace another chat holds through `onError` and the console,
 * as a shell reports one (ADR-0003). Returns `false`, reporting nothing, for
 * any other error.
 */
export function reportNamespaceError(
  error: unknown,
  config: Pick<PublicConfig, 'onError'>
): boolean {
  if (!(error instanceof ChatNamespaceError)) {
    return false;
  }
  consoleError(error.message);
  callOnError(config.onError, {
    errorType: OnErrorType.INTEGRATION_ERROR,
    message: error.message,
  });
  return true;
}

/**
 * Hands a running chat to a new mount. Its config is replaced, the view's
 * half included, as an update would replace it. The mount gets its own
 * {@link ChatInstance}, which callbacks and events receive from now on. Its
 * view starts closed and opens to what was showing, as a remount with a
 * saved session does.
 */
async function adoptPrebuiltChat(
  serviceManager: ServiceManager,
  publicConfig: PublicConfig
) {
  await applyConfigChangesDynamically(
    serviceManager.store.getState().config.public as PublicConfig,
    publicConfig,
    serviceManager
  );
  serviceManager.instance = createPrebuiltInstance(serviceManager);
  serviceManager.store.dispatch(
    viewActions.startNewMount(createMountViewState(publicConfig))
  );
}

/**
 * Validates UploadConfig at startup so misconfiguration is surfaced early,
 * regardless of whether the main window is open.
 */
function warnAboutUploadConfig(serviceManager: ServiceManager) {
  const uploadConfig = serviceManager.store.getState().config.public.upload;
  if (uploadConfig?.isOn && !uploadConfig.onFileUpload) {
    consoleError(
      '[upload] UploadConfig.isOn is true but onFileUpload is not provided. ' +
        'File upload will be disabled. Please provide an onFileUpload handler in config.upload.'
    );
  }
  // onFileUpload with isOn off is valid: messaging.addFile attaches files from the host's own
  // control, and isOn only draws the attach button (#2351 O5).
}

/**
 * Builds the prebuilt chat's {@link ChatInstance}: the conversation members a
 * chat `createChatSDK` starts has, plus the members that drive the view.
 */
function createPrebuiltInstance(serviceManager: ServiceManager): ChatInstance {
  warnAboutUploadConfig(serviceManager);

  // Create the chat instance. Its conversation members are the ones a chat
  // `createChatSDK` starts has; the rest drive the view.
  const conversation = createConversationInstance(
    serviceManager,
    () => instance
  );
  const instance: ChatInstance = {
    ...conversation,

    // A reused chat outlives this mount; what it subscribed goes with it.
    ...mountSubscriptions(serviceManager.eventBus, () => instance),

    send: (message: MessageRequest | string, options?: SendOptions) => {
      debugLog('Called instance.send', message, options);
      return instance.messaging.send(message, options);
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

  return instance;
}

/**
 * Applies the first view transition after boot, deciding between restoring a
 * session or opening the default view. Keeps this sequencing in one place so
 * tests and callers can reason about what happens immediately after boot.
 * First, it names the slots an adopted chat missed; see
 * {@link nameSlotsMissedWithoutView}.
 */
export async function performInitialViewChange(serviceManager: ServiceManager) {
  nameSlotsMissedWithoutView(serviceManager);
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

/**
 * Per reusable chat, each message whose user-defined response last fired with
 * no slot, and the state that event carried.
 */
const slotlessMessages = new WeakMap<
  ServiceManager,
  Map<string, MessageState | undefined>
>();

/**
 * Notes each message whose user-defined response fired with no slot, which
 * happens while no view is attached: a released chat in its grace window.
 */
function collectSlotlessResponses(serviceManager: ServiceManager) {
  const missed = new Map<string, MessageState | undefined>();
  slotlessMessages.set(serviceManager, missed);
  serviceManager.eventBus.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: ({ data }: BusEventUserDefinedResponse) => {
      if (!data.slot && !data.message.user_defined?.silent) {
        missed.set(data.fullMessage.id, data.state);
      }
    },
  });
}

/**
 * Fires again, with a slot, the user-defined responses whose last event fired
 * while no view was attached, so this mount's handlers and extension hosts get
 * their current content and state. Only a chat adopted from its grace window
 * has any. It doesn't hold the first view change, and a handler that throws is
 * logged, as a slow or failing handler doesn't hold a fresh mount either.
 */
function nameSlotsMissedWithoutView(serviceManager: ServiceManager) {
  const missed = slotlessMessages.get(serviceManager);
  if (!missed?.size) {
    return;
  }
  refireSlotlessResponses(serviceManager, missed).catch((error) =>
    consoleError(
      'Failed to show the responses a reused chat got while it waited:',
      error
    )
  );
}

/**
 * Fires each missed message's user-defined items with the state it last had.
 * A message leaves the list once its items fired. If this mount is released
 * part way, the rest stay for the next one.
 */
async function refireSlotlessResponses(
  serviceManager: ServiceManager,
  missed: Map<string, MessageState | undefined>
) {
  const { instance } = serviceManager;
  for (const [messageID, state] of [...missed]) {
    if (serviceManager.instance !== instance) {
      return;
    }
    const { allMessageItemsByID, allMessagesByID } =
      serviceManager.store.getState();
    const message = allMessagesByID[messageID];
    const items = Object.values(allMessageItemsByID).filter(
      (local) =>
        local.fullMessageID === messageID &&
        renderAsUserDefinedMessage(local.item) &&
        !local.item.user_defined?.silent
    );
    for (const local of items) {
      await serviceManager.messageCoordinator.handleUserDefinedResponseItems(
        local,
        message,
        state
      );
    }
    refireUnnamedReasoning(serviceManager, messageID, message);
    missed.delete(messageID);
  }
}

/**
 * Fires again, through this mount's view, the user-defined items inside a
 * message's reasoning that fired with no view to name their slots.
 */
function refireUnnamedReasoning(
  serviceManager: ServiceManager,
  messageID: string,
  message: Message
) {
  const { messageCoordinator, userDefinedElementRegistry } = serviceManager;
  const isNamed = (itemID: string) => userDefinedElementRegistry.has(itemID);
  for (const local of Object.values(
    serviceManager.store.getState().allMessageItemsByID
  )) {
    if (
      local.fullMessageID === messageID &&
      messageCoordinator.forgetUnnamedReasoning(local.ui_state.id, isNamed)
    ) {
      messageCoordinator.notifyMountedReasoning(
        local.ui_state.id,
        message,
        new Set()
      );
    }
  }
}

export { dropSubscriptions };
