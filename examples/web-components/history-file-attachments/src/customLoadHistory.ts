/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock history loader for the file-attachments history example (Web components).
 *
 * Demonstrates: persisting an uploaded file by putting a `file`-typed
 * `StructuredField` on the request's `structured_data`, so the chat re-renders the
 * attachment chip when the conversation is restored. `structured_data` is an
 * ordinary part of a `MessageRequest`, so it round-trips inside a `HistoryItem`
 * with no separate storage of its own.
 *
 * The chat renders an `ExternalFileReference` from `name` and `mime_type` alone —
 * it needs no `File` object, which is exactly why a reference survives a reload.
 *
 * APIs exercised:
 *   - `HistoryItem`
 *   - `MessageRequest` / `MessageResponse`
 *   - `MessageInput.structured_data`
 *   - `StructuredField`
 *   - `ExternalFileReference`
 *   - `MessageInputType.TEXT` / `MessageResponseTypes.TEXT`
 *
 * Start reading at: `customLoadHistory()` at the bottom.
 */

import {
  ChatInstance,
  ExternalFileReference,
  HistoryItem,
  MessageInputType,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  StructuredField,
} from '@carbon/ai-chat';

/**
 * The file as your server recorded it. A real backend returns the id and URL it
 * assigned when it stored the upload; `name` and `mime_type` are what the chat
 * needs to render the chip and pick its file-type icon.
 */
const STORED_FILE: ExternalFileReference = {
  type: 'reference',
  id: 'doc-quarterly-report',
  name: 'quarterly-report.pdf',
  mime_type: 'application/pdf',
  // The chat does not render a download link, so `url` is here only for your own
  // code to use.
  url: 'https://example.com/files/quarterly-report.pdf',
};

const OPENING_QUESTION: MessageRequest = {
  id: 'user-1',
  input: {
    text: 'Can you summarize our Q3 numbers?',
    message_type: MessageInputType.TEXT,
  },
};

const ASK_FOR_FILE: MessageResponse = {
  id: 'assistant-1',
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.TEXT,
        text: 'Sure — attach the report and I will pull the highlights out of it.',
      },
    ],
  },
};

/**
 * The turn that carries the attachment. Note that `structured_data` sits beside
 * `text` on the input, exactly as the chat wrote it when the message was first
 * sent — nothing here is history-specific.
 */
const MESSAGE_WITH_ATTACHMENT: MessageRequest = {
  id: 'user-2',
  input: {
    text: 'Here it is.',
    message_type: MessageInputType.TEXT,
    structured_data: {
      fields: [
        {
          // Field ids are yours to choose; your server reads them back by id.
          id: 'file',
          type: 'file',
          value: STORED_FILE,
        } satisfies StructuredField,
      ],
    },
  },
};

const SUMMARY: MessageResponse = {
  id: 'assistant-2',
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.TEXT,
        text: 'Thanks. Revenue was up 12% year over year, with services leading the growth.',
      },
    ],
  },
};

/**
 * Fixed timestamps keep this example deterministic. A real loader uses whatever
 * your backend recorded for each turn.
 */
const CONVERSATION: Array<[MessageRequest | MessageResponse, string]> = [
  [OPENING_QUESTION, '2026-07-30T15:58:00.000Z'],
  [ASK_FOR_FILE, '2026-07-30T15:58:04.000Z'],
  [MESSAGE_WITH_ATTACHMENT, '2026-07-30T15:59:12.000Z'],
  [SUMMARY, '2026-07-30T15:59:20.000Z'],
];

// Replace with a real production implementation that fetches persisted history
// from your backend.
async function customLoadHistory(
  _instance: ChatInstance
): Promise<HistoryItem[]> {
  return CONVERSATION.map(([message, time]) => ({ message, time }));
}

export { customLoadHistory, STORED_FILE };
