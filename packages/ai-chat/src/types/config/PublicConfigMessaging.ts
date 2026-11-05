/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance } from '../instance/ChatInstance';
import type { ChatSDKConfigMessaging } from './ChatSDKConfigMessaging';

/**
 * Config options for controlling messaging. It extends {@link ChatSDKConfigMessaging} with the two
 * settings that control the prebuilt chat's loading indicator and stop button.
 *
 * @category Config
 */
export interface PublicConfigMessaging extends ChatSDKConfigMessaging<ChatInstance> {
  /**
   * Controls how long AI chat should wait before showing the loading indicator. If set to 0, the chat will never show
   * the loading indicator on its own. This is tied to either {@link ChatInstanceMessaging.addMessage} or
   * {@link ChatInstanceMessaging.addMessageChunk} being called after this message was sent. If neither of those methods
   * are called with in the window defined here, the loading indicator will be shown.
   */
  messageLoadingIndicatorTimeoutSecs?: number;

  /**
   * Controls when the stop streaming button becomes visible during message streaming.
   *
   * This setting is independent of how you deliver the response — it is applied when
   * `customSendMessage` is called, before either flow has started.
   *
   * Without it, the two flows reach the same result by their own route.
   * {@link ChatInstanceMessaging.addMessageChunk} shows the button on the first partial
   * chunk marked `cancellable`. {@link ChatInstanceMessaging.upsertMessage} shows it on
   * the first upsert recorded as {@link MessageState.STREAMING} whose message carries
   * `streaming_metadata.cancellable`, and hides it once that message reaches
   * {@link MessageState.COMPLETE} or {@link MessageState.ERROR}.
   *
   * You must have {@link PublicConfigMessaging.customSendMessage} return a promise for
   * this setting to work correctly.
   *
   * When `true`, the stop button appears immediately when `customSendMessage` is called,
   * allowing users to cancel requests before the first streaming chunk arrives. This is
   * useful for slow-starting requests or when you want to give users immediate control
   * over long-running operations. The button will remain visible as long as there is an
   * active streaming message, even if the initial message promise resolves.
   *
   * When `false` (default), the stop button only appears after the first streaming chunk
   * arrives with `cancellable: true` metadata, maintaining backward compatibility with
   * existing behavior.
   *
   */
  showStopButtonImmediately?: boolean;
}
