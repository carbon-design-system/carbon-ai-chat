/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

import { ChatInstance, MessageResponseTypes, TextItem } from "@carbon/ai-chat";

import { CODE } from "./constants";
import { doTextStreaming } from "./doText";

function doCode(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: CODE,
        } as TextItem,
      ],
    },
  });
}

function doCodeStreaming(instance: ChatInstance) {
  doTextStreaming(instance, CODE, true);
}

export { doCode, doCodeStreaming };
