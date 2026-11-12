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
import type { PublicChatState } from '../types/instance/PublicChatState';

/**
 * What `createChatSDK` hands back: the conversation, plus the verbs that end
 * its life. Callbacks receive the chat's instance, which has none of these
 * verbs, so code the chat calls into can't tear down the chat that called it.
 * Internal in 1.x (#1834).
 *
 * Once the handle is released, its members no longer reach the chat: those
 * that return a promise resolve, doing nothing, except one with a result,
 * such as `addFile`, which rejects. Once another handle destroys the chat,
 * they all reject. Either way, the rest do nothing, except `off`, and `state`
 * keeps its last value and notifies nobody.
 */
interface ChatSDKHandle extends ChatSDKInstance {
  /**
   * Drops this handle's hold on the conversation. The chat keeps running for
   * a grace window, 3000 ms by default, and a create on its namespace inside
   * the window gets it back. When the window runs out, the chat shuts down:
   * requests and uploads are cancelled, and a human agent conversation is
   * disconnected without ending it. Saved state stays, and no persistence
   * callback hears of it. Calling it again does nothing.
   */
  release(): void;

  /**
   * Ends the conversation for good, even if another handle holds it, and
   * nothing can get it back afterward. Shutdown starts now. A live human
   * agent conversation ends as `messaging.restartConversation()` ends one:
   * handlers see the end-of-chat events but can't cancel them. Saved session
   * state is cleared, or, when the host owns it, `onStateChange` gets the
   * cleared value once. A create on the namespace waits for all of it.
   * Calling it again does nothing.
   */
  destroy(): void;

  /**
   * Replaces the config rather than merging into it, so a field left out
   * returns to its default. Copies what it's given, as `createChatSDK` does.
   * Resolves once the change has been applied. Resolves doing nothing
   * once this handle is released or its chat has shut down.
   *
   * Rejects, changing nothing, if the new namespace already has a chat, or if
   * another handle destroyed the chat.
   */
  updateConfig(next: ChatSDKConfig): Promise<void>;
}

/**
 * What a member returns: a promise with no value, a promise with one, or
 * nothing. Derived from its type, so a wrong label fails to compile.
 */
type ReturnKind<F> = F extends (...args: never[]) => Promise<infer R>
  ? [R] extends [void]
    ? 'promise'
    : 'value'
  : 'nothing';

/** Each member's {@link ReturnKind}, which tells a stopped handle what to return. */
type Returns<T> = { [K in keyof T]: ReturnKind<T[K]> };

const MESSAGING_RETURNS: Returns<ChatSDKInstance['messaging']> = {
  send: 'promise',
  stop: 'promise',
  failTurn: 'promise',
  clearError: 'nothing',
  addFile: 'value',
  removeFile: 'nothing',
  upsertMessage: 'promise',
  removeMessages: 'promise',
  clearConversation: 'promise',
  insertHistory: 'promise',
  restartConversation: 'promise',
};

const SERVICE_DESK_RETURNS: Returns<ChatSDKInstance['serviceDesk']> = {
  startConversation: 'promise',
  stopScreenShare: 'promise',
  endConversation: 'promise',
  updateIsSuspended: 'promise',
};

/**
 * Why a handle no longer reaches its chat: it released it, or another handle
 * destroyed the chat.
 */
type Stopped = 'released' | 'destroyedElsewhere' | undefined;

const DESTROYED_MESSAGE =
  'Another handle destroyed this chat, so the call did nothing. Start a new chat.';

const RELEASED_MESSAGE =
  'This chat handle was released, so the call did nothing and has no result. Use the handle from the latest create on its namespace.';

/**
 * What a stopped handle's member returns instead of reaching the chat. A
 * released handle's promise resolves, unless the caller expects a value.
 */
function stoppedResult(
  stopped: Stopped,
  kind: 'promise' | 'value' | 'nothing'
) {
  if (kind === 'nothing') {
    return undefined;
  }
  if (stopped === 'released') {
    return kind === 'promise'
      ? Promise.resolve(undefined)
      : Promise.reject(new Error(RELEASED_MESSAGE));
  }
  return Promise.reject(new Error(DESTROYED_MESSAGE));
}

/** Copies `members` with each one checking `stopped` first. */
function guard<T extends object>(
  members: T,
  returns: Returns<T>,
  stopped: () => Stopped
): T {
  const guarded = {} as Record<keyof T, unknown>;
  (Object.keys(returns) as (keyof T & string)[]).forEach((key) => {
    const member = members[key] as (...args: unknown[]) => unknown;
    guarded[key] = (...args: unknown[]) => {
      const why = stopped();
      return why ? stoppedResult(why, returns[key]) : member(...args);
    };
  });
  return guarded as T;
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
  const { publicStateService } = serviceManager;
  let released = false;
  let destroyedHere = false;
  /** The value `state` keeps once this handle lets go of its chat. */
  let lastState: PublicChatState | undefined;
  /** This handle's `state` subscriptions, dropped when it lets go. */
  const unsubscribes = new Set<() => void>();

  /** Why this handle no longer reaches its chat, or `undefined` while it does. */
  const stopped = (): Stopped => {
    if (released) {
      return 'released';
    }
    // The handle that destroyed the chat still reaches it, as before: the
    // chat's own members do nothing, or reject, once it has shut down.
    return serviceManager.isDestroyed && !destroyedHere
      ? 'destroyedElsewhere'
      : undefined;
  };

  /** Keeps this handle's state as it is now, and stops its notifications. */
  const letGo = () => {
    lastState = publicStateService.get();
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    unsubscribes.clear();
  };

  const track = (subscribe: () => () => void) => {
    if (stopped()) {
      return () => {};
    }
    const unsubscribe = subscribe();
    unsubscribes.add(unsubscribe);
    return () => {
      unsubscribes.delete(unsubscribe);
      unsubscribe();
    };
  };

  const conversation = createConversationInstance(serviceManager, () => handle);
  const handle: ChatSDKHandle = {
    messaging: guard(conversation.messaging, MESSAGING_RETURNS, stopped),
    serviceDesk: guard(conversation.serviceDesk, SERVICE_DESK_RETURNS, stopped),
    state: {
      // A destroyed chat's store keeps its last value, so only a release
      // needs its own copy.
      get: () => lastState ?? publicStateService.get(),
      subscribe: (listener) =>
        track(() => publicStateService.subscribe(listener)),
      select: (selector, listener, options) =>
        track(() => publicStateService.select(selector, listener, options)),
    },
    on: (handlers) => (stopped() ? handle : conversation.on(handlers)),
    // Always reaches the bus, so a host can still remove what this handle
    // added before it let go.
    off: (handlers) => conversation.off(handlers),
    once: (handlers) => (stopped() ? handle : conversation.once(handlers)),
    release: () => {
      if (released || destroyedHere) {
        return;
      }
      released = true;
      letGo();
      if (claim) {
        claim.release();
      } else {
        void serviceManager.shutdown();
      }
    },
    destroy: () => {
      if (!stopped()) {
        destroyedHere = true;
      }
      void serviceManager.destroy();
      claim?.end();
    },
    updateConfig: async (next) => {
      const why = stopped();
      if (why) {
        return stoppedResult(why, 'promise');
      }
      // A chat that shut down takes no more config.
      if (serviceManager.isShutdown) {
        return undefined;
      }
      // First, so a collision rejects before anything applies.
      claim?.move(next.namespace);
      return applyConversationConfig(serviceManager, createSDKAppConfig(next));
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
