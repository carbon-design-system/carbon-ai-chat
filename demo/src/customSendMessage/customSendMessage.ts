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
import { doFileUploadResponse } from "./doFileUpload";
import { RESPONSE_MAP } from "./responseMap";

async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  if (request.input.message_type !== "event") {
    // If the message contains file attachments, echo back the file metadata
    // in addition to the normal text response.
    const fileFields = request.input.structured_data?.fields?.filter(
      (f) => f.type === "file",
    );
    if (fileFields && fileFields.length > 0) {
      doFileUploadResponse(request, instance);
    }

    if (request.input.text && request.input.text in RESPONSE_MAP) {
      const handler = RESPONSE_MAP[request.input.text];
      await handler(instance, requestOptions);
    } else {
      doWelcomeText(instance);
    }
  }
}

export { customSendMessage };
