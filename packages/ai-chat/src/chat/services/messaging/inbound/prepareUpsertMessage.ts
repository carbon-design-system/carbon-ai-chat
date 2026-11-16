/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';
import { MessageState } from '../../../../types/config/MessagingConfig';
import type { MessageResponse } from '../../../../types/messaging/Messages';
import {
  hasLiveHumanAgentMessage,
  isRequest,
} from '../../../utils/messageUtils';

function prepareUpsertMessage(result: MessageResponse): MessageResponse {
  if (result === null || result === undefined) {
    throw new TypeError(
      'upsertMessage: updater must return a MessageResponse, received null/undefined.'
    );
  }
  if (typeof result !== 'object') {
    throw new TypeError(
      'upsertMessage: updater must return a MessageResponse object.'
    );
  }
  if (isRequest(result) || hasLiveHumanAgentMessage(result)) {
    throw new TypeError(
      'upsertMessage: updater must return an assistant message, not a request or a human-agent message.'
    );
  }

  if (Object.isFrozen(result)) {
    result = cloneDeep(result);
  }
  return result;
}

function transitionOf(
  previousState: MessageState | undefined,
  nextState: MessageState
) {
  const willFireReceive =
    nextState === MessageState.COMPLETE &&
    previousState !== MessageState.COMPLETE;
  const settlesMessage =
    willFireReceive ||
    (nextState === MessageState.ERROR && previousState !== MessageState.ERROR);
  return { willFireReceive, settlesMessage };
}

export { prepareUpsertMessage, transitionOf };
