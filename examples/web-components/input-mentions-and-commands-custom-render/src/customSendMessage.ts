/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock customSendMessage handler for the mentions-and-commands-custom-render
 * example.
 *
 * Demonstrates: how to read mention/command picks out of
 * `request.input.structured_data` after the user submits, and echo a
 * confirmation back through `instance.messaging.addMessage`.
 *
 * APIs exercised:
 *   - `customSendMessage` signature
 *   - `MessageRequest.input.structured_data.fields`
 *   - `instance.messaging.addMessage`
 *
 * Start reading at: the `customSendMessage` function below.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

// Greeting text shown on the first empty submit so a fresh user sees the picker affordances.
const WELCOME_TEXT = `Welcome! This example demonstrates @mentions and /commands.

Try these:
- Type **@** to mention a team member (e.g., @Jane Smith)
- Type **/** at the start of a line for commands (e.g., /summarize)
- You can combine mentions and commands with regular text

When you send a message, the structured data will show what mentions and commands were included.`;

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  const text = request.input.text?.trim();

  if (!text) {
    // Empty submit is treated as a "show me how this works" cue rather than an error.
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

  // Picks ride alongside the message text in a structured-data sidecar so plain text stays human-readable.
  const fields = request.input.structured_data?.fields ?? [];
  const mentions = fields.filter((f) => f.type === "mention");
  const commands = fields.filter((f) => f.type === "command");

  const parts: string[] = [`Received: "${text}"`];

  if (mentions.length > 0) {
    const names = mentions.map((m) => m.label).join(", ");
    parts.push(`**Mentions:** ${names}`);
  }

  if (commands.length > 0) {
    const cmds = commands.map((c) => `/${c.label}`).join(", ");
    parts.push(`**Commands:** ${cmds}`);
  }

  if (mentions.length === 0 && commands.length === 0) {
    parts.push("No mentions or commands detected in structured data.");
  }

  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: parts.join("\n\n"),
        },
      ],
    },
  });
}

export { customSendMessage };
