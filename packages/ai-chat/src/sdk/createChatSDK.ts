/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import merge from 'lodash-es/merge.js';

import createHumanAgentService from '../shared/services/haa/HumanAgentServiceImpl';
import { createServiceManager } from '../shared/services/loadServices';
import { createConversationInstance } from '../shared/services/conversationInstance';
import type { ServiceManager } from '../shared/services/ServiceManager';
import { DEFAULT_THEME_STATE } from '../shared/store/reducerUtils';
import type { ChatSDKConfig } from '../types/config/ChatSDKConfig';
import type { ChatInstance } from '../types/instance/ChatInstance';
import type { ChatSDKInstance } from '../types/instance/ChatSDKInstance';
import type {
  ConversationAppConfig,
  ConversationConfig,
} from '../types/state/ConversationState';
import { createHandle, type ChatSDKHandle } from './handle';

/**
 * The config a chat starts from. The conversation reads `messaging` and
 * `serviceDesk` without checking them, so both always exist. The config is
 * merged into it field by field, and each service applies its own default for
 * a field left out, such as the message timeout.
 */
const DEFAULT_SDK_CONFIG: ChatSDKConfig = {
  messaging: {},
  serviceDesk: {},
};

/** The prebuilt chat's boot options. Internal; the SDK entry never takes them. */
interface ChatSDKBootOptions {
  /**
   * The config the store holds. The prebuilt chat passes its whole `AppConfig`,
   * with the view's derived values; otherwise it's built from `config`.
   */
  appConfig?: ConversationAppConfig;
  /** Saves and restores the session in browser session storage. */
  sessionStorage?: boolean;
  /**
   * Loads history and the welcome message before resolving. The prebuilt chat
   * passes `false`: it loads them when its main window first opens.
   */
  loadHistory?: boolean;
  /**
   * Builds the instance that callbacks and events receive from the
   * conversation's members. The prebuilt chat adds its view members here.
   */
  createInstance?: (
    conversation: ChatSDKInstance,
    serviceManager: ServiceManager
  ) => ChatInstance;
}

/** Builds the config the store holds for a chat with no view. */
function createSDKAppConfig(config: ChatSDKConfig): ConversationAppConfig {
  return {
    // The SDK's callbacks take `ChatSDKInstance`; the conversation code that
    // calls them passes the chat's instance, which is one.
    public: merge({}, DEFAULT_SDK_CONFIG, config) as ConversationConfig,
    derived: { themeWithDefaults: DEFAULT_THEME_STATE },
  };
}

/**
 * Starts a conversation with no interface. Takes no DOM element, touches no
 * DOM, and reads or writes no browser storage.
 *
 * Resolves once services are built and history has loaded; rejects, after
 * shutting the chat down, if either fails. Internal in 1.x: `@carbon/ai-chat/sdk`
 * publishes it in a 2.x minor release (#1834).
 *
 * @param config - The chat's config.
 * @param options - The prebuilt chat's boot options. Internal.
 */
async function createChatSDK(
  config: ChatSDKConfig = {},
  options: ChatSDKBootOptions = {}
): Promise<ChatSDKHandle> {
  let serviceManager: ServiceManager | undefined;
  try {
    const appConfig = options.appConfig ?? createSDKAppConfig(config);
    serviceManager = createServiceManager(appConfig, {
      sessionStorage: options.sessionStorage ?? false,
    });
    serviceManager.humanAgentService = createHumanAgentService(serviceManager);

    const conversation: ChatSDKInstance = createConversationInstance(
      serviceManager,
      () => conversation
    );
    serviceManager.instance =
      options.createInstance?.(conversation, serviceManager) ??
      (conversation as ChatInstance);
    serviceManager.messageCoordinator.onInstanceReady();

    if (options.loadHistory ?? true) {
      serviceManager.hydrationService.loadsWithoutView = true;
      const failure = await serviceManager.hydrationService.hydrateChat();
      if (failure) {
        throw failure.error;
      }
    }
  } catch (error) {
    await serviceManager?.shutdown();
    throw error;
  }
  return createHandle(serviceManager);
}

export { createChatSDK, DEFAULT_SDK_CONFIG };
