/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the input-custom-render example.
 *
 * Demonstrates: how a `customSendMessage` handler reads the tile identity out
 * of `request.input.structured_data.user_defined` — written by the host page
 * when a tile is clicked — and echoes back which tile was submitted.
 *
 * APIs exercised:
 *   - `customSendMessage` (signature `(request, options, instance)`)
 *   - `MessageRequest.input.structured_data.user_defined`
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

const WELCOME_TEXT = `Welcome! This example demonstrates a custom input node.

Click a tile on the left — it drops a copy of the tile into the input below. Press send and this mock backend will reply with the structured data that identifies the tile you submitted.`;

// Replace with a real production implementation. This stand-in reads the tile
// out of the structured-data sidecar and confirms it back to the user.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  const text = request.input.text?.trim();

  if (!text) {
    // The framework sends an empty hydration request on first render — use it
    // to surface onboarding instructions instead of echoing nothing back.
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
    return;
  }

  // The host page replaces structured_data on each tile click, putting the
  // tile metadata under the `user_defined` escape hatch.
  const tile = request.input.structured_data?.user_defined;

  const replyText = tile
    ? `You submitted the **${tile.label}** tile (id: \`${tile.value}\`).`
    : "No tile was attached to this message.";

  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: replyText,
        },
      ],
    },
  });
}

export { customSendMessage };
