/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock `customLoadHistory` for the chat history (float) example.
 *
 * Demonstrates: returning a `HistoryItem[]` shaped payload that the chat
 * widget hydrates into the conversation when a user picks a chat from
 * the history panel. Both request and response shapes are produced
 * locally to keep the example dependency-free.
 *
 * APIs exercised:
 *   - `PublicConfig.messaging.customLoadHistory`
 *   - `HistoryItem`, `MessageRequest`, `MessageResponse`
 *
 * Start reading at: `customLoadHistory`.
 */

import {
  ChatInstance,
  HistoryItem,
  MessageInputType,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
} from "@carbon/ai-chat";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

// Builds a single `HistoryItem` for either a user request or assistant response so the example can fabricate a realistic conversation. Replace with a real production implementation.
function generateHistoryItem(isResponse: boolean, text: string): HistoryItem {
  const randomId = uuid();
  if (isResponse) {
    const messageResponse: MessageResponse = {
      id: randomId,
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text,
          },
        ],
      },
    };

    return {
      message: messageResponse,
      time: new Date().toISOString(),
    };
  } else {
    const messageRequest: MessageRequest = {
      id: randomId,
      input: {
        text,
        message_type: MessageInputType.TEXT,
      },
    };

    return {
      message: messageRequest,
      time: new Date().toISOString(),
    };
  }
}

// Resolves the history payload for the selected chat. Replace with a real production implementation that fetches by conversation id from the back-end.
async function customLoadHistory(
  _instance: ChatInstance,
  requestText = "Let's use this as the master invoice document.",
) {
  // Canned assistant replies that vary content/markdown shape so the picker shows visible differences across fake conversations.
  const responseTexts = [
    "**Bold text** with some *italic* formatting.",
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n\nSed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.\n\n## Heading\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    "Quick single line with `code` snippet.",
    "### Another heading\n\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\n- Bullet point one\n- Bullet point two\n- Bullet point three",
    "Simple text without formatting.",
    "Medium length paragraph about something interesting. This text should be long enough to span multiple lines but not too overwhelming to read in the chat interface.",
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n> This is a blockquote with some important information that stands out from the regular text.\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    "Here's a detailed response with formatting:\n\n1. First point\n2. Second point\n3. Third point\n\nAnd some additional context below.",
  ];

  // Pick a random assistant reply each load so the demo conversation looks fresh on every selection.
  const randomResponseText =
    responseTexts[Math.floor(Math.random() * responseTexts.length)];
  const history: HistoryItem[] = [];

  // Order matters: the request must precede the response so the chat renders the user turn first.
  history.push(generateHistoryItem(false, requestText));
  history.push(generateHistoryItem(true, randomResponseText));

  return history;
}

export { customLoadHistory };
