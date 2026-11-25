/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Compiled under `strict: true` by sdkTypes_spec.ts and never run. Fields added to state and to the
 * objects hosts receive are optional in 1.x, so a host's object written against the older types,
 * with none of them, still compiles. 2.0.0 makes the state fields required.
 */

import {
  MessageResponseTypes,
  OnErrorType,
  type ChatSDKErrorData,
  type ChatSDKMessageItem,
  type ChatSDKState,
  type OnErrorData,
  type PublicChatState,
} from '../../../src/aiChatEntry';

export const olderSdkState: ChatSDKState = {
  messages: [],
  status: 'ready',
  humanAgent: {
    isConnected: false,
    isConnecting: false,
    isSuspended: false,
    responseUserProfiles: {},
  },
  activeResponseId: null,
};

export const olderErrorData: ChatSDKErrorData = {
  errorType: OnErrorType.MESSAGE_COMMUNICATION,
  message: 'failed',
};

export const olderOnErrorData: OnErrorData = {
  errorType: OnErrorType.MESSAGE_COMMUNICATION,
  message: 'failed',
  catastrophicErrorType: false,
};

/**
 * `olderSdkState` above has no `messageItems`. These fail to compile if the field becomes required
 * on either state type.
 */
type IsOptional<T, K extends keyof T> =
  object extends Pick<T, K> ? true : false;
export const messageItemsOptionalOnSdk: IsOptional<
  ChatSDKState,
  'messageItems'
> = true;
export const messageItemsOptionalOnPublic: IsOptional<
  PublicChatState,
  'messageItems'
> = true;

export const sdkMessageItem: ChatSDKMessageItem = {
  id: 'message-1:i:0',
  messageID: 'message-1',
  kind: 'response',
  item: { response_type: MessageResponseTypes.TEXT },
  status: 'complete',
  origin: 'live',
};
