/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Tile from "../../../../components/carbon/Tile";
import React, { useState } from "react";

import { useServiceManager } from "../../../../hooks/useServiceManager";
import actions from "../../../../store/actions";
import { HasClassName } from "../../../../../types/utilities/HasClassName";
import {
  CitationCardContent,
  CitationCardProps,
  CitationType,
} from "./CitationCardContent";
import { CitationClickableCard } from "./CitationClickableCard";

/**
 * Shows a Citation Card that will add an onClick handler to open up content that doesn't fit in the card IF NEEDED.
 */

interface ExpandToPanelCardProps
  extends HasClassName, Omit<CitationCardProps, "type"> {}

function ExpandToPanelCard({
  className,
  citation,
  onSelectCitation,
  relatedSearchResult,
}: ExpandToPanelCardProps) {
  const serviceManager = useServiceManager();
  const { title } = citation;

  // If there's a searchResult that isn't empty than the card is expandable. Otherwise The CitationCardContent component
  // will measure itself with the citation text as its content and will let this component know if it can fit the
  // contents in the tile. If it can't fit the contents then it needs to be a clickable tile that can expand into a
  // panel.
  const [isExpandable, setIsExpandable] = useState(
    Boolean(relatedSearchResult?.body),
  );

  function onViewSourcePanelButtonClick() {
    // If a search result is provided we want to show that in the panel with the citation text highlighted, otherwise
    // just show the citation.
    serviceManager.store.dispatch(
      actions.setViewSourcePanelIsOpen(true, citation, relatedSearchResult),
    );
  }

  function renderTile(className?: string) {
    return (
      <Tile className={className}>
        <CitationCardContent
          citation={citation}
          type={CitationType.EXPAND_IF_NEEDED}
          setIsExpandable={setIsExpandable}
          isExpandable={isExpandable}
        />
      </Tile>
    );
  }

  if (!citation) {
    return null;
  }

  if (isExpandable) {
    return (
      <CitationClickableCard
        className={className}
        title={title}
        onClick={onViewSourcePanelButtonClick}
        onSelectCitation={onSelectCitation}
      >
        {renderTile()}
      </CitationClickableCard>
    );
  }

  return renderTile(className);
}

export { ExpandToPanelCard };
