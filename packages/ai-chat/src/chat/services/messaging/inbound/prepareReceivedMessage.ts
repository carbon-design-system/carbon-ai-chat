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
import type { ReceivedLocalItems } from '../../../store/messageWriteTypes';

function prepareReceivedMessage(
  message: MessageResponse,
  received: ReceivedLocalItems
): { message: MessageResponse; received: ReceivedLocalItems } {
  return cloneDeep({ message, received });
}

export { prepareReceivedMessage };
