/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createConversationInstance } from '../shared/services/conversationInstance';
import { applyConversationConfig } from '../shared/services/applyConfig';
import type { ServiceManager } from '../shared/services/ServiceManager';
import type { ChatSDKConfig } from '../types/config/ChatSDKConfig';
import { createSDKAppConfig } from './sdkAppConfig';
import type { ChatSDKInstance } from '../types/instance/ChatSDKInstance';

/**
 * What `createChatSDK` hands back: the conversation, plus the verbs that end
 * its life. Callbacks receive the chat's instance, which has none of these
 * verbs, so code the chat calls into can't tear down the chat that called it.
 * Internal in 1.x (#1834).
 */
interface ChatSDKHandle extends ChatSDKInstance {
  /**
   * Drops this handle's hold on the conversation. In 1.x nothing else can
   * hold it, so the chat shuts down at once: requests and uploads are
   * cancelled, and a human agent conversation is disconnected without ending
   * it. Calling it again does nothing.
   */
  release(): void;

  /**
   * Ends the conversation now. In 1.x it shuts the chat down the same way
   * {@link ChatSDKHandle.release} does; ending a human agent conversation and
   * clearing saved state come with #2358. Calling it again does nothing.
   */
  destroy(): void;

  /**
   * Replaces the config rather than merging into it, so a field left out
   * returns to its default. Copies what it's given, as `createChatSDK` does.
   * Resolves once the change has been applied (#1833).
   */
  updateConfig(next: ChatSDKConfig): Promise<void>;
}

/** The chat behind each handle, for the prebuilt chat and tests. */
const chats = new WeakMap<ChatSDKHandle, ServiceManager>();

function createHandle(serviceManager: ServiceManager): ChatSDKHandle {
  const shutdown = () => {
    void serviceManager.shutdown();
  };
  const handle: ChatSDKHandle = {
    ...createConversationInstance(serviceManager, () => handle),
    release: shutdown,
    destroy: shutdown,
    updateConfig: (next) =>
      applyConversationConfig(serviceManager, {
        ...createSDKAppConfig(next),
        // Derived values come from the view, which an SDK chat has none of.
        derived: serviceManager.store.getState().config.derived,
      }),
  };
  chats.set(handle, serviceManager);
  return handle;
}

/**
 * The service manager behind a handle, or `undefined` for anything else.
 * Internal: never exported from an entry.
 */
function chatOf(handle: ChatSDKHandle): ServiceManager | undefined {
  return chats.get(handle);
}

export { createHandle, chatOf };
export type { ChatSDKHandle };
