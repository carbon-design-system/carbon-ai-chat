/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * customSendMessage bridge for the watsonx example.
 *
 * Demonstrates: a `customSendMessage` implementation that obtains an IAM token
 * from a local proxy, opens an SSE stream against watsonx.ai, and pipes
 * generated tokens into the chat as streaming chunks plus a final response.
 *
 * APIs exercised:
 *   - `customSendMessage` (default export consumed by `PublicConfig.messaging`)
 *   - `ChatInstance.messaging.addMessageChunk` (incremental streaming)
 *   - `ChatInstance.messaging.addMessage` (welcome + error fallbacks)
 *   - `PartialItemChunkWithId`, `MessageResponse`, `MessageResponseTypes`
 *
 * Start reading at: `customSendMessage()`, then `streamWatsonxResponse()` for
 * the SSE plumbing.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageResponse,
  MessageResponseTypes,
  MessageRequest,
  type PartialItemChunkWithId,
} from "@carbon/ai-chat";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { getWatsonxConfig } from "./watsonxConfig";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

const WELCOME_TEXT = `Welcome to the watsonx.ai Chat Example! This demo connects the Carbon AI Chat component to IBM watsonx.ai for streaming text generation. Ask me anything to get started!`;

/**
 * Get IBM Cloud IAM access token via local proxy server
 */
async function getAccessToken(): Promise<string> {
  // token minting goes through a local proxy so the IAM API key never
  // ships to the browser. Replace with a real production implementation that
  // fronts watsonx.ai through your own authenticated backend.
  const tokenUrl = "http://localhost:3010/api/token";

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Token request failed: ${response.status} ${
          response.statusText
        }\n${JSON.stringify(errorData)}`,
      );
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to get access token:", error);
    throw error;
  }
}

/**
 * Stream text generation from watsonx.ai and send chunks to chat UI
 */
async function streamWatsonxResponse(
  input: string,
  _config: ReturnType<typeof getWatsonxConfig>,
  instance: ChatInstance,
): Promise<void> {
  try {
    // Get access token
    const accessToken = await getAccessToken();

    // response_id stays constant across every chunk so the chat groups
    // them into a single message; item_id stays constant so chunks accumulate
    // into the same partial_item rather than spawning new bubbles.
    const responseId = uuid();
    const itemId = "1";

    // streaming also hops through the local proxy — watsonx.ai's CORS
    // policy blocks browser-direct SSE. Replace with a real production
    // implementation when wiring this through your own backend.
    const apiUrl = "http://localhost:3010/api/watsonx/stream";
    const headers = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };

    const requestBody = {
      input,
      access_token: accessToken,
    };

    // Track accumulated text for final chunk and buffering
    let accumulatedText = "";
    let textBuffer = "";

    // Use fetch-event-source for cleaner SSE handling
    await fetchEventSource(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),

      onmessage(event) {
        // Skip empty data or [DONE] signals
        if (!event.data || event.data === "[DONE]") {
          return;
        }

        try {
          const parsed = JSON.parse(event.data);

          // Check if this is an error event from the proxy
          if (parsed.error) {
            throw new Error(
              `${parsed.error}: ${parsed.details || parsed.message || ""}`,
            );
          }

          // Extract generated text from the response
          if (parsed.results && parsed.results[0]) {
            const result = parsed.results[0];
            const generatedText = result.generated_text;

            // Only process non-empty text chunks
            if (generatedText) {
              // Accumulate text for final chunk
              accumulatedText += generatedText;
              textBuffer += generatedText;

              // flushing on word/sentence boundaries keeps markdown
              // tokens (e.g. `**bold**`, code fences) intact — emitting every
              // sub-token would split formatting characters mid-render.
              const shouldFlush =
                generatedText.includes("\n") ||
                generatedText.includes(" ") ||
                generatedText.match(/[.!?,:;|]/);

              if (shouldFlush && textBuffer.trim()) {
                // Send buffered text as a chunk to preserve markdown structure
                const chunk: PartialItemChunkWithId = {
                  partial_item: {
                    response_type: MessageResponseTypes.TEXT,
                    text: textBuffer,
                    streaming_metadata: {
                      id: itemId,
                    },
                  },
                  streaming_metadata: {
                    response_id: responseId,
                  },
                };

                instance.messaging.addMessageChunk(chunk);
                textBuffer = ""; // Reset buffer
              }
            }

            // Check if generation is complete
            if (result.stop_reason && result.stop_reason !== "not_finished") {
              // Flush any remaining buffer
              if (textBuffer.trim()) {
                const bufferChunk: PartialItemChunkWithId = {
                  partial_item: {
                    response_type: MessageResponseTypes.TEXT,
                    text: textBuffer,
                    streaming_metadata: {
                      id: itemId,
                    },
                  },
                  streaming_metadata: {
                    response_id: responseId,
                  },
                };

                instance.messaging.addMessageChunk(bufferChunk);
              }

              // Send final chunk with complete text (natural completion - no stream_stopped)
              const finalChunk = {
                complete_item: {
                  response_type: MessageResponseTypes.TEXT,
                  text: accumulatedText,
                  streaming_metadata: {
                    id: itemId,
                  },
                },
                streaming_metadata: {
                  response_id: responseId,
                },
              };

              instance.messaging.addMessageChunk(finalChunk);
              const finalResponse: MessageResponse = {
                id: responseId,
                output: {
                  generic: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: accumulatedText,
                      streaming_metadata: {
                        id: itemId,
                      },
                    },
                  ],
                },
              };
              instance.messaging.addMessageChunk({
                final_response: finalResponse,
              });
              // fetchEventSource will handle completion automatically
            }
          }
        } catch (parseError) {
          console.warn("Failed to parse SSE data:", event.data, parseError);
        }
      },

      onerror(error) {
        console.error("SSE stream error:", error);
        throw error;
      },

      onclose() {
        console.log("SSE stream closed");
      },
    });
  } catch (error) {
    console.error("Watsonx streaming error:", error);

    // Send error message to chat
    const errorMessage: MessageResponse = {
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.INLINE_ERROR,
            text: `Sorry, I encountered an error while connecting to watsonx.ai: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      },
    };
    instance.messaging.addMessage(errorMessage);
  }
}

async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // an empty input string is the chat's "session start" signal — emit a
  // canned welcome instead of round-tripping to watsonx.ai for nothing.
  if (request.input.text === "") {
    const message: MessageResponse = {
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: WELCOME_TEXT,
          },
        ],
      },
    };
    instance.messaging.addMessage(message);
  } else {
    try {
      // Get watsonx.ai configuration
      const config = getWatsonxConfig();

      // Stream response from watsonx.ai
      const inputText = request.input.text || "";
      if (inputText.trim()) {
        await streamWatsonxResponse(inputText, config, instance);
      }
    } catch (configError) {
      console.error("Configuration error:", configError);

      // Send configuration error message
      const errorMessage: MessageResponse = {
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.INLINE_ERROR,
              text: `Configuration Error: ${
                configError instanceof Error
                  ? configError.message
                  : "Please check your environment variables."
              }`,
            },
          ],
        },
      };
      instance.messaging.addMessage(errorMessage);
    }
  }
}

export { customSendMessage };
