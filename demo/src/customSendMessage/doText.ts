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
  MessageResponse,
  MessageResponseTypes,
  OptionItem,
  ResponseUserProfile,
  StreamChunk,
  TextItem,
  UserType,
} from "@carbon/ai-chat";

import { sleep } from "../framework/utils";
import { MARKDOWN, WELCOME_TEXT, WORD_DELAY } from "./constants";
import { RESPONSE_MAP } from "./responseMap";

const defaultHumanUserProfile: ResponseUserProfile = {
  id: "1",
  nickname: "James",
  user_type: UserType.HUMAN,
};

const defaultAlternativeBotProfile: ResponseUserProfile = {
  id: "1",
  nickname: "Super bot",
  user_type: UserType.BOT,
};

async function doTextStreaming(
  instance: ChatInstance,
  text: string = MARKDOWN,
  cancellable = true,
  userProfile?: ResponseUserProfile
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
      const chunk: StreamChunk = {
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
      };

      if (userProfile) {
        chunk.partial_response = {
          history: {
            response_user_profile: userProfile,
          },
        };
      }

      instance.messaging.addMessageChunk(chunk);
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

    const chunk: StreamChunk = {
      complete_item: completeItem,
      streaming_metadata: {
        // This is the id of the entire message response.
        response_id: responseID,
      },
    };

    if (userProfile) {
      chunk.partial_response = {
        history: {
          response_user_profile: userProfile,
        },
      };
    }

    instance.messaging.addMessageChunk(chunk);

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

function doText(
  instance: ChatInstance,
  text: string = MARKDOWN,
  userProfile?: ResponseUserProfile
) {
  const genericItem = {
    response_type: MessageResponseTypes.TEXT,
    text,
  } as TextItem;

  const message: MessageResponse = {
    output: {
      generic: [genericItem],
    },
  };

  if (userProfile) {
    message.history = {
      response_user_profile: userProfile,
    };
  } else {
    message.output.generic = [];
    message.output.generic[0] = {
      ...genericItem,
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
    };
  }

  instance.messaging.addMessage(message);
}

function doTextWithHumanProfile(
  instance: ChatInstance,
  text: string = MARKDOWN,
  responseUserProfile: ResponseUserProfile = defaultHumanUserProfile
) {
  doText(instance, text, responseUserProfile);
}

function doTextWithNonWatsonBotProfile(
  instance: ChatInstance,
  text: string = MARKDOWN,
  responseUserProfile: ResponseUserProfile = defaultAlternativeBotProfile
) {
  doText(instance, text, responseUserProfile);
}

async function doTextStreamingWithNonWatsonBotProfile(
  instance: ChatInstance,
  text: string = MARKDOWN,
  cancellable = true,
  userProfile: ResponseUserProfile = defaultAlternativeBotProfile
) {
  return doTextStreaming(instance, text, cancellable, userProfile);
}

export {
  doTextStreaming,
  doWelcomeText,
  doText,
  doTextWithHumanProfile,
  doTextWithNonWatsonBotProfile,
  doTextStreamingWithNonWatsonBotProfile,
};
