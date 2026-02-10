/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { SearchResultBodyWithCitationHighlighted } from "../../components-legacy/responseTypes/util/SearchResultBody";
import type {
  ConversationalSearchItemCitation,
  SearchResult,
} from "../../../types/messaging/Messages";

interface ViewSourcePanelProps {
  citationItem?: ConversationalSearchItemCitation;
  relatedSearchResult?: SearchResult;
}

/**
 * This panel is used to show the text of a conversational search citation.
 */
const ViewSourcePanel: React.FC<ViewSourcePanelProps> = ({
  citationItem,
  relatedSearchResult,
}) => {
  let content: React.ReactNode = null;

  if (citationItem) {
    if (relatedSearchResult) {
      content = (
        <SearchResultBodyWithCitationHighlighted
          relatedSearchResult={relatedSearchResult}
          citationItem={citationItem}
        />
      );
    } else {
      content = citationItem.text;
    }
  }

  return (
    <div className="cds-aichat--panel-content cds-aichat--view-source-panel">
      <div className="cds-aichat--view-source-panel__content">{content}</div>
    </div>
  );
};

export default ViewSourcePanel;
