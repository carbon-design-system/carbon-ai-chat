/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * File: customSendMessage.ts
 *
 * Mock `messaging.customSendMessage` handler that drives the assistant
 * side of the file-upload demo without any backend.
 *
 * Demonstrates: routing inbound `MessageRequest` payloads based on whether
 * the user attached files (signalled by `request.input.structured_data`
 * fields of `type === "file"`) versus plain-text turns.
 *
 * APIs exercised:
 *   - `MessageRequest.input.structured_data`
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: `customSendMessage`.
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

// Replace with a real production implementation that posts the user's
// turn to your backend; this mock only inspects the request locally.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // Files attached via `onFileUpload` arrive on the next turn as
  // `structured_data.fields` entries with `type === "file"`, not as
  // a separate property on the request.
  const fileFields = request.input.structured_data?.fields?.filter(
    (f) => f.type === "file",
  );
  if (fileFields && fileFields.length > 0) {
    // Hand off to the mock echo responder so the assistant turn lists
    // the file metadata the "server" received.
    doFileUploadResponse(request, instance);
    return;
  }

  // No attachments on this turn: respond with onboarding copy that
  // tells the user how to exercise the upload affordance.
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
