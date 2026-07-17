/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ConversationalSearchItemCitation,
  SearchResult,
} from "../../messaging/Messages";

/**
 * The state of the conversational search citation panel.
 */
interface ViewSourcePanelState {
  /**
   * Indicates if the conversational search citation panel is open.
   */
  isOpen: boolean;

  /**
   * A citation either from ConversationalSearch or from legacy (non-conversational) search.
   */
  citationItem: ConversationalSearchItemCitation;

  /**
   * If the citation is for a {@link ConversationalSearchItem} then the ExpandToPanelCard should show a search result in
   * the panel because it has extra text and detail that could be valuable to the user.
   */
  relatedSearchResult?: SearchResult;
}

export type { ViewSourcePanelState };
