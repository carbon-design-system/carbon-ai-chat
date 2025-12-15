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

const RESPONSE_MAP: Record<
  string,
  (
    instance: ChatInstance,
    requestOptions?: CustomSendMessageOptions,
  ) => Promise<void> | void
> = {
  audio: (instance) => doAudio(instance),
  button: (instance) => doButton(instance),
  card: (instance) => doCard(instance),
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
  "text (delayed response)": (instance) => {
    instance.updateIsMessageLoadingCounter("increase", "Thinking...");
    setTimeout(() => {
      instance.updateIsMessageLoadingCounter("decrease");
      doText(instance);
    }, 3000);
  },
  "text (delayed streaming response)": (instance, requestOptions) => {
    instance.updateIsMessageLoadingCounter("increase", "Thinking...");
    setTimeout(() => {
      instance.updateIsMessageLoadingCounter("decrease");
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
      );
    }, 3000);
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
};

export { RESPONSE_MAP };
