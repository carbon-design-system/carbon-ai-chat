/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { attachMountView, type MountView } from '../../utils/attachMountView';
import { bootPrebuiltChat, mergePublicConfig } from '../../utils/chatBoot';
import { chatStore } from '../../services/attachChatView';
import type { PublicConfig } from '../../../types/config/PublicConfig';
import type { ChatInstance } from '../../../types/instance/ChatInstance';
import type { AppStore } from '../../../sdk/store/appStore';
import type { AppState } from '../../../types/state/AppState';
import type { ServiceManager } from '../../../sdk/services/ServiceManager';

/** A prebuilt chat booted without React, and its view when attached. */
export interface BootedChat {
  instance: ChatInstance;
  store: AppStore<AppState>;
  serviceManager: ServiceManager;
  /** The view's ports, when booted with `attach`. */
  view?: MountView;
}

const live = new Set<BootedChat>();

/**
 * Boots the prebuilt chat through the container's boot, but renders nothing.
 * The chat has the full 1.x `ChatInstance` and its view partition.
 *
 * It skips the container's later steps: the host's `onBeforeRender`, the
 * boot-time app config (`applyBootConfig`, including the markdown config),
 * `performInitialViewChange` (slot naming and the load's view change), and
 * marking the initial view change complete. A test of any of those renders
 * the chat instead.
 *
 * With `attach`, it also attaches a view: the view state, its ports and the
 * extension hosts, as the container does before it renders. Without one, the
 * chat runs headless.
 *
 * Call {@link shutdownBootedChats} after each test.
 */
export async function bootChat(
  config: Partial<PublicConfig>,
  { attach = false }: { attach?: boolean } = {}
): Promise<BootedChat> {
  const { instance, serviceManager } = await bootPrebuiltChat({
    publicConfig: mergePublicConfig(config),
  });
  const chat: BootedChat = {
    instance,
    serviceManager,
    store: chatStore(serviceManager),
  };
  live.add(chat);
  if (attach) {
    chat.view = attachMountView({
      serviceManager,
      chatElement: document.createElement('div'),
      renderTarget: document.createElement('div'),
      isRequestFooterEnabled: () => false,
    });
  }
  return chat;
}

/**
 * Detaches each booted chat's view and shuts the chat down. A failure in one
 * chat doesn't stop the others; the first error is rethrown at the end.
 */
export async function shutdownBootedChats() {
  const chats = [...live];
  live.clear();
  const errors: unknown[] = [];
  for (const chat of chats) {
    try {
      chat.view?.detach();
      await chat.serviceManager.shutdown();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) {
    throw errors[0];
  }
}
