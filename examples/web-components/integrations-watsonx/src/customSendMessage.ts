/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * customSendMessage — watsonx.ai SSE bridge.
 *
 * Demonstrates: bridging the Carbon AI Chat `customSendMessage` contract
 * to a watsonx.ai text-generation endpoint by streaming Server-Sent Events
 * through a local Express proxy and forwarding tokens via
 * `instance.messaging.addMessageChunk`.
 *
 * APIs exercised:
 *   - `customSendMessage` (PublicConfig.messaging.customSendMessage)
 *   - `instance.messaging.addMessageChunk` (partial, complete, final_response)
 *   - `instance.messaging.addMessage` (welcome + error fallbacks)
 *
 * Start reading at: `customSendMessage` then `streamWatsonxResponse`.
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

const WELCOME_TEXT = `Welcome to the watsonx.ai Web Components Example! This demo connects the Carbon AI Chat web component to IBM watsonx.ai for streaming text generation. Ask me anything to get started!`;

/**
 * Get IBM Cloud IAM access token via local proxy server
 */
async function getAccessToken(): Promise<string> {
  // The proxy keeps the IBM Cloud API key server-side; the browser only sees a short-lived bearer token.
  // Replace with a real production implementation.
  const tokenUrl = "http://localhost:3011/api/token";

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
    // Surface token failures to the dev console so configuration mistakes are visible during local development.
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

    // Stable IDs let multiple partial chunks be merged into a single streaming item by the chat runtime.
    const responseId = uuid();
    const itemId = "1";

    // The proxy server forwards SSE from watsonx.ai while keeping credentials server-side.
    // Replace with a real production implementation.
    const apiUrl = "http://localhost:3011/api/watsonx/stream";
    const headers = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };

    const requestBody = {
      input,
      access_token: accessToken,
    };

    // accumulatedText backs the final non-streaming snapshot; textBuffer holds tokens between flushes.
    let accumulatedText = "";
    let textBuffer = "";

    // fetchEventSource is preferred over EventSource because it supports POST bodies and custom headers.
    await fetchEventSource(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),

      onmessage(event) {
        // Empty heartbeats and the canonical [DONE] terminator carry no payload to forward.
        if (!event.data || event.data === "[DONE]") {
          return;
        }

        try {
          const parsed = JSON.parse(event.data);

          // The proxy reuses the SSE channel to surface upstream watsonx.ai errors as data events.
          if (parsed.error) {
            throw new Error(
              `${parsed.error}: ${parsed.details || parsed.message || ""}`,
            );
          }

          // watsonx.ai returns generations under `results[0]`; other shapes are heartbeats we ignore.
          if (parsed.results && parsed.results[0]) {
            const result = parsed.results[0];
            const generatedText = result.generated_text;

            // Skip empty token frames so we do not emit zero-length chunks to the UI.
            if (generatedText) {
              // accumulatedText feeds the terminal snapshot; textBuffer is what we are about to flush.
              accumulatedText += generatedText;
              textBuffer += generatedText;

              // Buffering until a natural boundary keeps markdown tokens (e.g. `**bold**`) intact across flushes.
              const shouldFlush =
                generatedText.includes("\n") ||
                generatedText.includes(" ") ||
                generatedText.match(/[.!?,:;|]/);

              if (shouldFlush && textBuffer.trim()) {
                // Emitting `partial_item` with the same item id appends to the in-progress streamed message.
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
                // Clear the buffer so the next flush only contains new tokens.
                textBuffer = "";
              }
            }

            // watsonx.ai signals completion by setting a terminal `stop_reason` other than `not_finished`.
            if (result.stop_reason && result.stop_reason !== "not_finished") {
              // Tokens after the last natural boundary still need to reach the UI before the terminal chunk.
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

              // `complete_item` replaces the accumulated partials with the canonical full text for this item.
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
              // `final_response` closes the streaming session so history reflects the completed message.
              instance.messaging.addMessageChunk({
                final_response: finalResponse,
              });
            }
          }
        } catch (parseError) {
          // Malformed SSE frames are warned but not thrown so a single bad event does not abort the stream.
          console.warn("Failed to parse SSE data:", event.data, parseError);
        }
      },

      onerror(error) {
        // Re-throwing aborts fetchEventSource's automatic retry so the outer catch can render an inline error.
        console.error("SSE stream error:", error);
        throw error;
      },

      onclose() {
        // Debug wiring: confirms the proxy closed the stream cleanly during local development.
        console.log("SSE stream closed");
      },
    });
  } catch (error) {
    // Debug wiring: surfaces upstream/network failures during local development.
    console.error("Watsonx streaming error:", error);

    // Render the failure inline in the conversation so users are not left with a silent empty response.
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
  // Carbon AI Chat sends an empty-text message at startup; reply with a welcome instead of calling the model.
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
      // Reading the config inside the handler defers env-var validation until the user actually sends a message.
      const config = getWatsonxConfig();

      const inputText = request.input.text || "";
      // Guard against whitespace-only input so we do not invoke the model with an empty prompt.
      if (inputText.trim()) {
        await streamWatsonxResponse(inputText, config, instance);
      }
    } catch (configError) {
      // Debug wiring: prints the missing-env-var details that triggered the inline error below.
      console.error("Configuration error:", configError);

      // Surface configuration problems inline so developers immediately see what env var is missing.
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
