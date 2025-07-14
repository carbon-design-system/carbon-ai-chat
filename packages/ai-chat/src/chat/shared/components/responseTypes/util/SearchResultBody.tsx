/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { ReactNode } from "react";

import { isOdd } from "../../../utils/lang/langUtils";
import {
  convertPossibleStringifiedArrayToFirstString,
  convertToEmptyStringIfStringifiedNull,
} from "../../../utils/lang/stringUtils";
import {
  ConversationalSearchItemCitation,
  SearchResult,
} from "../../../../../types/messaging/Messages";

/**
 * Returns a {@link ReactNode} that represents the given text with `<em>` tags in the string replaced with actual
 * JSX elements to form highlighted portions.
 */
function formatHighlightFields(str: string): ReactNode {
  const strArray = str.split(new RegExp("<em>|</em>", "g"));
  // If there is an odd number of '<em>' separators, then just return the whole string, minus the '<em>' elements.
  if (isOdd(strArray.length)) {
    return [strArray.join("")];
  }
  return strArray.map((strSegment, index) => {
    if (isOdd(index)) {
      return strSegment;
    }

    return (
      // eslint-disable-next-line react/no-array-index-key
      <em key={index} className="WAC__highlight">
        {strSegment}
      </em>
    );
  });
}

interface SearchResultBodyProps {
  searchResult: SearchResult | ConversationalSearchItemCitation;
}

/**
 * Determine which element to render as the body and the amount of text that will be displayed in it.
 * Always use highlight.body, Use body as a fallback based on certain conditions
 * This was driven by https://github.ibm.com/Watson-Discovery/customer-care/issues/660
 * We check the searchResults.highlight.body which should be an array. If that is not set, we fall back to
 * searchResult.body which is either a string OR a stringified array. If it is the latter, we only want the first
 * item in the stringified array. https://github.ibm.com/watson-engagement-advisor/wea-backlog/issues/31262 has an
 * explanation.
 */
function SearchResultBody({ searchResult }: SearchResultBodyProps) {
  if (searchResult && "highlight" in searchResult) {
    if (searchResult.highlight?.body?.[0]) {
      return formatHighlightFields(
        convertToEmptyStringIfStringifiedNull(searchResult.highlight.body[0])
      );
    }
  }
  if (searchResult && "body" in searchResult && searchResult.body) {
    return convertPossibleStringifiedArrayToFirstString(
      convertToEmptyStringIfStringifiedNull(searchResult.body)
    );
  }
  return null;
}

const SearchResultBodyExport = React.memo(SearchResultBody);

interface SearchResultBodyWithCitationProps {
  relatedSearchResult: SearchResult;
  citationItem: ConversationalSearchItemCitation;
}

/**
 * In conversational search citation panels we show the search result body instead of the citation text or highlight
 * body because it will contain the most context for the user. This will only be used if there is no url or
 * pdf attached to the source, so the assumption is that the data will be nicely formatted from document ingestion
 * instead of a web crawler. We also make sure to highlight the citation text within the search result body to help the
 * user find the citation.
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
      convertToEmptyStringIfStringifiedNull(relatedSearchResult.body)
    );
    // Search result body's can contain <em> and </em> tags which need to be removed. After remove the em tags, it
    // should be safe to assume that the citation text is a direct substring of either the search_result body or title.
    searchString = searchStringFromBody
      .replace("<em>", "")
      .replace("</em>", "");
  }
  if (citationItem?.text) {
    citationString = convertPossibleStringifiedArrayToFirstString(
      convertToEmptyStringIfStringifiedNull(citationItem.text)
    );
  }

  if (searchString && citationString) {
    const startOfCitation = searchString.indexOf(citationString);
    // If the citation string is not within the search string from the search_result body than the citation was from the
    // search_result title which doesn't get this highlight treatment.
    if (startOfCitation !== -1) {
      // Add the text prior to the citation to the array.
      elementsArray.push(
        <span key={1}>{searchString.substring(0, startOfCitation)}</span>
      );
      // Add the highlighted citation text to the array.
      elementsArray.push(
        <em key={2} className="WAC__highlight">
          {searchString.substring(
            startOfCitation,
            startOfCitation + citationString.length
          )}
        </em>
      );
      // Add the text after the citation to the array.
      elementsArray.push(
        <span key={3}>
          {searchString.substring(startOfCitation + citationString.length)}
        </span>
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
  SearchResultBodyWithCitationHighlighted
);

export {
  SearchResultBodyExport as SearchResultBody,
  SearchResultBodyWithCitationHighlightedExport as SearchResultBodyWithCitationHighlighted,
};
