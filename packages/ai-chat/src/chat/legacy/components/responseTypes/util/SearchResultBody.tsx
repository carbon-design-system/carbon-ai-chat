/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import {
  convertPossibleStringifiedArrayToFirstString,
  convertToEmptyStringIfStringifiedNull,
} from "../../../../utils/lang/stringUtils";
import {
  ConversationalSearchItemCitation,
  SearchResult,
} from "../../../../../types/messaging/Messages";

interface SearchResultBodyWithCitationProps {
  relatedSearchResult: SearchResult;
  citationItem: ConversationalSearchItemCitation;
}

/**
 * In conversational search citation panels we show the search result body because it will contain the most context for the user.
 * This will only be used if there is no url attached to the source, so the assumption is that the data will be nicely formatted
 * from document ingestion instead of a web crawler. We also make sure to highlight the citation text within the search result body
 * to help the user find the citation.
 */
function SearchResultBodyWithCitationHighlighted({
  relatedSearchResult,
  citationItem,
}: SearchResultBodyWithCitationProps) {
  const elementsArray: React.JSX.Element[] = [];
  let searchString;
  let citationString;

  if (relatedSearchResult?.body) {
    const searchStringFromBody = convertPossibleStringifiedArrayToFirstString(
      convertToEmptyStringIfStringifiedNull(relatedSearchResult.body),
    );
    // Search result body's can contain <em> and </em> tags which need to be removed. After remove the em tags, it
    // should be safe to assume that the citation text is a direct substring of either the search_result body or title.
    searchString = searchStringFromBody
      .replace("<em>", "")
      .replace("</em>", "");
  }
  if (citationItem?.text) {
    citationString = convertPossibleStringifiedArrayToFirstString(
      convertToEmptyStringIfStringifiedNull(citationItem.text),
    );
  }

  if (searchString && citationString) {
    const startOfCitation = searchString.indexOf(citationString);
    // If the citation string is not within the search string from the search_result body than the citation was from the
    // search_result title which doesn't get this highlight treatment.
    if (startOfCitation !== -1) {
      // Add the text prior to the citation to the array.
      elementsArray.push(
        <span key={1}>{searchString.substring(0, startOfCitation)}</span>,
      );
      // Add the highlighted citation text to the array.
      elementsArray.push(
        <em key={2} className="cds-aichat--search-result-highlight">
          {searchString.substring(
            startOfCitation,
            startOfCitation + citationString.length,
          )}
        </em>,
      );
      // Add the text after the citation to the array.
      elementsArray.push(
        <span key={3}>
          {searchString.substring(startOfCitation + citationString.length)}
        </span>,
      );
    }
  }

  if (elementsArray.length) {
    // If we had a search string and a citation string then we were able to form a highlighted search body which should
    // be used.
    return elementsArray;
  }
  if (searchString.length) {
    // If we couldn't form a highlighted search body then just use the search string. This could happen if the citation
    // string was in the title of the search_result instead of in the body.
    return [<span key="search-string">{searchString}</span>];
  }
  // If for some reason we couldn't create a search string then use the citation string.
  return [<span key="citation-string">{citationString}</span>];
}

const SearchResultBodyWithCitationHighlightedExport = React.memo(
  SearchResultBodyWithCitationHighlighted,
);

export { SearchResultBodyWithCitationHighlightedExport as SearchResultBodyWithCitationHighlighted };
