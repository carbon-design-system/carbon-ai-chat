/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ChevronDown from "@carbon/icons-react/es/ChevronDown.js";
import ChevronUp from "@carbon/icons-react/es/ChevronUp.js";
import { OperationalTag } from "@carbon/react";
import React, { useEffect, useState } from "react";

import { useCounter } from "../../../hooks/useCounter";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { useServiceManager } from "../../../hooks/useServiceManager";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import { consoleError } from "../../../utils/miscUtils";
import {
  ConversationalSearchItem,
  ConversationalSearchItemCitation,
} from "../../../../../types/messaging/Messages";
import { processMarkdown } from "../../../../web-components/components/markdownText/markdown/markdownToHTML";
import { MarkdownText } from "../../../../react/components/markdownText/MarkdownText";

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
  const toggleID = `WACConversationalSearchText-${useCounter()}${
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
    async function getHtml() {
      const newHtml = await createHTMLWithHighlights(text, highlightCitation);
      setHtml(newHtml);
    }
    getHtml();
  }, [text, highlightCitation, showCitationsToggle]);

  return (
    <div className="WACConversationalSearchText">
      <MarkdownText markdown={html} sanitizeHTML={false} />
      {showCitationsToggle && (
        <div className="WACConversationalSearchText__CitationsToggleContainer">
          <div className="WACConversationalSearchText__CitationsToggle">
            <OperationalTag
              id={toggleID}
              onClick={onToggleCitations}
              aria-expanded={citationsOpen}
              text={languagePack.conversationalSearch_citationsLabel}
              renderIcon={citationsOpen ? ChevronUp : ChevronDown}
              aria-label={languagePack.conversationalSearch_toggleCitations}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const HIGHLIGHT_TOKEN_START = "@@:wc-source:@@";
const HIGHLIGHT_TOKEN_END = "@@/:wc-source:@@";
const HIGHLIGHT_TOKEN_REGEXP = /@@\/?:wc-source:@@/g;

/**
 * Takes the given text as markdown and converts it to html with the given citation highlighted in the html. This
 * will insert span elements into the html that represent the text ranges present in the citation.
 *
 * @param text The text to convert to html and highlight.
 * @param highlightCitation The citation that indicates what should be highlighted.
 */
async function createHTMLWithHighlights(
  text: string,
  highlightCitation: ConversationalSearchItemCitation
) {
  // Highlighting a citation is a bit messy. The back-end provides us with text ranges in the original search result
  // but those ranges don't pay attention to the structure of the content and thus it's possible for a range to
  // cross boundaries of structures in the rich text. For example, it's possible for a range to start half-way
  // through a paragraph and extend down to the middle point of a list item in a list below (although something so
  // crazy is probably not actually going to happen). To address this, we need to process all the rich content into the
  // entire tree of DOM nodes and then highlight every individual text (leaf) node that comes between the start of the
  // range and the end of the range.
  //
  // When highlighting a citation, this code will first inject tokens into the markdown at the start and end of each
  // highlight range. Then the markdown is converted into html and the tokens should survive the process. This will
  // allow us to keep track of where the highlighting starts and ends. After that, the html is dropped into a DOM
  // element so the browser will parser it into a tree. Then we walk the element tree looking for text nodes that
  // contain the highlight tokens. We will then insert span elements as appropriate where each of those text nodes
  // appear in order to achieve highlight and remove the tokens. The spans are inserted inside of every node that is
  // highlighted which allows us to highlight a range that crosses block boundaries.

  const ranges = highlightCitation?.ranges;

  if (ranges?.length) {
    // Inject tokens into the text at the boundaries of the text highlight.
    const pieces: string[] = [];

    let startIndex = 0;
    ranges.forEach((range) => {
      const beforeHighlight = text.substring(startIndex, range.start);
      const highlight = text.substring(range.start, range.end);

      pieces.push(beforeHighlight);
      pieces.push(HIGHLIGHT_TOKEN_START);
      pieces.push(highlight);
      pieces.push(HIGHLIGHT_TOKEN_END);

      startIndex = range.end;
    });

    const lastPiece = text.substring(startIndex, text.length);
    pieces.push(lastPiece);

    text = pieces.join("");
  }

  const afterMarkdownHTML = await processMarkdown(text, true);

  if (ranges) {
    try {
      // Now stuff the html into an element so we can walk through it looking for the tokens.
      const rootElement = document.createElement("div");
      rootElement.innerHTML = afterMarkdownHTML;

      if (ranges) {
        // Look for the highlight tokens and add highlights as necessary.
        insertHighlights(rootElement, false);
      }

      return rootElement.innerHTML;
    } catch (error) {
      consoleError(
        "An error occurred processing source highlights.",
        text,
        highlightCitation,
        error
      );
    }
  }
  return afterMarkdownHTML;
}

/**
 * Inserts highlights into the given Node by looking for the highlight tokens in any text nodes located inside.
 *
 * @param parent The node is insert highlights into.
 * @param isInHighlight Indicates if a "begin highlight" token has already been seen previously and the content of this
 * Node start off highlighted.
 */
function insertHighlights(parent: Node, isInHighlight: boolean) {
  const childNodes = Array.from(parent.childNodes);
  childNodes.forEach((child) => {
    if (child instanceof Text) {
      const text = child.textContent;
      const tokenMatches = Array.from(text.matchAll(HIGHLIGHT_TOKEN_REGEXP));
      if (!tokenMatches.length && !isInHighlight) {
        // This child does not contain a token and is not inside a highlight so just short-circuit and don't do
        // anything.
      } else {
        // We need to add some highlighting, so this child needs to be replaced by nodes that have highlighting. The
        // child may have multiple tokens so it may result in multiple nodes being added.
        let startIndex = 0;
        tokenMatches.forEach((match) => {
          // If we get an end token then all the text before is inside a highlight.
          const isInHighlightHere = match[0] === HIGHLIGHT_TOKEN_END;
          const textContent = text.substring(startIndex, match.index);
          startIndex = match.index + match[0].length;

          // Add the text for before this token.
          addTextSegment(textContent, isInHighlightHere, parent, child);

          // Highlighting will flip to the opposite value after this node until the next highlight token appears.
          isInHighlight = !isInHighlightHere;
        });

        // If there is any text after the last token, we need to include that too.
        const lastText = text.substring(startIndex, text.length);
        addTextSegment(lastText, isInHighlight, parent, child);

        // Remove the child now that it was replaced.
        child.remove();
      }
    } else if (child instanceof Element) {
      // If our tokens somehow found their way into an attribute, remove them.
      child.getAttributeNames().forEach((name) => {
        const value = child.getAttribute(name);
        if (value) {
          child.setAttribute(
            name,
            value.replaceAll(HIGHLIGHT_TOKEN_REGEXP, "")
          );
        }
      });
    }

    // Recurse through the tree.
    isInHighlight = insertHighlights(child, isInHighlight);
  });

  return isInHighlight;
}

/**
 * Adds the given text as a child node of the given parent.
 *
 * @param text The text to add.
 * @param highlighted Indicates if the text should be highlighted.
 * @param parent The parent to add the text to.
 * @param beforeChild The existing child of the parent to insert the text before.
 */
function addTextSegment(
  text: string,
  highlighted: boolean,
  parent: Node,
  beforeChild: Node
) {
  if (text) {
    const textNode = document.createTextNode(text);

    // Don't highlight empty node. This avoids us inserting spans where they're not allowed just because there was a
    // newline inserted into the document. This may occasionally cause the highlight to miss intended whitespace but
    // that should be rare and not important.
    if (highlighted && text.trim()) {
      // We need to insert a highlighted span containing this text.
      const highlightNode = document.createElement("span");
      highlightNode.className = `WACConversationalSearchText--hasCitation`;
      highlightNode.appendChild(textNode);
      parent.insertBefore(highlightNode, beforeChild);
    } else {
      parent.insertBefore(textNode, beforeChild);
    }
  }
}

const ConversationalSearchTextExport = React.memo(ConversationalSearchText);

export {
  ConversationalSearchTextExport as ConversationalSearchText,
  ConversationalSearchTextFunctions,
};
