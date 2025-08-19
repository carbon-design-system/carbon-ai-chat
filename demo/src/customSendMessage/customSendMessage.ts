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
  CustomSendMessageOptions,
  MessageRequest,
} from "@carbon/ai-chat";

import { doWelcomeText } from "./doText";
import { RESPONSE_MAP } from "./responseMap";

async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
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
