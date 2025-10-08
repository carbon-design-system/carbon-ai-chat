/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { Suspense, useMemo, useRef, useState } from "react";
import type { SwiperRef } from "swiper/react";

import { ScrollElementIntoViewFunction } from "../../MessagesComponent";
import { useCallbackOnChange } from "../../../hooks/useCallbackOnChange";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { HasDoAutoScroll } from "../../../../types/utilities/HasDoAutoScroll";
import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import { SkeletonPlaceholder } from "../../SkeletonPicker";
import InlineError from "../error/InlineError";
import { CitationCard } from "../util/citations/CitationCard";
import { ConversationalSearchText } from "./ConversationalSearchText";
import {
  ConversationalSearchItem,
  ConversationalSearchItemCitation,
} from "../../../../types/messaging/Messages";
import Carousel from "../carousel/Carousel";

interface ConversationalSearchProps extends HasDoAutoScroll {
  /**
   * The search item to display.
   */
  localMessageItem: LocalMessageItem<ConversationalSearchItem>;

  /**
   * This is used to scroll the citations carousel into view.
   */
  scrollElementIntoView: ScrollElementIntoViewFunction;

  /**
   * Indicates if this should display an error message.
   */
  isStreamingError: boolean;
}

function ConversationalSearch({
  localMessageItem,
  scrollElementIntoView,
  isStreamingError,
  doAutoScroll,
}: ConversationalSearchProps) {
  const [selectedCitationIndex, setSelectedCitationIndex] = useState<number>(0);
  const [citationsOpen, setCitationsOpen] = useState(false);
  const scrollIntoViewArea = useRef<HTMLDivElement>(undefined);
  const swiperRef = useRef<SwiperRef>(undefined);
  const languagePack = useLanguagePack();

  const messageItem = localMessageItem.item;

  const sortedCitations = useMemo(
    () => sortCitations(messageItem.citations),
    [messageItem.citations],
  );

  function scrollCitations() {
    // The large bottom padding is to push the citations panel above the suggestions button (if it happens to be
    // present). The larger top padding also ensures the toggle button (which is just above the carousel) is also
    // still in view.
    setTimeout(
      () => scrollElementIntoView(scrollIntoViewArea.current, 32, 64),
      50,
    );
  }

  // If the chunks change, kick off an auto-scroll.
  useCallbackOnChange(
    localMessageItem.ui_state.streamingState?.chunks,
    doAutoScroll,
  );

  // Note: the AI button below has a specific component in the latest Carbon library we could swap in after we
  // upgrade our Carbon version.

  function onSelectCitation(index: number) {
    setCitationsOpen(true);
    setSelectedCitationIndex(index);
    setTimeout(() => swiperRef.current?.swiper.slideTo(index));
    scrollCitations();
  }

  function onToggleCitations() {
    setCitationsOpen(!citationsOpen);
    if (!citationsOpen) {
      scrollCitations();
    }
  }

  function renderCitations() {
    const tiles = sortedCitations?.map((citation, index) => (
      <CitationCard
        // eslint-disable-next-line react/no-array-index-key
        key={index}
        citation={citation}
        isSelected={index === selectedCitationIndex}
        onSelectCitation={() => onSelectCitation(index)}
        // If there is no url or pdf on the citation than the citation will open a panel to show more information. The
        // citation should include a search_result_idx that we can use that to get the corresponding search_result from
        // the search_results array. We then use this search result in the panel to give the user extra context about
        // the citation they clicked on.
        relatedSearchResult={
          messageItem.search_results?.[citation.search_result_idx]
        }
      />
    ));

    return (
      <div className="cds-aichat--conversational-search-citations">
        <Suspense fallback={<SkeletonPlaceholder />}>
          <Carousel
            swiperRef={swiperRef}
            initialSlide={selectedCitationIndex}
            onSlideChange={setSelectedCitationIndex}
          >
            {tiles}
          </Carousel>
        </Suspense>
      </div>
    );
  }

  return (
    <div className="cds-aichat--conversational-search">
      <ConversationalSearchText
        searchItem={localMessageItem}
        showCitationsToggle={Boolean(sortedCitations?.length)}
        highlightCitation={
          citationsOpen ? sortedCitations?.[selectedCitationIndex] : null
        }
        onToggleCitations={onToggleCitations}
        citationsOpen={citationsOpen}
      />
      {isStreamingError && (
        <InlineError
          text={languagePack.conversationalSearch_streamingIncomplete}
        />
      )}
      <div ref={scrollIntoViewArea}>{citationsOpen && renderCitations()}</div>
    </div>
  );
}

/**
 * Sorts the given array of citations. This will move any citation without any highlight ranges to the end of the array.
 */
function sortCitations(citations: ConversationalSearchItemCitation[]) {
  if (!citations) {
    return null;
  }
  const withRanges = citations.filter((citation) => citation.ranges?.length);
  const withoutRanges = citations.filter(
    (citation) => !citation.ranges?.length,
  );
  return withRanges.concat(withoutRanges);
}

export { ConversationalSearch };
