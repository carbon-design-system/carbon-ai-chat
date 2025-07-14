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
  TextItem,
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
            text: new Array(40).fill("words from history").join(" "),
            response_type: MessageResponseTypes.TEXT,
          } satisfies TextItem as TextItem,
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
            text: new Array(100).fill("more words").join(" "),
            response_type: MessageResponseTypes.TEXT,
          } satisfies TextItem as TextItem,
        ],
      },
    },
    time: new Date().toISOString(),
  },
] as HistoryItem[];

async function customLoadHistory(instance: ChatInstance) {
  return HISTORY;
}

export { customLoadHistory };
