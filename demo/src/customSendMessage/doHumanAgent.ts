/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  ConnectToAgentItem,
  MessageResponseTypes,
} from "@carbon/ai-chat";

function doHumanAgent(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.CONNECT_TO_AGENT,
        } as ConnectToAgentItem,
      ],
    },
  });
}

export { doHumanAgent };
