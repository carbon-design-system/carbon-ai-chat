/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

import { HistoryItem, MessageResponseTypes, TextItem } from "@carbon/ai-chat";

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

async function customLoadHistory() {
  return HISTORY;
}

export { customLoadHistory };
