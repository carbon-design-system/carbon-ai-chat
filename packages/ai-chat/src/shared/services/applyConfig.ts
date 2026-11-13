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
 * - **The service desk** is rebuilt when the factory changed and the agent
 *   service had already started or is in a chat.
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

  // The factory is read from config when a desk is created, so a future chat
  // picks up the latest one with no work here. Only a desk already created
  // from the old factory needs rebuilding. The comparison is by reference, so
  // an inline factory changes on every host render; skipping an idle service
  // keeps that from churning.
  if (previous.serviceDeskFactory !== nextPublic.serviceDeskFactory) {
    const isActive =
      Boolean(serviceManager.humanAgentService) &&
      isHumanAgentChatActive(serviceManager);
    const wasInitialized = Boolean(
      serviceManager.humanAgentService?.hasInitialized
    );
    if (isActive || wasInitialized) {
      await replaceHumanAgentService(serviceManager, isActive, wasInitialized);
    }
  }
}

/**
 * Rebuilds the human-agent service for a new desk factory. A live chat ends
 * quietly first (mirrors a user-initiated end), so no connection is stranded
 * on the old service. The new service initializes only if the old one had,
 * so a swap keeps the prior started state.
 */
async function replaceHumanAgentService(
  serviceManager: ServiceManager,
  isActive: boolean,
  wasInitialized: boolean
) {
  try {
    if (isActive) {
      consoleDebug('Tearing down existing service desk');
      await serviceManager.humanAgentService.endChat(true, true, false);
    }
    // A chat that shut down during that wait keeps its disconnected service.
    if (serviceManager.isShutdown) {
      return;
    }

    consoleDebug('Recreating human agent service');
    serviceManager.humanAgentService = createHumanAgentService(serviceManager);

    if (wasInitialized) {
      consoleDebug('Human agent service restarting');
      await serviceManager.humanAgentService.initialize();
    }
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
