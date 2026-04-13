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
  MessageResponseTypes,
} from "@carbon/ai-chat";

import { doFileUploadResponse } from "./mockOnFileUpload";

const WELCOME_TEXT = `Welcome! This example demonstrates file uploads in Carbon AI Chat.

Attach a file using the paperclip button in the input area, then send a message. The mock server will echo back the file metadata.

You can attach multiple files at once before sending.`;

async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // If the message contains file attachments, echo back the file metadata.
  const fileFields = request.input.structured_data?.fields?.filter(
    (f) => f.type === "file",
  );
  if (fileFields && fileFields.length > 0) {
    doFileUploadResponse(request, instance);
    return;
  }

  // Default response for all other messages.
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: WELCOME_TEXT,
        },
      ],
    },
  });
}

export { customSendMessage };

// Made with Bob
