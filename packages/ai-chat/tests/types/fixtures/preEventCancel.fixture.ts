/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Compiled under `strict: true` by sdkTypes_spec.ts and never run. A handler cancels the action a
 * `pre:` event comes before through one optional `cancel` flag. `pre:send` has no flag in 1.x, and
 * payloads written against the older types, with no `cancel`, still compile.
 */

import {
  BusEventType,
  type BusEventHumanAgentPreEndChat,
  type BusEventHumanAgentPreReceive,
  type BusEventHumanAgentPreSend,
  type BusEventHumanAgentPreStartChat,
  type BusEventPreReceive,
  type BusEventPreReset,
  type BusEventPreSend,
  type BusEventViewPreChange,
} from '../../../src/aiChatEntry';

/** One confirm step fits every event that takes the shared flag. */
async function confirmFirst(event: { cancel?: boolean }) {
  await Promise.resolve();
  event.cancel = true;
}

export function cancelEach(
  receive: BusEventPreReceive,
  restart: BusEventPreReset,
  agentReceive: BusEventHumanAgentPreReceive,
  agentSend: BusEventHumanAgentPreSend,
  view: BusEventViewPreChange,
  start: BusEventHumanAgentPreStartChat,
  end: BusEventHumanAgentPreEndChat
) {
  return Promise.all(
    [receive, restart, agentReceive, agentSend, view, start, end].map(
      confirmFirst
    )
  );
}

export function cannotCancelSend(event: BusEventPreSend) {
  // @ts-expect-error pre:send can't be canceled in 1.x.
  event.cancel = true;
}

export const olderPreReset: BusEventPreReset = {
  type: BusEventType.PRE_RESTART_CONVERSATION,
};

export const olderPreEndChat: BusEventHumanAgentPreEndChat = {
  type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
  endedByHumanAgent: false,
  preEndChatPayload: null,
  cancelEndChat: false,
};
