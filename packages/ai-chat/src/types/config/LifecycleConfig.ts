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
 * {@link ChatSDKLifecycleConfig} with `reuseInstance`, which turns reuse on.
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
}
