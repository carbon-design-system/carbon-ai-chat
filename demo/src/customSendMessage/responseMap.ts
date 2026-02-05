/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, CustomSendMessageOptions } from "@carbon/ai-chat";

import { doAudio } from "./doAudio";
import { doButton } from "./doButton";
import { doCard } from "./doCard";
import { doPreviewCard } from "./doPreviewCard";
import { doCarousel } from "./doCarousel";
import { doCode, doCodeStreaming } from "./doCode";
import {
  doConversationalSearch,
  doConversationalSearchStreaming,
} from "./doConversationalSearch";
import { doDate } from "./doDate";
import { doError } from "./doError";
import { doGrid } from "./doGrid";
import { doHumanAgent } from "./doHumanAgent";
import { doIFrame } from "./doIFrame";
import { doImage } from "./doImage";
import { doList } from "./doList";
import { doOption } from "./doOption";
import { doOrderedList } from "./doOrderedList";
import { doTable, doTableStreaming } from "./doTable";
import {
  doHTML,
  doHTMLStreaming,
  doText,
  doTextChainOfThought,
  doTextChainOfThoughtStreaming,
  doTextStreaming,
  doTextStreamingWithNonWatsonAssistantProfile,
  doTextWithFeedback,
  doTextWithFeedbackStreaming,
  doTextWithHumanProfile,
  doTextWithNonWatsonAssistantProfile,
  doTextWithReasoningStepsStreaming,
  doTextWithReasoningTraceStreaming,
  doTextWithWatsonAgentProfile,
} from "./doText";
import { doUserDefined, doUserDefinedStreaming } from "./doUserDefined";
import { doVideo } from "./doVideo";

const sortResponseMap = <T extends Record<string, unknown>>(map: T): T =>
  Object.fromEntries(
    Object.entries(map).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey),
    ),
  ) as T;

const RESPONSE_MAP: Record<
  string,
  (
    instance: ChatInstance,
    requestOptions?: CustomSendMessageOptions,
  ) => Promise<void> | void
> = sortResponseMap({
  audio: (instance) => doAudio(instance),
  button: (instance) => doButton(instance),
  card: (instance) => doCard(instance),
  "workspace preview card (open start)": (instance) =>
    doPreviewCard(instance, "start"),
  "workspace preview card (open end)": (instance) =>
    doPreviewCard(instance, "end"),
  carousel: (instance) => doCarousel(instance),
  code: (instance) => doCode(instance),
  "code (stream)": (instance, requestOptions) =>
    doCodeStreaming(instance, requestOptions),
  "conversational search": (instance) => doConversationalSearch(instance),
  "conversational search (stream)": (instance, requestOptions) =>
    doConversationalSearchStreaming(instance, undefined, requestOptions),
  date: (instance) => doDate(instance),
  grid: (instance) => doGrid(instance),
  "human agent": (instance) => doHumanAgent(instance),
  iframe: (instance) => doIFrame(instance),
  "inline error": (instance) => doError(instance),
  image: (instance) => doImage(instance),
  "unordered list": (instance) => doList(instance),
  "option list": (instance) => doOption(instance),
  "ordered list": (instance) => doOrderedList(instance),
  table: (instance) => doTable(instance),
  "table (stream)": (instance, requestOptions) =>
    doTableStreaming(instance, requestOptions),
  text: (instance) => doText(instance),
  "text (stream)": (instance, requestOptions) =>
    doTextStreaming(
      instance,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      requestOptions,
    ),
  "text with feedback": (instance) => doTextWithFeedback(instance),
  "text with feedback (stream)": (instance, requestOptions) =>
    doTextWithFeedbackStreaming(instance, requestOptions),
  "text from watsonx agent": (instance) =>
    doTextWithWatsonAgentProfile(instance),
  "text from third party human": (instance) => doTextWithHumanProfile(instance),
  "text from third party bot": (instance) =>
    doTextWithNonWatsonAssistantProfile(instance),
  "text (stream) from third party bot": (instance, requestOptions) =>
    doTextStreamingWithNonWatsonAssistantProfile(
      instance,
      undefined,
      undefined,
      undefined,
      requestOptions,
    ),
  "text with chain of thought": (instance) => doTextChainOfThought(instance),
  "text (stream) with chain of thought": (instance, requestOptions) =>
    doTextChainOfThoughtStreaming(
      instance,
      undefined,
      undefined,
      undefined,
      undefined,
      requestOptions,
    ),
  "text (stream) with reasoning steps": (instance, requestOptions) =>
    doTextWithReasoningStepsStreaming(instance, requestOptions),
  "text (stream) with single reasoning trace": (instance, requestOptions) =>
    doTextWithReasoningTraceStreaming(instance, requestOptions),
  "text (delayed response)": async (instance, requestOptions) => {
    const signal = requestOptions?.signal;

    // Check if already aborted
    if (signal?.aborted) {
      return;
    }

    instance.updateIsMessageLoadingCounter("increase", "Thinking...");

    // Return a Promise that resolves when the work is done or cancelled
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Double-check signal wasn't aborted during delay
        if (signal?.aborted) {
          instance.updateIsMessageLoadingCounter("decrease");
          reject(new Error("Aborted"));
          return;
        }
        instance.updateIsMessageLoadingCounter("decrease");
        doText(instance);
        resolve();
      }, 3000);

      // Cancel timeout if signal is aborted
      const abortHandler = () => {
        clearTimeout(timeoutId);
        instance.updateIsMessageLoadingCounter("decrease");
        reject(new Error("Aborted"));
      };
      signal?.addEventListener("abort", abortHandler, { once: true });
    });
  },
  "text (delayed streaming response)": async (instance, requestOptions) => {
    const signal = requestOptions?.signal;

    // Check if already aborted
    if (signal?.aborted) {
      return;
    }

    instance.updateIsMessageLoadingCounter("increase", "Thinking...");

    // Return a Promise that resolves when the work is done or cancelled
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        // Double-check signal wasn't aborted during delay
        if (signal?.aborted) {
          instance.updateIsMessageLoadingCounter("decrease");
          reject(new Error("Aborted"));
          return;
        }
        instance.updateIsMessageLoadingCounter("decrease");
        try {
          await doTextStreaming(
            instance,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            requestOptions,
          );
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 3000);

      // Cancel timeout if signal is aborted
      const abortHandler = () => {
        clearTimeout(timeoutId);
        instance.updateIsMessageLoadingCounter("decrease");
        reject(new Error("Aborted"));
      };
      signal?.addEventListener("abort", abortHandler, { once: true });
    });
  },
  "text (consecutive responses)": (instance) => {
    instance.updateIsMessageLoadingCounter("increase", "Thinking...");
    setTimeout(() => {
      instance.updateIsMessageLoadingCounter("decrease");
      doTextWithFeedback(instance);
      setTimeout(() => {
        doTextWithFeedback(instance);
      }, 1000);
    }, 3000);
  },
  html: (instance) => doHTML(instance),
  "html (stream)": (instance, requestOptions) =>
    doHTMLStreaming(
      instance,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      requestOptions,
    ),
  user_defined: (instance) => doUserDefined(instance),
  "user_defined (stream)": (instance, requestOptions) =>
    doUserDefinedStreaming(instance, requestOptions),
  video: (instance) => doVideo(instance),
});

export { RESPONSE_MAP };
