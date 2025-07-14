/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ConversationalSearchItemCitation,
  SearchResult,
} from "../../../types/messaging/Messages";
import { isValidURL } from "./htmlUtils";
import { convertToEmptyStringIfStringifiedNull } from "./lang/stringUtils";

function getSearchResultURLMetaData(
  searchResult: ConversationalSearchItemCitation | SearchResult
) {
  let { url } = searchResult;
  url = url ? convertPossibleStringifiedArrayToFirstString(url) : undefined;
  const urlIsValid = url && isValidURL(url);

  return {
    url,
    urlIsValid,
  };
}

function getSearchResultMetaData(searchResult: SearchResult) {
  // First we check the searchResults.highlight.title which should be an array. If that is not set, we fall back to
  // searchResult.title which is either a string OR a stringified array. If it is the latter, we only want the first
  // item in the stringified array. https://github.ibm.com/watson-engagement-advisor/wea-backlog/issues/31262 has an
  // explanation.
  let title: string = searchResult.highlight?.title?.[0]
    ? stripHighlightsFromString(
        convertToEmptyStringIfStringifiedNull(searchResult.highlight.title[0])
      )
    : convertPossibleStringifiedArrayToFirstString(
        convertToEmptyStringIfStringifiedNull(searchResult.title)
      );

  const { url, urlIsValid } = getSearchResultURLMetaData(searchResult);
  // If title is null and url is valid, use the URL in place of title see bug
  // https://github.ibm.com/Watson-Discovery/customer-care/issues/297.
  let titleIsURL = false;
  if (!title && urlIsValid) {
    title = url;
    titleIsURL = true;
  }

  let answer: string;
  // If answers param is present, use it on header and render searchResult.highlight.body as a body.
  if (searchResult.answers?.length > 0) {
    answer = searchResult.answers?.[0].text;
  }

  return { title, titleIsURL, url, urlIsValid, answer };
}

/**
 * Under the covers before it gets to us, a title/body may have been a stringified array. We need to remove the [""]
 * if that is the case.
 *
 * @param str A string for the title or body of the search card.
 */
function convertPossibleStringifiedArrayToFirstString(str: string): string {
  if (typeof str === "string" && str.startsWith('["') && str.endsWith('"]')) {
    try {
      [str] = JSON.parse(str);
    } catch (error) {
      // Not an array of strings, so do nothing.
    }
  }
  return str;
}

/**
 * Removes the highlights from the string in this case mostly from title field as it does not add any value in
 * the single line ellipses title.
 *
 * @param str A string for the title of the search card.
 */
function stripHighlightsFromString(str: string): string {
  return str ? str.replace(new RegExp("<em>|</em>", "g"), "") : null;
}

export { getSearchResultMetaData };
