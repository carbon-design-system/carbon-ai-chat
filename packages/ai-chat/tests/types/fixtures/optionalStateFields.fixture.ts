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
  OnErrorType,
  type ChatSDKErrorData,
  type ChatSDKState,
  type OnErrorData,
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
