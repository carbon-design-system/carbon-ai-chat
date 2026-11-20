/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createChatSDK,
  type ChatSDKConfig,
  type ChatSDKHandle,
  type ChatSDKState,
} from '../../index';
import {
  MessageResponseTypes,
  type MessageResponse,
  type TextItem,
} from '../../../types/messaging/Messages';

export const FIXED_TIMESTAMP = 1700000000000;
let namespaceSequence = 0;

export async function withSDK(
  run: (handle: ChatSDKHandle) => Promise<void>,
  customSendMessage: NonNullable<
    ChatSDKConfig['messaging']
  >['customSendMessage'] = () => undefined,
  config: Omit<ChatSDKConfig, 'namespace' | 'messaging'> = {}
): Promise<void> {
  const handle = await createChatSDK({
    ...config,
    namespace: `sdk-public-contract-${++namespaceSequence}`,
    messaging: { skipWelcome: true, customSendMessage },
  });
  try {
    await run(handle);
  } finally {
    // These scenarios await every operation and use finite host callbacks.
    // destroy starts shutdown; its void return is not a shutdown barrier.
    handle.destroy();
  }
}

export function textResponse(
  id: string | undefined,
  text: string
): MessageResponse {
  return {
    ...(id === undefined ? {} : { id }),
    history: { timestamp: FIXED_TIMESTAMP },
    output: { generic: [{ response_type: MessageResponseTypes.TEXT, text }] },
  };
}

export function userDefinedResponse(id: string): MessageResponse {
  return {
    id,
    history: { timestamp: FIXED_TIMESTAMP },
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { value: 'before' },
        },
      ],
    },
  };
}

export function storedResponse(
  state: ChatSDKState,
  id: string
): MessageResponse {
  return state.messages.find((message) => message.id === id) as MessageResponse;
}

export function texts(message: MessageResponse): string[] {
  return message.output.generic
    .filter((item) => item.response_type === MessageResponseTypes.TEXT)
    .map((item) => (item as TextItem).text);
}
