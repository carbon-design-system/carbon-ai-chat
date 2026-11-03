/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';
import type { MessageResponse } from '../../../../types/messaging/Messages';
import { prepareReceivedMessage } from './prepareReceivedMessage';
import { prepareUpsertMessage, transitionOf } from './prepareUpsertMessage';

class IncomingMessageService {
  prepareReceivedMessage = prepareReceivedMessage;

  prepareUpsertMessage = prepareUpsertMessage;

  transitionOf = transitionOf;

  copyNativeMessage(message: MessageResponse): MessageResponse {
    return cloneDeep(message);
  }
}

export { IncomingMessageService };
