/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance } from "@carbon/ai-chat";

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
  doTextStreamingWithNonWatsonBotProfile,
  doTextWithHumanProfile,
  doTextWithNonWatsonBotProfile,
  doTextWithWatsonAgentProfile,
} from "./doText";
import { doUserDefined, doUserDefinedStreaming } from "./doUserDefined";
import { doVideo } from "./doVideo";

const RESPONSE_MAP: Record<
  string,
  (instance: ChatInstance) => Promise<void> | void
> = {
  audio: doAudio,
  button: doButton,
  card: doCard,
  carousel: doCarousel,
  code: doCode,
  "code (stream)": doCodeStreaming,
  "conversational search": doConversationalSearch,
  "conversational search (stream)": doConversationalSearchStreaming,
  date: doDate,
  grid: doGrid,
  "human agent": doHumanAgent,
  iframe: doIFrame,
  "inline error": doError,
  image: doImage,
  "unordered list": doList,
  "option list": doOption,
  "ordered list": doOrderedList,
  table: doTable,
  "table (stream)": doTableStreaming,
  text: doText,
  "text (stream)": doTextStreaming,
  "text from watsonx agent": doTextWithWatsonAgentProfile,
  "text from third party human": doTextWithHumanProfile,
  "text from third party bot": doTextWithNonWatsonBotProfile,
  "text (stream) from third party bot": doTextStreamingWithNonWatsonBotProfile,
  "text with chain of thought": doTextChainOfThought,
  "text (stream) with chain of thought": doTextChainOfThoughtStreaming,
  html: doHTML,
  "html (stream)": doHTMLStreaming,
  user_defined: doUserDefined,
  "user_defined (stream)": doUserDefinedStreaming,
  video: doVideo,
};

export { RESPONSE_MAP };
