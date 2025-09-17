/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  HistoryItem,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const HISTORY = [
  {
    message: {
      id: "1",
      input: {
        text: "text 1",
        message_type: "text",
      },
    },
    time: new Date().toISOString(),
  },
  {
    message: {
      id: "2",
      output: {
        generic: [
          {
            text: new Array(5).fill("words from history").join(" "),
            response_type: MessageResponseTypes.TEXT,
          },
        ],
      },
    },
    time: new Date().toISOString(),
  },
  {
    message: {
      id: "3",
      input: {
        text: "some more words from history",
        message_type: "text",
      },
    },
    time: new Date().toISOString(),
  },
  {
    message: {
      id: "4",
      output: {
        generic: [
          {
            text: new Array(5).fill("more words").join(" "),
            response_type: MessageResponseTypes.TEXT,
          },
        ],
      },
    },
    time: new Date().toISOString(),
  },
];

async function customLoadHistory(_instance: ChatInstance) {
  return HISTORY as HistoryItem[];
}

export { customLoadHistory };
