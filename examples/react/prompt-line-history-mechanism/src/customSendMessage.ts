/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the prompt-line-history-mechanism example.
 *
 * Demonstrates: capturing `request.input.text` into the shared `HistoryState`
 * before the mock response, so the keyboard extension can recall earlier sends
 * via ArrowUp / ArrowDown. History is captured here rather than via a bus
 * listener because `customSendMessage` already has the text in hand — no extra
 * wiring required.
 *
 * APIs exercised:
 *   - `customSendMessage` (signature `(request, options, instance)`)
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: `createCustomSendMessage`.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from '@carbon/ai-chat';

import type { HistoryState } from './historyExtension';

const WELCOME_TEXT = `Welcome! This example demonstrates shell-style message history in the chat input.

Send a message, then press **↑** in the input to navigate your message history. Press **↓** to move forward through history. Your in-progress text is saved when you start navigating and restored when you return.`;

/**
 * Returns a `customSendMessage` handler that captures each sent message into
 * `state.entries` before generating the mock response.
 *
 * Wrapping in a factory (instead of exporting a bare function) lets the handler
 * close over the same `state` object used by `createHistoryExtension` without
 * any module-level mutable singleton — the caller owns the state.
 */
function createCustomSendMessage(state: HistoryState) {
  return async function customSendMessage(
    request: MessageRequest,
    _requestOptions: CustomSendMessageOptions,
    instance: ChatInstance
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

    // Append to history before the response so ArrowUp works on the very next
    // keypress after the bot replies.
    state.entries.push(text);
    // Reset navigation cursor so the next ArrowUp starts from the most-recent
    // entry, even if the user was mid-navigation when they sent.
    state.cursor = -1;

    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: `Got it: "${text}"\n\nPress **↑** to recall this message.`,
          },
        ],
      },
    });
  };
}

export { createCustomSendMessage };
