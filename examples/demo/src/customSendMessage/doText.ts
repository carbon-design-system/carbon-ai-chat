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

import {
  BusEventType,
  ChatInstance,
  MessageResponseTypes,
  OptionItem,
  StreamChunk,
  TextItem,
} from "@carbon/ai-chat";

import { sleep } from "../framework/utils";
import { MARKDOWN, WELCOME_TEXT, WORD_DELAY } from "./constants";
import { RESPONSE_MAP } from "./responseMap";

async function doTextStreaming(
  instance: ChatInstance,
  text: string = MARKDOWN,
  cancellable: boolean = true
) {
  const responseID = crypto.randomUUID();
  const words = text.split(" ");
  let isCanceled = false;
  let lastWordIndex = 0;

  const stopGeneratingEvent = {
    type: BusEventType.STOP_STREAMING,
    handler: () => {
      isCanceled = true;
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
          response_type: MessageResponseTypes.TEXT,
          // The next chunk, the chat component will deal with appending these chunks.
          text: `${word} `,
          streaming_metadata: {
            // This is the id of the item inside the response. If you have multiple items in this message they will be
            // ordered in the view in the order of the first message chunk received. If you want message item 1 to
            // appear above message item 2, be sure to seed it with a chunk first, even if its empty to start.
            id: "1",
            cancellable,
          },
        } as TextItem,
        streaming_metadata: {
          // This is the id of the entire message response.
          response_id: responseID,
        },
      });
    }

    // When you are done streaming this item in the response, you should call the complete item.
    // This requires ALL the concatenated final text. If you want to append text, run a post processing safety check, or anything
    // else that mutates the data, you can do so here.
    const completeItem = {
      response_type: MessageResponseTypes.TEXT,
      text: isCanceled ? words.splice(0, lastWordIndex).join(" ") : text,
      streaming_metadata: {
        // This is the id of the item inside the response.
        id: "1",
        stream_stopped: isCanceled,
      },
    };
    instance.messaging.addMessageChunk({
      complete_item: completeItem,
      streaming_metadata: {
        // This is the id of the entire message response.
        response_id: responseID,
        stream_stopped: isCanceled,
      },
    } as StreamChunk);

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
    instance.off(stopGeneratingEvent);
  }
}

function doWelcomeText(instance: ChatInstance) {
  const options = Object.keys(RESPONSE_MAP).map((key) => ({
    label: key,
    value: { input: { text: key } },
  }));
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: WELCOME_TEXT,
        } as TextItem,
        {
          response_type: MessageResponseTypes.OPTION,
          title:
            'Select a response to view it in action. The "text" response includes configuration to send feedback (thumbs up/down). This can be applied to any response.',
          options,
        } as OptionItem,
      ],
    },
  });
}

function doText(instance: ChatInstance, text: string = MARKDOWN) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text,
          message_options: {
            chain_of_thought: [
              {
                title: "A step we are marking as successful with a description",
                tool_name: "boom_bam",
                description: `This is an optional description.\n\n*boom_bam* queries the *BAM* database run by the *BOOM* group. This contains blerg data used to identify customers borps.\n\nSee more information on [borps](https://ibm.com).`,
                request: {
                  args: {
                    foo: "bar",
                    bar: "baz",
                    boom: {
                      bam: "bow",
                    },
                    fizz: [
                      "i",
                      "guess",
                      "fizz",
                      {
                        name: "oh no a deep object",
                      },
                    ],
                  },
                },
                response: {
                  content: `{ "title": "I am some stringified JSON" }`,
                },
              },
              {
                title: "A second step with a really really long title",
                tool_name: "bam_bo",
                request: {
                  args: {
                    foo: "bar",
                  },
                },
                response: {
                  content: `I am just **text** this time. I support markdown formatting.`,
                },
              },
              {
                title: "Third step",
                tool_name: "bam_bo",
                request: {
                  args: {
                    foo: "bar",
                  },
                },
                response: {
                  content: { title: "I am some actual JSON" },
                },
              },
            ],
            feedback: {
              /**
               * Indicates if a request for feedback should be displayed.
               */
              is_on: true,

              /**
               * A unique identifier for this feedback. This is required for the feedback to be recorded in message history.
               */
              id: "1",

              /**
               * Indicates if the user should be asked for additional detailed information when providing positive feedback.
               */
              show_positive_details: false,

              /**
               * Indicates if the user should be asked for additional detailed information when providing negative feedback.
               */
              show_negative_details: true,

              /**
               * Indicates whether the prompt line should be shown.
               */
              show_prompt: true,
            },
          },
        } as TextItem,
      ],
    },
  });
}

export { doTextStreaming, doWelcomeText, doText };
