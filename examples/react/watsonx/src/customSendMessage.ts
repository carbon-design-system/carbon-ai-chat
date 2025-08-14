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
  MessageResponse,
  MessageResponseTypes,
  MessageRequest,
} from "@carbon/ai-chat";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { getWatsonxConfig } from "./watsonxConfig";

const WELCOME_TEXT = `Welcome to the watsonx.ai Chat Example! This demo connects the Carbon AI Chat component to IBM watsonx.ai for streaming text generation. Ask me anything to get started!`;

/**
 * Get IBM Cloud IAM access token via local proxy server
 */
async function getAccessToken(): Promise<string> {
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

    // Generate unique IDs for this streaming session
    const responseId = `watsonx-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    const itemId = "1";

    // Use local proxy server for streaming
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

              // Check if we should flush the buffer (on word boundaries, newlines, or punctuation)
              const shouldFlush =
                generatedText.includes("\n") ||
                generatedText.includes(" ") ||
                generatedText.match(/[.!?,:;|]/);

              if (shouldFlush && textBuffer.trim()) {
                // Send buffered text as a chunk to preserve markdown structure
                const chunk = {
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
                const bufferChunk = {
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
