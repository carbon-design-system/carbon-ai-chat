/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  MessageRequest,
  CustomSendMessageOptions,
} from '@carbon/ai-chat';

import { TABLE } from './constants';
import { doText, doTextStreaming } from './doText';

function doTable(instance: ChatInstance, requestID?: MessageRequest['id']) {
  doText(
    instance,
    `A periodic table in markdown format.\n\n${TABLE}`,
    undefined,
    undefined,
    undefined,
    undefined,
    requestID
  );
}

async function doTableStreaming(
  instance: ChatInstance,
  requestOptions?: CustomSendMessageOptions,
  requestID?: MessageRequest['id']
) {
  await doTextStreaming(
    instance,
    `A periodic table in markdown format.\n\n${TABLE}`,
    true,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    requestOptions,
    requestID
  );
}

export { doTable, doTableStreaming };
