/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { useCallbackOnChange } from "../../../hooks/useCallbackOnChange";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { HasDoAutoScroll } from "../../../../types/utilities/HasDoAutoScroll";
import { LocalMessageItemStreamingState } from "../../../../types/messaging/LocalMessageItem";
import InlineError from "../error/InlineError";
import { RichText } from "./RichText";
import { TextItem } from "../../../../types/messaging/Messages";

interface StreamingRichTextProps extends HasDoAutoScroll {
  /**
   * The full text of the item to render. This is used once the streaming is done.
   */
  text: string;

  /**
   * The current state of streaming of the text.
   */
  streamingState: LocalMessageItemStreamingState<TextItem>;

  /**
   * Indicates if HTML should be removed from the text before it is converted to markdown.
   */
  removeHTML: boolean;

  /**
   * Indicates if this should display an error message.
   */
  isStreamingError?: boolean;
}

/**
 * This item renders some text that may contain rich content. This component also supports the display of text as it
 * is streaming in chunks (currently only TextItem chunks are supported).
 */
function StreamingRichText(props: StreamingRichTextProps) {
  const { text, streamingState, removeHTML, isStreamingError, doAutoScroll } =
    props;

  const languagePack = useLanguagePack();

  // Once done streaming, kick off an auto-scroll.
  useCallbackOnChange(streamingState?.isDone, doAutoScroll);

  let textToUse;
  if (streamingState && !streamingState.isDone) {
    // If we're streaming, then concatenate all the chunks together.
    textToUse = streamingState.chunks.map((chunk) => chunk.text).join("");
  } else {
    textToUse = text;
  }

  return (
    <>
      <RichText
        text={textToUse}
        removeHTML={removeHTML}
        streaming={streamingState && !streamingState.isDone}
        highlight={true}
      />
      {isStreamingError && (
        <InlineError
          text={languagePack.conversationalSearch_streamingIncomplete}
        />
      )}
    </>
  );
}

export { StreamingRichText };
