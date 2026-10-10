/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, MessageResponseTypes } from '@carbon/ai-chat';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';

import { sendResponse } from './sendResponse';

function doDate(instance: ChatInstance) {
  return sendResponse(instance, {
    id: uuid(),
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.DATE,
        },
      ],
    },
  });
}

export { doDate };
