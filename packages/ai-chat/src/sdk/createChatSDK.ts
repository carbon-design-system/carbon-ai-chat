/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import createHumanAgentService from '../shared/services/haa/HumanAgentServiceImpl';
import { createServiceManager } from '../shared/services/loadServices';
import { attachSlotTracking } from '../shared/services/slotTracking';
import { createConversationInstance } from '../shared/services/conversationInstance';
import type { ServiceManager } from '../shared/services/ServiceManager';
import type { ChatSDKConfig } from '../types/config/ChatSDKConfig';
import type { ChatInstance } from '../types/instance/ChatInstance';
import type { ChatSDKInstance } from '../types/instance/ChatSDKInstance';
import type { ConversationAppConfig } from '../types/state/ConversationState';
import { createHandle, type ChatSDKHandle } from './handle';
import { createSDKAppConfig } from './sdkAppConfig';

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
  createInstance?: (serviceManager: ServiceManager) => ChatInstance;
  /**
   * Runs once the chat's services exist, before the agent service and the
   * instance. The prebuilt chat attaches its view partition here.
   */
  onServicesCreated?: (serviceManager: ServiceManager) => void;
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
    // Slot records live as long as the chat, not a mount (#1741).
    attachSlotTracking(serviceManager);
    options.onServicesCreated?.(serviceManager);
    serviceManager.humanAgentService = createHumanAgentService(serviceManager);

    const conversation: ChatSDKInstance = createConversationInstance(
      serviceManager,
      () => conversation
    );
    serviceManager.instance =
      options.createInstance?.(serviceManager) ??
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

export { createChatSDK };
