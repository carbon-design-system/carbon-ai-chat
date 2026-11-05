/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Saves state outside the chat and restores it on the next start. Store the value
 * {@link ChatSDKPersistedStateConfig.onStateChange} receives, and pass the last one back as
 * {@link ChatSDKPersistedStateConfig.initialState}. {@link PersistedStateConfig} uses it for the
 * prebuilt chat's whole session, and {@link ChatSDKConfig.humanAgentState} uses it for the human agent
 * connection alone.
 *
 * A `createChatSDK` function that starts a conversation with no interface arrives with the
 * `@carbon/ai-chat/sdk` entry point in 2.0.0.
 *
 * @typeParam S The state that is saved and restored.
 * @category SDK
 */
export interface ChatSDKPersistedStateConfig<S> {
  /**
   * The saved state to start from. When omitted, the chat starts fresh.
   */
  initialState?: S;

  /**
   * Called with the complete state whenever it changes. Store it so it can later seed
   * {@link ChatSDKPersistedStateConfig.initialState}.
   */
  onStateChange?: (state: S) => void;
}
