/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Builders for the responses and stream chunks a test hands the chat, and
 * readers for what the chat stored.
 */

import { act } from '@testing-library/react';

import {
  ChatInstanceMessaging,
  CompleteItemChunk,
  FinalResponseChunk,
  GenericItem,
  ItemStreamingMetadata,
  MessageResponse,
  MessageResponseTypes,
  MessageState,
  PartialItemChunk,
  StreamChunk,
} from '../../../src/aiChatEntry';
import { outputTexts, textResponse } from './backend';
import { ContractDriver } from './driver';

/**
 * The `OnErrorData.message` the chat reports when `customSendMessage` fails.
 * `main`'s text, from `OutboundMessageCoordinator.ts:127`.
 */
export const SEND_ERROR_MESSAGE = 'An error occurred sending a message';

/** A response with these items. */
export function responseOf(
  id: string,
  generic: GenericItem[]
): MessageResponse {
  return { id, output: { generic } };
}

/** A text item, with a streaming ID when `itemID` is given. */
export function textItem(text: string, itemID?: string): GenericItem {
  return {
    response_type: MessageResponseTypes.TEXT,
    text,
    ...(itemID ? { streaming_metadata: { id: itemID } } : {}),
  } as GenericItem;
}

/** A user_defined item, with a streaming ID. */
export function userDefinedItem(
  itemID: string,
  userDefined: Record<string, unknown>
): GenericItem {
  return {
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: userDefined,
    streaming_metadata: { id: itemID },
  } as GenericItem;
}

/** A text `partial_item` chunk. Leave `itemID` out for an item with no ID. */
export function partialText(
  responseID: string,
  itemID: string | undefined,
  text: string,
  metadata: Partial<ItemStreamingMetadata> = {}
): PartialItemChunk {
  return {
    streaming_metadata: { response_id: responseID },
    partial_item: {
      response_type: MessageResponseTypes.TEXT,
      text,
      ...(itemID ? { streaming_metadata: { id: itemID, ...metadata } } : {}),
    },
  };
}

/** A text `complete_item` chunk. */
export function completeText(
  responseID: string,
  itemID: string,
  text: string,
  metadata: Partial<ItemStreamingMetadata> = {}
): CompleteItemChunk {
  return {
    streaming_metadata: { response_id: responseID },
    complete_item: {
      response_type: MessageResponseTypes.TEXT,
      text,
      streaming_metadata: { id: itemID, ...metadata },
    },
  };
}

/** A user_defined `partial_item` chunk. */
export function partialUserDefined(
  responseID: string,
  itemID: string,
  userDefined: Record<string, unknown>
): PartialItemChunk {
  return {
    streaming_metadata: { response_id: responseID },
    partial_item: userDefinedItem(itemID, userDefined),
  };
}

/** A `final_response` chunk with these items. */
export function finalChunk(
  responseID: string,
  generic: GenericItem[],
  extra: Partial<MessageResponse> = {}
): FinalResponseChunk {
  return { final_response: { id: responseID, output: { generic }, ...extra } };
}

/** Adds a stream chunk inside `act` and waits for it to settle. */
export async function addChunk(
  chat: { messaging: ChatInstanceMessaging },
  chunk: StreamChunk
): Promise<void> {
  await act(async () => {
    await chat.messaging.addMessageChunk(chunk);
  });
}

/** Upserts `text` as the whole of message `id`, inside `act`. */
export function upsertText(
  chat: { messaging: ChatInstanceMessaging },
  id: string,
  state: MessageState,
  text: string
): Promise<void> {
  return act(() =>
    chat.messaging.upsertMessage(id, state, () => textResponse(text, id))
  );
}

/** The ID of each stored message, oldest first. */
export function ids(chat: Pick<ContractDriver, 'messages'>): string[] {
  return chat.messages().map(({ id }) => id);
}

/** The text items of one stored message, or `undefined` if it isn't there. */
export function textsOf(
  chat: Pick<ContractDriver, 'messages'>,
  messageID: string
): string[] | undefined {
  const message = chat.messages().find((value) => value.id === messageID);
  return message ? outputTexts(message as MessageResponse) : undefined;
}
