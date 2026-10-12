/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Gate assistant sends with the public chat state.
 * Start at isSendBlocked; the host also tracks its own pending send.
 * Public state does not expose all built-in disabled or stop-streaming states.
 */
import type { PublicChatState } from '@carbon/ai-chat';

export function isSendBlocked(state: PublicChatState) {
  return (
    state.isHydratingCounter > 0 ||
    state.isMessageLoadingCounter > 0 ||
    state.input.hasInFlightUploads ||
    state.humanAgent.isConnecting ||
    state.humanAgent.isConnected
  );
}
