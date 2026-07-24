/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock history loader for the history-user-defined-responses example.
 *
 * Demonstrates: returning a `HistoryItem[]` made of three user requests
 * paired with three `MessageResponseTypes.USER_DEFINED` responses, so the
 * chat rehydrates with multiple `user_defined` cards on screen at once.
 * The chat's reducer sets `activeResponseId` to the id of the last
 * inserted message, which makes only the third card render as active.
 *
 * APIs exercised:
 *   - `HistoryItem`
 *   - `MessageRequest` / `MessageResponse`
 *   - `MessageInputType.TEXT`
 *   - `MessageResponseTypes.USER_DEFINED`
 *
 * Start reading at: `customLoadHistory()`.
 */

import {
  ChatInstance,
  HistoryItem,
  MessageInputType,
  MessageResponseTypes,
} from "@carbon/ai-chat";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

// Each entry produces one (request, user_defined response) pair so the rehydrated transcript reads like a normal back-and-forth conversation.
const PAIRS: { request: string; cardText: string }[] = [
  {
    request: "Show me the dashboard",
    cardText: "Dashboard summary card.",
  },
  {
    request: "Show me my reports",
    cardText: "Reports overview card.",
  },
  {
    request: "Show me settings",
    cardText: "Settings panel card.",
  },
];

// Replace with a real production implementation that fetches persisted history from your backend.
async function customLoadHistory(
  _instance: ChatInstance,
): Promise<HistoryItem[]> {
  const history: HistoryItem[] = [];

  for (const { request, cardText } of PAIRS) {
    history.push({
      message: {
        id: uuid(),
        input: {
          text: request,
          message_type: MessageInputType.TEXT,
        },
      },
      time: new Date().toISOString(),
    });

    history.push({
      message: {
        id: uuid(),
        output: {
          generic: [
            {
              // USER_DEFINED routes the rehydrated message to renderUserDefinedResponse just like a live response would.
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: {
                // Matches the discriminator in renderUserDefinedCallback so only this example's items are claimed.
                user_defined_type: "my_unique_identifier",
                text: cardText,
              },
            },
          ],
        },
      },
      time: new Date().toISOString(),
    });
  }

  return history;
}

export { customLoadHistory };
