/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock messaging handler for the mentions-and-commands example.
 *
 * Demonstrates: how `MessageRequest.input.structured_data.fields`
 * arrives alongside the raw text when the user picks a `@mention`
 * or `/command`, and echoes the parsed picks back as a Markdown
 * summary so the structured-data sidecar is observable.
 *
 * APIs exercised: `MessageRequest`, `CustomSendMessageOptions`,
 * `ChatInstance.messaging.addMessage`, `MessageResponseTypes.TEXT`.
 *
 * Start reading at: `customSendMessage`.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

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
    // Empty input is treated as an onboarding ping so first-time users see usage hints.
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

  // Picks travel on the structured-data sidecar, not in the text body, so they must be read separately.
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
