/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Link from "@carbon/icons-react/es/Link.js";
import Maximize from "@carbon/icons-react/es/Maximize.js";
import React, { useLayoutEffect, useRef } from "react";

import { useLanguagePack } from "../../../../hooks/useLanguagePack";
import { useWindowSize } from "../../../../hooks/useWindowSize";
import { SearchResultBody } from "../SearchResultBody";
import { CitationCardProps, CitationType } from "./CitationCard";

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

  // If citation has a "text" property, we know its from conversational search. If not, its legacy search and needs to
  // be processed differently.
  const textContent = "text" in citation && citation.text;
  const content = textContent || <SearchResultBody searchResult={citation} />;

  // Checks if there is any need to allow expanding on the title. Watching window size changes as a clunky attempt to
  // deal with re-sizes, but that isn't really perfect.
  useLayoutEffect(() => {
    // If the tile is not currently expandable then check if there's enough content for the tile to expand.
    if (ref.current && !isExpandable && setIsExpandable) {
      if (ref.current.clientHeight && ref.current.scrollHeight) {
        setIsExpandable(ref.current.clientHeight < ref.current.scrollHeight);
      }
    }
  }, [textContent, isExpandable, setIsExpandable, width]);

  let label;
  let icon;

  if (type === CitationType.URL && citation.url) {
    label = new URL(citation.url).hostname;
    icon = <Link size={16} />;
  } else if (isExpandable) {
    icon = <Maximize size={16} />;
    label = conversationalSearch_viewSourceDocument;
  }

  return (
    <>
      <div className="WACCitationCard_Header">
        <div className="WACCitationCard_Title WACWidget__textEllipsis">
          {citation.title}
        </div>
        <div ref={ref} className="WACCitationCard_Text">
          {content}
        </div>
      </div>
      <div className="WACCitationCard_Footer">
        {(label || icon) && (
          <>
            <div className="WACCitationCard_Label WACWidget__textEllipsis">
              {label}
            </div>
            <div className="WACCitationCard_Icon">{icon}</div>
          </>
        )}
      </div>
    </>
  );
}

export { CitationCardContent };
