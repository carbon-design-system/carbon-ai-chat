/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * How long a conversation outlives the code that started it. {@link LifecycleConfig} extends it
 * with the prebuilt chat's settings.
 *
 * A `createChatSDK` function that starts a conversation with no interface arrives with the
 * `@carbon/ai-chat/sdk` entry point in a 2.x minor release. Its chats always stay alive for this
 * window after they're released.
 *
 * @category SDK
 */
export interface ChatSDKLifecycleConfig {
  /**
   * How long a released chat stays alive, in milliseconds, so the next chat on its namespace can
   * pick up the running conversation. When the window runs out, the chat shuts down. Defaults to
   * 3000. Raise it when your app can take longer than that to mount the chat again, such as while
   * a slow route loads.
   *
   * It's read when the chat is released, so a config change before then counts. In the prebuilt
   * chat it applies only with {@link LifecycleConfig.reuseInstance} on.
   */
  releaseGraceMs?: number;
}
