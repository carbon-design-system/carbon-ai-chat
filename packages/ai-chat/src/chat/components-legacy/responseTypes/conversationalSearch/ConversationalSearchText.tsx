/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ChevronDown16 from "@carbon/icons/es/chevron--down/16.js";
import ChevronUp16 from "@carbon/icons/es/chevron--up/16.js";

import React, { useEffect, useState } from "react";

import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import {
  ConversationalSearchItem,
  ConversationalSearchItemCitation,
} from "../../../../types/messaging/Messages";
import { MarkdownWithDefaults } from "../../../components/util/MarkdownWithDefaults";
import { useCounter } from "../../../hooks/useCounter";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { useServiceManager } from "../../../hooks/useServiceManager";
import OperationalTag from "../../../components/carbon/OperationalTag";
import { carbonIconToReact } from "../../../utils/carbonIcon";

const ChevronDown = carbonIconToReact(ChevronDown16);
const ChevronUp = carbonIconToReact(ChevronUp16);

interface ConversationalSearchTextFunctions {
  /**
   * Returns the html element of the toggle button in the conversational search text that opens and closes the
   * conversational search citation cards view.
   */
  getToggleCitationsElement: () => HTMLButtonElement;
}

interface ConversationalSearchTextProps {
  /**
   * The item to render.
   */
  searchItem: LocalMessageItem<ConversationalSearchItem>;

  /**
   * The citation that is selected. This content in the search item that matches this citation will be highlighted.
   */
  highlightCitation: ConversationalSearchItemCitation;

  /**
   * Indicates if the citations toggle button should be shown.
   */
  showCitationsToggle: boolean;

  /**
   * The callback to call when the user clicks the toggle button to open or close the citations list.
   */
  onToggleCitations: () => void;

  /**
   * Indicates if the citations list is currently open.
   */
  citationsOpen: boolean;
}

function ConversationalSearchText(props: ConversationalSearchTextProps) {
  const {
    highlightCitation,
    onToggleCitations,
    citationsOpen,
    searchItem,
    showCitationsToggle,
  } = props;
  const languagePack = useLanguagePack();
  const serviceManager = useServiceManager();
  const { streamingState } = searchItem.ui_state;
  const toggleID = `cds-aichat--conversational-search-text-${useCounter()}${
    serviceManager.namespace.suffix
  }`;
  const [html, setHtml] = useState("");

  let text: string;
  if (streamingState && !streamingState.isDone) {
    text = streamingState.chunks.map((chunk) => chunk.text).join("");
  } else {
    text = searchItem.item.text;
  }

  useEffect(() => {
    const processedText = insertHighlightMarkdown(text, highlightCitation);
    setHtml(processedText);
  }, [text, highlightCitation, showCitationsToggle, streamingState]);

  return (
    <div className="cds-aichat--conversational-search-text">
      <MarkdownWithDefaults
        text={html}
        overrideSanitize={false}
        streaming={streamingState && !streamingState.isDone}
        highlight={true}
      />
      {showCitationsToggle && (
        <div className="cds-aichat--conversational-search-text__CitationsToggleContainer">
          <div className="cds-aichat--conversational-search-text__CitationsToggle">
            <OperationalTag
              id={toggleID}
              onClick={onToggleCitations}
              aria-expanded={citationsOpen}
              text={languagePack.conversationalSearch_citationsLabel}
              aria-label={languagePack.conversationalSearch_toggleCitations}
            >
              <span slot="icon">
                {citationsOpen ? <ChevronUp /> : <ChevronDown />}
              </span>
            </OperationalTag>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inserts markdown highlight syntax (==text==) around citation ranges in the given text.
 *
 * @param text The text to process.
 * @param highlightCitation The citation that indicates what should be highlighted.
 * @returns The text with markdown highlight syntax inserted.
 */
function insertHighlightMarkdown(
  text: string,
  highlightCitation: ConversationalSearchItemCitation,
): string {
  const ranges = highlightCitation?.ranges;

  if (!ranges?.length) {
    return text;
  }

  // Sort ranges by start position in descending order to avoid offset issues
  const sortedRanges = [...ranges].sort((a, b) => b.start - a.start);

  let processedText = text;

  // Process ranges from end to start to avoid offset issues
  for (const range of sortedRanges) {
    const beforeHighlight = processedText.substring(0, range.start);
    const highlight = processedText.substring(range.start, range.end);
    const afterHighlight = processedText.substring(range.end);

    // Only highlight non-empty text that contains non-whitespace characters
    if (highlight.trim()) {
      processedText =
        beforeHighlight + "==" + highlight + "==" + afterHighlight;
    }
  }

  return processedText;
}

const ConversationalSearchTextExport = React.memo(ConversationalSearchText);

export {
  ConversationalSearchTextExport as ConversationalSearchText,
  ConversationalSearchTextFunctions,
};
