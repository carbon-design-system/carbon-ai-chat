/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  BusEventType,
  ChatInstance,
  GenericItem,
  StreamChunk,
} from "@carbon/ai-chat";

import { sleep } from "../framework/utils";
import { WORD_DELAY } from "./constants";

const TEXT =
  "The National Park Service (NPS) was created on August 25, 1916, by Congress through the act that established Yellowstone National Park. However, individual sites within the NPS, such as those mentioned in the document, were established at different times. For example, Jamestown, Virginia was founded in 1607, Plymouth was founded in 1620, and Independence National Historical Park was established in 1948 to preserve Independence Hall and the Liberty Bell.";

const META = {
  citations: [
    {
      title:
        "Independence National Historical Park (U.S. National Park Service)",
      text: "The park represents the founding ideals of the nation, and preserves national and international symbols of freedom and democracy, including Independence Hall and the Liberty Bell.",
      body: "The park represents the founding ideals of the nation, and preserves national and international symbols of freedom and democracy, including Independence Hall and the Liberty Bell.",
      url: "https://www.nps.gov/inde/index.htm#:~:text=%22We%20hold%20these,the%20Liberty%20Bell",
      ranges: [{ start: 377, end: 456 }],
    },
    {
      title:
        "Frequently Asked Questions - Historic Jamestowne Part of Colonial National Historical Park (U.S. National Park Service)",
      text: 'When Jamestown was founded the Virginia Company, who funded everything, wanted a return on their investment - they wanted to make money, whereas Plymouth was founded for "religious freedom" - more specifically to escape persecution they felt for their religious beliefs in Europe; 2.',
      body: 'When Jamestown was founded the Virginia Company, who funded everything, wanted a return on their investment - they wanted to make money, whereas Plymouth was founded for "religious freedom" - more specifically to escape persecution they felt for their religious beliefs in Europe; 2.',
      url: "https://www.nps.gov/jame/faqs.htm#:~:text=1607",
      ranges: [{ start: 269, end: 330 }],
    },
    {
      title:
        "Frequently Asked Questions - Historic Jamestowne Part of Colonial National Historical Park (U.S. National Park Service)",
      text: 'When Jamestown was founded the Virginia Company, who funded everything, wanted a return on their investment - they wanted to make money, whereas Plymouth was founded for "religious freedom" - more specifically to escape persecution they felt for their religious beliefs in Europe; 2.',
      body: 'When Jamestown was founded the Virginia Company, who funded everything, wanted a return on their investment - they wanted to make money, whereas Plymouth was founded for "religious freedom" - more specifically to escape persecution they felt for their religious beliefs in Europe; 2.',
      // The result comes from an internal collection and does not have a url, instead we are going to reference the full search result.
      search_result_idx: 0,
      ranges: [{ start: 269, end: 330 }],
    },
  ],
  search_results: [
    {
      body: `When Jamestown was founded the Virginia Company, who funded everything, wanted a return on their investment - they wanted to make money, whereas Plymouth was founded for "religious freedom" - more specifically to escape persecution they felt for their religious beliefs in Europe;
      
When Jamestown was founded the Virginia Company, who funded everything, wanted a return on their investment - they wanted to make money, whereas Plymouth was founded for "religious freedom" - more specifically to escape persecution they felt for their religious beliefs in Europe;

When Jamestown was founded the Virginia Company, who funded everything, wanted a return on their investment - they wanted to make money, whereas Plymouth was founded for "religious freedom" - more specifically to escape persecution they felt for their religious beliefs in Europe;

When Jamestown was founded the Virginia Company, who funded everything, wanted a return on their investment - they wanted to make money, whereas Plymouth was founded for "religious freedom" - more specifically to escape persecution they felt for their religious beliefs in Europe;`,
    },
  ],
};

function doConversationalSearch(instance: ChatInstance) {
  const response = {
    response_type: "conversational_search",
    text: TEXT,
    ...META,
  };

  instance.messaging.addMessage({
    output: {
      generic: [response as GenericItem],
    },
  });
}

async function doConversationalSearchStreaming(
  instance: ChatInstance,
  text: string = TEXT
) {
  const responseID = crypto.randomUUID();
  const words = text.split(" ");
  let isCanceled = false;
  let lastWordIndex = 0;

  const stopGeneratingEvent = {
    type: BusEventType.STOP_STREAMING,
    handler: () => {
      isCanceled = false;
      instance.off(stopGeneratingEvent);
    },
  };
  instance.on(stopGeneratingEvent);

  try {
    for (let index = 0; index < words.length && !isCanceled; index++) {
      const word = words[index];
      lastWordIndex = index;

      await sleep(WORD_DELAY);
      // Each time you get a chunk back, you can call `addMessageChunk`.
      instance.messaging.addMessageChunk({
        partial_item: {
          response_type: "conversational_search",
          // The next chunk, the chat component will deal with appending these chunks.
          text: `${word} `,
          streaming_metadata: {
            // This is the id of the item inside the response. If you have multiple items in this message they will be
            // ordered in the view in the order of the first message chunk received. If you want message item 1 to
            // appear above message item 2, be sure to seed it with a chunk first, even if its empty to start.
            id: "1",
            cancellable: true,
          },
        } as unknown as GenericItem,
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
      response_type: "conversational_search",
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

    instance.off(stopGeneratingEvent);
    await instance.messaging.addMessageChunk({
      final_response: finalResponse,
    } as StreamChunk);
  } finally {
    instance.off(stopGeneratingEvent);
  }
}

export { doConversationalSearch, doConversationalSearchStreaming };
