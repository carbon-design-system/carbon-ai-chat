/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createConversationInstance } from './services/conversationInstance';
import { applyConversationConfig } from './services/applyConfig';
import type { ServiceManager } from './services/ServiceManager';
import type { ChatClaim } from './registry';
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
   * Drops this handle's hold on the conversation. The chat keeps running for
   * a grace window, 3000 ms by default, and a create on its namespace inside
   * the window gets it back. When the window runs out, the chat shuts down:
   * requests and uploads are cancelled, and a human agent conversation is
   * disconnected without ending it. Calling it again does nothing.
   */
  release(): void;

  /**
   * Shuts the chat down now, even if another handle holds it, and nothing can
   * get it back afterward. A create on the namespace waits for the shutdown.
   * It doesn't yet end a human agent conversation or clear saved state.
   * Calling it again does nothing.
   */
  destroy(): void;

  /**
   * Replaces the config rather than merging into it, so a field left out
   * returns to its default. Copies what it's given, as `createChatSDK` does.
   * Resolves once the change has been applied (#1833). Does nothing once
   * this handle is released.
   *
   * Rejects, changing nothing, if the new namespace already has a chat.
   */
  updateConfig(next: ChatSDKConfig): Promise<void>;
}

/** The chat behind each handle, for the prebuilt chat and tests. */
const chats = new WeakMap<ChatSDKHandle, ServiceManager>();

/** Each handle's registry claim, for the prebuilt chat's namespace changes. */
const claims = new WeakMap<ChatSDKHandle, ChatClaim<ServiceManager>>();

/**
 * Wraps a chat in a handle. With a registry claim, the handle is the claim
 * (ADR-0003). Without one, as for the prebuilt chat, releasing shuts the chat
 * down at once.
 */
function createHandle(
  serviceManager: ServiceManager,
  claim?: ChatClaim<ServiceManager>
): ChatSDKHandle {
  let released = false;
  const handle: ChatSDKHandle = {
    ...createConversationInstance(serviceManager, () => handle),
    release: () => {
      released = true;
      if (claim) {
        claim.release();
      } else {
        void serviceManager.shutdown();
      }
    },
    destroy: () => {
      void serviceManager.shutdown();
      claim?.end();
    },
    updateConfig: async (next) => {
      // A chat that shut down takes no more config, and a handle that let go
      // of its chat no longer configures it.
      if (serviceManager.isShutdown || released) {
        return;
      }
      // First, so a collision rejects before anything applies.
      claim?.move(next.namespace);
      await applyConversationConfig(serviceManager, createSDKAppConfig(next));
    },
  };
  chats.set(handle, serviceManager);
  if (claim) {
    claims.set(handle, claim);
  }
  return handle;
}

/**
 * The service manager behind a handle, or `undefined` for anything else.
 * Internal: never exported from an entry.
 */
function chatOf(handle: ChatSDKHandle): ServiceManager | undefined {
  return chats.get(handle);
}

/**
 * The registry claim behind a handle, or `undefined` for a chat that doesn't
 * reuse. Internal: never exported from an entry.
 */
function claimOf(handle: ChatSDKHandle): ChatClaim<ServiceManager> | undefined {
  return claims.get(handle);
}

export { createHandle, chatOf, claimOf };
export type { ChatSDKHandle };
