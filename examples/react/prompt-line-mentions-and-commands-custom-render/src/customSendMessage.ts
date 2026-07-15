/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the mentions-and-commands-custom-render example.
 *
 * Demonstrates: how a `customSendMessage` handler can read mentions and
 * commands out of `MessageRequest.input.structured_data.fields` and echo
 * them back as a synthesized assistant reply.
 *
 * APIs exercised:
 *   - `customSendMessage` (signature `(request, options, instance)`)
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

const WELCOME_TEXT = `Welcome! This example demonstrates @mentions and /commands.

Try these:
- Type **@** to mention a team member (e.g., @Jane Smith)
- Type **/** at the start of a line for commands (e.g., /summarize)
- You can combine mentions and commands with regular text

When you send a message, the structured data will show what mentions and commands were included.`;

// Replace with a real production implementation. This stand-in
// inspects the structured-data sidecar populated by the suggestion
// onSelect handlers and echoes a summary instead of calling a backend.
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  const text = request.input.text?.trim();

  if (!text) {
    // the framework sends an empty hydration request on first
    // render — use it to surface onboarding instructions instead of
    // echoing nothing back.
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

  // mentions and commands arrive in the structured_data sidecar
  // (not inline in text) because the suggestion onSelect handlers wrote
  // them there via input.updateStructuredData.
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
