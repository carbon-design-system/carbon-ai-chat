/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, MessageRequest } from '@carbon/ai-chat';

import { ORDERED_LIST } from './constants';
import { doText } from './doText';

function doOrderedList(
  instance: ChatInstance,
  requestID?: MessageRequest['id']
) {
  doText(
    instance,
    ORDERED_LIST,
    undefined,
    undefined,
    undefined,
    undefined,
    requestID
  );
}

export { doOrderedList };
