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

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
} from "@carbon/ai-chat";

import { doWelcomeText } from "./doText";
import { RESPONSE_MAP } from "./responseMap";

async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance
) {
  if (request.input.message_type !== "event") {
    if (request.input.text && request.input.text in RESPONSE_MAP) {
      await RESPONSE_MAP[request.input.text](instance);
    } else {
      doWelcomeText(instance);
    }
  }
}

export { customSendMessage };
