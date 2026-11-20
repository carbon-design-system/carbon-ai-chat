/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import createHumanAgentService from './services/haa/HumanAgentServiceImpl';
import { createServiceManager } from './services/loadServices';
import { attachSlotTracking } from './services/slotTracking';
import { createConversationInstance } from './services/conversationInstance';
import type { ServiceManager } from './services/ServiceManager';
import type { ChatSDKConfig } from '../types/config/ChatSDKConfig';
import type { ChatInstance } from '../types/instance/ChatInstance';
import type { ChatSDKInstance } from '../types/instance/ChatSDKInstance';
import type { ConversationAppConfig } from '../types/state/ConversationState';
import { createHandle, type ChatSDKHandle } from './handle';
import { createChatRegistry } from './registry';
import { createSDKAppConfig } from './sdkAppConfig';
import { applyConversationConfig } from './services/applyConfig';

/**
 * The page's chats that can be reused, one per namespace. Module state, so two
 * copies of the package on one page don't share it (ADR-0003).
 */
const chatRegistry = createChatRegistry<ServiceManager>();

/** The prebuilt chat's boot options. Internal; the SDK entry never takes them. */
interface ChatSDKBootOptions {
  /**
   * The config the store holds. The prebuilt chat passes
   * `{ public: PublicConfig }`; otherwise it's built from `config`.
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
  /**
   * Takes a claim on the namespace, so the chat outlives its handle for a
   * grace window and the next create on the namespace adopts it (ADR-0003).
   * The SDK entry always reuses. The prebuilt chat reuses only with
   * `lifecycle.reuseInstance` on; otherwise it never collides with another
   * chat.
   */
  reuse?: boolean;
  /**
   * With `reuse`, aborting it releases the claim, even while boot is still
   * running. The prebuilt chat aborts it when its mount goes away, so a
   * remount can adopt the chat that mount started. Already aborted, it rejects
   * with its reason and claims nothing.
   */
  signal?: AbortSignal;
  /**
   * With `signal`, read when it aborts: `true` destroys the chat instead of
   * releasing it, even while boot is still running, so nothing adopts it. The
   * create then rejects with the signal's reason. The prebuilt chat passes
   * `lifecycle.onUnmount: 'destroy'` here.
   */
  destroyOnAbort?: () => boolean;
  /**
   * With `reuse`, applies this create's config to a chat it adopts. Defaults
   * to replacing the conversation's config, as `updateConfig` does. The
   * prebuilt chat applies its view's half too, and gives the new mount its
   * own instance.
   */
  adopt?: (serviceManager: ServiceManager) => Promise<void>;
}

/** What `lifecycle.releaseGraceMs` says, for a chat or a config not yet in one. */
function releaseGraceMsOf(config: ConversationAppConfig) {
  return config.public.lifecycle?.releaseGraceMs;
}

/**
 * Starts a conversation with no interface. Takes no DOM element, touches no
 * DOM, and reads or writes no browser storage.
 *
 * With `reuse`, a create on a namespace whose chat was released less than a
 * grace window ago gets that chat back, with this config applied as a
 * replacement. A create on a namespace whose chat is still held rejects.
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
  if (!options.reuse) {
    return createHandle(await bootChat(config, options));
  }
  const { signal } = options;
  if (signal?.aborted) {
    throw signal.reason;
  }
  // Copied now: boot can wait for an old chat's shutdown, and adoption for
  // boot, and the host may change its object meanwhile.
  const appConfig = options.appConfig ?? createSDKAppConfig(config);
  // Set once the claim has its chat, which the grace reader prefers.
  const held: { chat?: ServiceManager } = {};
  /** Whether this create's own boot or adoption failed, which it reports. */
  let failed = false;
  const reporting = <T>(work: Promise<T>) =>
    work.catch((error) => {
      failed = true;
      throw error;
    });
  const claim = chatRegistry.claim(appConfig.public.namespace, {
    // A prebuilt chat has a view partition and session storage that a chat
    // with no view lacks, so neither adopts the other.
    kind: options.createInstance ? 'prebuilt' : 'sdk',
    boot: () => reporting(bootChat(config, { ...options, appConfig })),
    // A replacement, as `updateConfig` applies one.
    adopt: (serviceManager) =>
      reporting(
        options.adopt
          ? options.adopt(serviceManager)
          : applyConversationConfig(serviceManager, appConfig)
      ),
    // The chat's own config once it has one, so an update counts.
    releaseGraceMs: () =>
      releaseGraceMsOf(held.chat?.store.getState().config ?? appConfig),
  });
  /** Set when this create's abort destroyed the chat it claimed. */
  let destroyed = false;
  signal?.addEventListener(
    'abort',
    () => {
      if (options.destroyOnAbort?.()) {
        destroyed = true;
        claim.end();
      } else {
        claim.release();
      }
    },
    { once: true }
  );
  try {
    held.chat = await claim.chat;
  } catch (error) {
    // A claim this create's abort ended rejects as an abort before the claim
    // does. A failed boot or adoption still reports its own error.
    throw destroyed && !failed ? signal.reason : error;
  }
  return createHandle(held.chat, claim);
}

/** Builds a new chat, and shuts it down again if boot fails. */
async function bootChat(
  config: ChatSDKConfig,
  options: ChatSDKBootOptions
): Promise<ServiceManager> {
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
  return serviceManager;
}

export { createChatSDK, chatRegistry };
