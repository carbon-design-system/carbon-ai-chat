/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from 'lodash-es/isEqual.js';

import actions from '../store/actions';
import { buildLanguagePack } from '../store/doCreateStore';
import type { ConversationAppConfig } from '../../types/state/ConversationState';
import { consoleDebug, consoleError } from '../utils/miscUtils';
import { reconcileAppConfigReferences } from '../utils/reconcileConfig';
import createHumanAgentService from './haa/HumanAgentServiceImpl';
import { messageTimeoutMS } from './messaging/MessageCoordinator';
import { NamespaceService } from './NamespaceService';
import type { ServiceManager } from './ServiceManager';

/**
 * Applies a replaced config to a running chat, without rebooting it. It is the
 * one update path: `ChatSDKHandle.updateConfig` calls it, and so does the
 * prebuilt chat when its host's config changes, before the view's own steps
 * (#1833 O4).
 *
 * The steps before the service desk's run before this returns its promise, so
 * a caller's next statement sees the new config in the store. The promise
 * resolves once the service desk step is done too.
 *
 * - **The config replace** writes `next` into the store. Sub-objects that
 *   didn't change keep their previous references, so a one-field change
 *   doesn't re-render every config reader (O9).
 * - **The language pack** is rebuilt only when `strings` changed.
 * - **The namespace and message timeout** live on services, outside the
 *   store, so they're pushed to them. A timeout left out returns to its
 *   default.
 * - **The service desk** follows a changed factory, but never during a live
 *   agent chat: see {@link syncServiceDeskFactory}.
 *
 * @param serviceManager - The running chat.
 * @param next - The whole config it should now have.
 * @param afterReplace - Runs right after the config and language pack are
 *   written, before the service steps. The prebuilt chat's view steps go here.
 */
async function applyConversationConfig(
  serviceManager: ServiceManager,
  next: ConversationAppConfig,
  afterReplace?: () => void
): Promise<void> {
  const { store } = serviceManager;
  const current = store.getState();
  const previous = current.config.public;
  const nextPublic = next.public;

  const reconciled = reconcileAppConfigReferences(current.config, next);
  // An unchanged config keeps its reference; skip the no-op replace so no
  // subscriber reruns.
  if (reconciled !== current.config) {
    store.dispatch(actions.changeState({ config: reconciled }));
  }

  // The language pack lives in its own slice, so the replace doesn't reach
  // it. Rebuild it only when `strings` changed, from the defaults, so a
  // removed key reverts; an unrelated update must not clobber strings set
  // through the separate `strings` prop. The `refreshLocalizationOnChange`
  // subscription rebuilds the formatter from it.
  if (!isEqual(previous.strings, nextPublic.strings)) {
    const nextLanguagePack = buildLanguagePack(nextPublic.strings);
    if (!isEqual(current.languagePack, nextLanguagePack)) {
      store.dispatch(
        actions.setAppStateValue('languagePack', nextLanguagePack)
      );
    }
  }

  // The prebuilt chat's view steps that read the new config run here, before
  // the namespace moves the saved session.
  afterReplace?.();

  // The namespace is baked into the session-storage key, which
  // UserSessionStorageService reads from `serviceManager.namespace` on each
  // access, so the session follows the new namespace.
  if (previous.namespace !== nextPublic.namespace) {
    serviceManager.namespace = new NamespaceService(nextPublic.namespace);
  }

  // Resolved the way boot resolves it, so a timeout left out returns to its
  // default and `0` turns it off, as an update replaces the config (O2).
  if (
    previous.messaging?.messageTimeoutSecs !==
      nextPublic.messaging?.messageTimeoutSecs &&
    serviceManager.messageCoordinator
  ) {
    serviceManager.messageCoordinator.timeoutMS = messageTimeoutMS(nextPublic);
  }

  // A new desk factory never cuts a live agent chat (#2353).
  if (previous.serviceDeskFactory !== nextPublic.serviceDeskFactory) {
    await syncServiceDeskFactory(serviceManager);
  }
}

/** Chats waiting for their agent chat to end before taking a new factory. */
const waitingForAgentChatEnd = new WeakSet<ServiceManager>();

/**
 * Moves the agent service to the factory in the config, by the rule in
 * #2353:
 *
 * - A service that never started needs nothing: it reads the factory from
 *   config when it creates its desk, so the next chat uses the new one.
 * - While an agent chat is connected or connecting, the running desk stays.
 *   Once that chat ends, this runs again and switches. A host that wants to
 *   switch now calls `serviceDesk.endConversation()` first.
 * - Otherwise a service whose desk came from another factory is rebuilt, and
 *   initializes again so it keeps its started state.
 *
 * A factory removed during an agent chat waits the same way.
 */
async function syncServiceDeskFactory(serviceManager: ServiceManager) {
  const service = serviceManager.humanAgentService;
  if (!service?.hasInitialized) {
    return;
  }
  if (isHumanAgentChatActive(serviceManager)) {
    waitForAgentChatEnd(serviceManager);
    return;
  }
  const { serviceDeskFactory } = serviceManager.store.getState().config.public;
  if (service.serviceDeskFactory === serviceDeskFactory) {
    return;
  }
  await replaceHumanAgentService(serviceManager);
}

/** Runs {@link syncServiceDeskFactory} again once no agent chat is live. */
function waitForAgentChatEnd(serviceManager: ServiceManager) {
  if (waitingForAgentChatEnd.has(serviceManager)) {
    return;
  }
  waitingForAgentChatEnd.add(serviceManager);
  const unsubscribe = serviceManager.store.subscribe(() => {
    if (isHumanAgentChatActive(serviceManager)) {
      return;
    }
    unsubscribe();
    waitingForAgentChatEnd.delete(serviceManager);
    syncServiceDeskFactory(serviceManager).catch((error) =>
      consoleError('Failed to switch to the new service desk factory:', error)
    );
  });
}

/**
 * Rebuilds an idle, initialized human-agent service for a new desk factory,
 * and initializes the new one, so a swap keeps the started state.
 */
async function replaceHumanAgentService(serviceManager: ServiceManager) {
  // A chat that shut down keeps its disconnected service.
  if (serviceManager.isShutdown) {
    return;
  }
  try {
    consoleDebug('Recreating human agent service');
    serviceManager.humanAgentService = createHumanAgentService(serviceManager);
    consoleDebug('Human agent service restarting');
    await serviceManager.humanAgentService.initialize();
  } catch (error) {
    // Surface failure to the caller, which decides on any fallback.
    consoleError('Failed to update human agent service dynamically:', error);
    throw error;
  }
}

/** True if a human agent chat is connected or connecting. */
function isHumanAgentChatActive(serviceManager: ServiceManager): boolean {
  const { humanAgent } = serviceManager.instance.state.get();
  return humanAgent.isConnected || humanAgent.isConnecting;
}

export { applyConversationConfig };
