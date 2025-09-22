/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Link16 from "@carbon/icons/es/link/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import { carbonIconToReact } from "../../../../utils/carbonIcon";
import React, { useLayoutEffect, useRef } from "react";

import { useLanguagePack } from "../../../../hooks/useLanguagePack";
import { useWindowSize } from "../../../../hooks/useWindowSize";
import {
  ConversationalSearchItemCitation,
  SearchResult,
} from "../../../../../types/messaging/Messages";

enum CitationType {
  /**
   * If the citation has a url.
   */
  URL = "url",

  /**
   * If the citation has no url, if its full contents don't fit in the card, you can click on it to see a panel with the results.
   */
  EXPAND_IF_NEEDED = "expand",
}

interface CitationCardProps {
  /**
   * A citation from ConversationalSearch.
   */
  citation: ConversationalSearchItemCitation;

  /**
   * An optional handler for if focus is given to the card. We use this conversational search, currently, to
   * highlight the text that matches the citation.
   */
  onSelectCitation?: () => void;

  /**
   * If this is the selected item in the conversational search context.
   * A selected citation results in an extra highlight on the card and the the color of the corresponding highlight in
   * the search result is also changed to reflect the selection.
   */
  isSelected?: boolean;

  /**
   * If the citation is for a {@link ConversationalSearchItem} then the ExpandToPanelCard should show a search result in
   * the panel because it has extra text and detail that could be valuable to the user.
   */
  relatedSearchResult?: SearchResult;
}

/**
 * Shared inner rendering of content for all citation card types. If the citation type is EXPAND_IF_NEEDED will calculate
 * if the card contents can fit inside the card without an elipsis and report back to the parent.
 */

interface CitationCardContentProps
  extends Omit<CitationCardProps, "isSelected"> {
  type: CitationType;

  /**
   * If the citation type is EXPAND_IF_NEEDED and it is expandable we will house CitationCardContent in a clickable
   * tile instead of a static one. The value passed back from setIsExpandable to know if the tile should open a panel
   * to show more content.
   */
  isExpandable?: boolean;

  /**
   * If the citation type is EXPAND_IF_NEEDED this is defined and is used to tell the parent component if it should render
   * this content inside a clickable tile or a non-clickable tile after it has measured itself.
   */
  setIsExpandable?: React.Dispatch<React.SetStateAction<boolean>>;
}

function CitationCardContent({
  citation,
  type,
  setIsExpandable,
  isExpandable,
}: CitationCardContentProps) {
  const languagePack = useLanguagePack();
  const { width } = useWindowSize();
  const { conversationalSearch_viewSourceDocument } = languagePack;
  const ref = useRef<HTMLDivElement>(null);
  const Link = carbonIconToReact(Link16);
  const Maximize = carbonIconToReact(Maximize16);

  // If citation has a "text" property, we know its from conversational search. If not, its legacy search and needs to
  // be processed differently.
  const { text } = citation;

  // Checks if there is any need to allow expanding on the title. Watching window size changes as a clunky attempt to
  // deal with re-sizes, but that isn't really perfect.
  useLayoutEffect(() => {
    // If the tile is not currently expandable then check if there's enough content for the tile to expand.
    if (ref.current && !isExpandable && setIsExpandable) {
      if (ref.current.clientHeight && ref.current.scrollHeight) {
        setIsExpandable(ref.current.clientHeight < ref.current.scrollHeight);
      }
    }
  }, [text, isExpandable, setIsExpandable, width]);

  let label;
  let icon;

  if (type === CitationType.URL && citation.url) {
    label = new URL(citation.url).hostname;
    icon = <Link />;
  } else if (isExpandable) {
    icon = <Maximize />;
    label = conversationalSearch_viewSourceDocument;
  }

  return (
    <>
      <div className="cds-aichat--citation-card-header">
        <div className="cds-aichat--citation-card-title cds-aichat--widget__text-ellipsis">
          {citation.title}
        </div>
        <div ref={ref} className="cds-aichat--citation-card-text">
          {text}
        </div>
      </div>
      <div className="cds-aichat--citation-card-footer">
        {(label || icon) && (
          <>
            <div className="cds-aichat--citation-card-label cds-aichat--widget__text-ellipsis">
              {label}
            </div>
            <div className="cds-aichat--citation-card-icon">{icon}</div>
          </>
        )}
      </div>
    </>
  );
}

export { CitationCardContent, CitationType, CitationCardProps };
