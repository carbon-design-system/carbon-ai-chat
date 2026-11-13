/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type {
  Message,
  MessageRequest,
  MessageResponse,
} from '../../../../types/messaging/Messages';

/** The conversation's messages in order, as the store holds them. */
interface TurnMessages {
  messageIDs: readonly string[];
  messagesByID: Readonly<Record<string, Message>>;
}

function isRequestMessage(message: Message): message is MessageRequest {
  return (message as MessageRequest)?.input !== undefined;
}

/** A message sent to, or written by, a human agent. Those turns belong to the agent service. */
function isAgentMessageData(message: Message) {
  if (isRequestMessage(message)) {
    return Boolean(message.input.agent_message_type);
  }
  return Boolean(
    (message as MessageResponse)?.output?.generic?.some(
      (item) => item?.agent_message_type
    )
  );
}

/**
 * The request whose turn `messageID` belongs to. A request names itself. A response names its
 * `request_id`, else `recordedOwner` (the request the chat saw it stream for), else the nearest
 * request before it. `undefined` when no message has that ID.
 */
function turnRequestID(
  messageID: string,
  { messageIDs, messagesByID }: TurnMessages,
  recordedOwner?: string
) {
  const message = messagesByID[messageID];
  if (!message) {
    return undefined;
  }
  if (isRequestMessage(message)) {
    return message.id;
  }
  const owner = (message as MessageResponse).request_id ?? recordedOwner;
  if (owner) {
    return owner;
  }
  for (let index = messageIDs.indexOf(messageID) - 1; index >= 0; index--) {
    const earlier = messagesByID[messageIDs[index]];
    if (isRequestMessage(earlier)) {
      return earlier.id;
    }
  }
  return undefined;
}

/** The last request that isn't waiting in the queue, or `undefined`. It may be to a human agent. */
function lastTurnRequestID(
  { messageIDs, messagesByID }: TurnMessages,
  waiting: ReadonlySet<string>
) {
  for (let index = messageIDs.length - 1; index >= 0; index--) {
    const message = messagesByID[messageIDs[index]];
    if (isRequestMessage(message) && !waiting.has(message.id)) {
      return message.id;
    }
  }
  return undefined;
}

/** Whether the turn has a response: a message after its request and before the next request. */
function turnHasResponse(
  requestID: string,
  { messageIDs, messagesByID }: TurnMessages
) {
  for (
    let index = messageIDs.indexOf(requestID) + 1;
    index > 0 && index < messageIDs.length;
    index++
  ) {
    const message = messagesByID[messageIDs[index]];
    if (isRequestMessage(message)) {
      return false;
    }
    if (message) {
      return true;
    }
  }
  return false;
}

/** Whether `messageID` names a message sent to, or written by, a human agent. */
function isAgentMessage(messageID: string, { messagesByID }: TurnMessages) {
  const message = messagesByID[messageID];
  return Boolean(message) && isAgentMessageData(message);
}

export { isAgentMessage, lastTurnRequestID, turnHasResponse, turnRequestID };
