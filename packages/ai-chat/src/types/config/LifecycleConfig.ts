/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKLifecycleConfig } from './ChatSDKLifecycleConfig';

/**
 * How long the chat's conversation outlives the element that shows it. It extends
 * {@link ChatSDKLifecycleConfig} with `reuseInstance`, which turns reuse on, and `onUnmount`, which
 * chooses whether removing the chat keeps its conversation or ends it.
 *
 * With reuse on, removing the chat from the page releases it rather than shutting it down. It keeps
 * running for {@link ChatSDKLifecycleConfig.releaseGraceMs}, and a chat mounted on the same
 * namespace inside that window picks up the running conversation, with its transcript and any live
 * human agent conversation. Nothing tells your code which one it got. To seed a
 * welcome message once, check `instance.state.get().messages.length` rather than counting mounts.
 *
 * A web component takes it through its `lifecycle` property, or as a JSON `lifecycle` attribute.
 *
 * @example Keep the conversation through a remount
 * ```tsx
 * <ChatContainer
 *   namespace="support"
 *   lifecycle={{ reuseInstance: true }}
 *   messaging={{ customSendMessage }}
 * />
 * ```
 *
 * @category Config
 */
export interface LifecycleConfig extends ChatSDKLifecycleConfig {
  /**
   * Keeps the conversation alive across a remount. Defaults to `false`, so each mount starts a new
   * chat and removing it shuts its chat down at once.
   *
   * With it on, the chat's namespace identifies it: two chats on screen with the same namespace,
   * or both with none, are an error. The second one doesn't render, and reports the error
   * through `onError` and the console. Give each chat its own namespace.
   *
   * It's read when the chat starts, so changing it takes effect at the next mount. In 2.0.0
   * every chat reuses, and this setting is removed.
   */
  reuseInstance?: boolean;

  /**
   * What removing the chat from the page does when {@link LifecycleConfig.reuseInstance} is on.
   * `'release'`, the default, keeps the conversation alive for the grace window, so a remount picks
   * it up. `'destroy'` ends it for good: a live human agent conversation ends, saved session state
   * is cleared, and the next mount starts a new chat once that end finishes. When your app owns
   * that storage through {@link PublicConfig.persistedState}, its `onStateChange` gets the cleared
   * value instead. Use `'destroy'` where a remount must start fresh, such as on logout.
   *
   * It's read when the chat is removed, so a config change before then counts. With
   * `reuseInstance` off, removing the chat always shuts it down and keeps saved session state, so
   * this setting does nothing.
   *
   * @example Start a new chat for each user
   * ```tsx
   * <ChatContainer
   *   key={user.id}
   *   namespace="support"
   *   lifecycle={{ reuseInstance: true, onUnmount: 'destroy' }}
   *   messaging={{ customSendMessage }}
   * />
   * ```
   */
  onUnmount?: 'release' | 'destroy';
}
