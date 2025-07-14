/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { Tile } from "@carbon/react";
import cx from "classnames";
import React from "react";
import { CitationCardContent } from "./CitationCardContent";
import { ExpandToPanelCard } from "./ExpandToPanelCard";
import {
  ConversationalSearchItemCitation,
  SearchResult,
} from "../../../../../../types/messaging/Messages";
import { getSearchResultMetaData } from "../../../../utils/searchUtils";

/**
 * This component takes a ConversationalSearchItemCitation OR a SearchResult and decides which kind of tile to display
 * it in.
 */

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
   * A citation either from ConversationalSearch or from legacy (non-conversational) search. Confusingly,
   * {@link ConversationalSearchItem} contains it's own search_result array. Those searchResults are not the
   * searchResults that will be used for this citation prop here. Instead only legacy search will supply a searchResult
   * item for the citation and this will come from the {@link SearchResultItem} in either the results, primary_results,
   * or additional_results arrays. ConversationalSearch will supply a ConversationalSearchItemCitation for this prop, as
   * well as a searchResult prop lower down. This search_result is from the ConversationalSearchItem that corresponds to
   * this specific citation.
   */
  citation: ConversationalSearchItemCitation | SearchResult;

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

function CitationCard({
  citation,
  isSelected,
  onSelectCitation,
  relatedSearchResult,
}: CitationCardProps) {
  const { url, urlIsValid } = getSearchResultMetaData(citation as any);

  function getType(): CitationType {
    if (url && urlIsValid) {
      return CitationType.URL;
    }
    return CitationType.EXPAND_IF_NEEDED;
  }

  const type = getType();
  const className = cx(
    "WACCitationCard",
    {
      "WACCitationCard--selected": isSelected,
      "WACCitationCard--clickable": type === CitationType.URL,
      "WACCitationCard--url": type === CitationType.URL,
      "WACCitationCard--no-url": type !== CitationType.URL,
    },
    "WACWidget__textEllipsis"
  );

  if (type === CitationType.URL) {
    return (
      // eslint-disable-next-line jsx-a11y/control-has-associated-label
      <a
        className={className}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onSelectCitation}
        onFocus={onSelectCitation}
      >
        <Tile>
          <CitationCardContent citation={citation} type={type} />
        </Tile>
      </a>
    );
  }

  return (
    <ExpandToPanelCard
      citation={citation}
      className={className}
      onSelectCitation={onSelectCitation}
      relatedSearchResult={relatedSearchResult}
    />
  );
}

const CitationCardExport = React.memo(CitationCard);

export { CitationCardExport as CitationCard, CitationType, CitationCardProps };
