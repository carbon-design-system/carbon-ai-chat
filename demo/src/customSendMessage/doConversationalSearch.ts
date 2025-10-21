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
  CustomSendMessageOptions,
  ConversationalSearchItem,
  MessageResponseTypes,
  StreamChunk,
} from "@carbon/ai-chat";

import { sleep } from "@carbon/ai-chat-utils";
import { WORD_DELAY } from "./constants";

const TEXT =
  "Carbon was first recognized as an element by Antoine Lavoisier in 1789, though carbon compounds have been known since ancient times. Carbon exists in multiple allotropes including diamond, graphite, and fullerenes. Diamond was first synthesized artificially in 1955, while fullerenes were discovered in 1985, and graphene was first isolated in 2004 by Andre Geim and Konstantin Novoselov at the University of Manchester.";

const META = {
  citations: [
    {
      title: "Carbon Allotropes - Chemical Database (IBM Research)",
      text: "Diamond was first synthesized artificially in 1955, while fullerenes were discovered in 1985, and graphene was first isolated in 2004 by Andre Geim and Konstantin Novoselov.",
      url: "https://ibm.com/research/carbon-allotropes#:~:text=Diamond%20was%20first,University%20of%20Manchester",
      ranges: [{ start: 147, end: 290 }],
    },
    {
      title: "Carbon Element History - Chemical Elements Database (IBM Watson)",
      text: "Carbon was first recognized as an element by Antoine Lavoisier in 1789, though carbon compounds have been known since ancient times.",
      url: "https://ibm.com/chemistry/elements/carbon#:~:text=Antoine%20Lavoisier%201789",
      ranges: [{ start: 0, end: 137 }],
    },
    {
      title:
        "Carbon Research Database - Internal Collection (IBM Quantum Network)",
      text: "Carbon exists in multiple allotropes including diamond, graphite, and fullerenes. Diamond was first synthesized artificially in 1955, while fullerenes were discovered in 1985.",
      // The result comes from an internal collection and does not have a url, instead we are going to reference the full search result.
      search_result_idx: 0,
      ranges: [{ start: 138, end: 247 }],
    },
  ],
  search_results: [
    {
      body: `Carbon exists in multiple allotropes including diamond, graphite, and fullerenes. Diamond was first synthesized artificially in 1955, while fullerenes were discovered in 1985, and graphene was first isolated in 2004 by Andre Geim and Konstantin Novoselov at the University of Manchester.
      
Carbon forms the backbone of organic chemistry due to its ability to form four covalent bonds and create long chains and complex structures. The element has an atomic number of 6 and is located in group 14 of the periodic table.

Carbon nanotubes, another important allotrope, exhibit remarkable mechanical and electrical properties. These cylindrical structures were first discovered in 1991 and have applications in electronics, materials science, and nanotechnology.

Isotopes of carbon include carbon-12, carbon-13, and carbon-14. Carbon-14 is radioactive and is used in carbon dating to determine the age of organic materials up to about 50,000 years old.`,
    },
  ],
};

function doConversationalSearch(instance: ChatInstance) {
  const response: ConversationalSearchItem = {
    response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
    text: TEXT,
    ...META,
  };

  instance.messaging.addMessage({
    output: {
      generic: [response],
    },
  });
}

async function doConversationalSearchStreaming(
  instance: ChatInstance,
  text: string = TEXT,
  requestOptions?: CustomSendMessageOptions,
) {
  const signal = requestOptions?.signal;
  const responseID = crypto.randomUUID();
  const words = text.split(" ");
  let isCanceled = false;
  let lastWordIndex = 0;

  // Listen to abort signal (handles both stop button and restart/clear)
  const abortHandler = () => {
    isCanceled = true;
  };
  signal?.addEventListener("abort", abortHandler);

  try {
    for (let index = 0; index < words.length && !isCanceled; index++) {
      const word = words[index];
      lastWordIndex = index;

      await sleep(WORD_DELAY);
      // Each time you get a chunk back, you can call `addMessageChunk`.
      instance.messaging.addMessageChunk({
        partial_item: {
          response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
          // The next chunk, the chat component will deal with appending these chunks.
          text: `${word} `,
          streaming_metadata: {
            // This is the id of the item inside the response. If you have multiple items in this message they will be
            // ordered in the view in the order of the first message chunk received. If you want message item 1 to
            // appear above message item 2, be sure to seed it with a chunk first, even if its empty to start.
            id: "1",
            cancellable: true,
          },
        },
        streaming_metadata: {
          // This is the id of the entire message response.
          response_id: responseID,
        },
      });
    }

    // When you are done streaming this item in the response, you should call the complete item.
    // This requires ALL the concatenated final text. If you want to append text, run a post processing safety check, or anything
    // else that mutates the data, you can do so here.
    let completeItem = {
      response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
      text: isCanceled ? words.splice(0, lastWordIndex).join(" ") : text,
      streaming_metadata: {
        // This is the id of the item inside the response.
        id: "1",
        stream_stopped: isCanceled,
      },
    };

    if (!isCanceled) {
      completeItem = {
        ...completeItem,
        ...META,
      };
      instance.messaging.addMessageChunk({
        complete_item: completeItem,
        streaming_metadata: {
          // This is the id of the entire message response.
          response_id: responseID,
        },
      } as StreamChunk);
    }

    // When all and any chunks are complete, you send a final response.
    // You can rearrange or re-write everything here, but what you send here is what the chat will display when streaming
    // has been completed.
    const finalResponse = {
      id: responseID,
      output: {
        generic: [completeItem],
      },
    };

    await instance.messaging.addMessageChunk({
      final_response: finalResponse,
    } as StreamChunk);
  } finally {
    signal?.removeEventListener("abort", abortHandler);
  }
}

export { doConversationalSearch, doConversationalSearchStreaming };
