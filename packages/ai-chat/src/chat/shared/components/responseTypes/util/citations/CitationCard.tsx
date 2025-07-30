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
import { CitationCardContent, CitationType } from "./CitationCardContent";
import { ExpandToPanelCard } from "./ExpandToPanelCard";
import {
  ConversationalSearchItemCitation,
  SearchResult,
} from "../../../../../../types/messaging/Messages";
import { isValidURL } from "../../../../utils/htmlUtils";

/**
 * This component takes a ConversationalSearchItemCitation OR a SearchResult and decides which kind of tile to display
 * it in.
 */

function CitationCard({
  citation,
  isSelected,
  onSelectCitation,
  relatedSearchResult,
}: {
  citation: ConversationalSearchItemCitation;
  isSelected?: boolean;
  onSelectCitation?: () => void;
  relatedSearchResult?: SearchResult;
}) {
  const { url } = citation;

  function getType(): CitationType {
    if (url && isValidURL(url)) {
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

export { CitationCardExport as CitationCard };
