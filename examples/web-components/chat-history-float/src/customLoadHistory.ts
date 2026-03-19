/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  HistoryItem,
  MessageInputType,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
} from "@carbon/ai-chat";

function generateHistoryItem(isResponse: boolean, text: string): HistoryItem {
  const randomId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  if (isResponse) {
    const messageResponse: MessageResponse = {
      id: randomId,
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: {
              user_defined_type: "my_unique_identifier",
              text,
            },
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

async function customLoadHistory(
  _instance: ChatInstance,
  requestText = "Let's use this as the master invoice document.",
) {
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

  const randomResponseText =
    responseTexts[Math.floor(Math.random() * responseTexts.length)];
  const history: HistoryItem[] = [];

  // Add initial user message
  history.push(generateHistoryItem(false, requestText));
  // Add user_defined response
  history.push(generateHistoryItem(true, randomResponseText));

  return history;
}

export { customLoadHistory };
