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
import { doText, doTextStreaming } from "./doText";
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
  // Issues with React component
  // date: doDate,
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
  user_defined: doUserDefined,
  "user_defined (stream)": doUserDefinedStreaming,
  video: doVideo,
};

export { RESPONSE_MAP };
