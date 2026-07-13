/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the prompt-line-code-snippet example.
 *
 * Demonstrates: the custom Tiptap node wraps the user's code in standard
 * ```...``` fences inside the outgoing raw text (`request.input.text`), so a
 * markdown-aware backend would render it as a code block. This stand-in just
 * echoes the request back so you can confirm the wire format.
 *
 * APIs exercised:
 *   - `customSendMessage` (signature `(request, options, instance)`)
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

const WELCOME_TEXT = `Welcome! This example demonstrates a triple-backtick input rule.

Type \`\`\` in the input — the paragraph is swapped for an editable code-snippet block. Type some code (multi-line works; the input grows then scrolls). Press **Escape** to leave the block. When you press send, the message text is wrapped in standard \`\`\`...\`\`\` fences and the bubble shows a read-only snippet.`;

// Replace with a real production implementation. This stand-in echoes the
// fenced markdown back so you can verify the wire format.
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

  const replyText = text.includes("```")
    ? "Got it — your message contained a fenced code block."
    : "Got it — no code block detected in your message.";

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
