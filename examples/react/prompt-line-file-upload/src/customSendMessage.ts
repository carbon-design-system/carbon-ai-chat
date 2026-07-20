/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock customSendMessage handler for the file-upload example.
 *
 * Demonstrates: branching on `request.input.structured_data` to detect
 * attached files and producing a synthetic assistant reply that echoes
 * the uploaded file metadata.
 *
 * APIs exercised:
 *   - `MessageRequest`
 *   - `CustomSendMessageOptions`
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: the `customSendMessage` function below.
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

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // Attachments arrive on the request as `file`-typed entries inside `structured_data.fields`.
  const fileFields = request.input.structured_data?.fields?.filter(
    (f) => f.type === "file",
  );
  if (fileFields && fileFields.length > 0) {
    doFileUploadResponse(request, instance);
    return;
  }

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
