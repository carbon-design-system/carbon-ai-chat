/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect } from 'react';
import Carousel from '@carbon/ai-chat-components/es/react/carousel.js';
import { CitationCard } from '../../../components-legacy/responseTypes/util/citations/CitationCard';
import { useSelector } from '../../../hooks/useSelector';
import { shallowEqual } from '../../../store/appStore';
import { AppState } from '../../../../types/state/AppState';
import {
  ConversationalSearchItemCitation,
  SearchResult,
} from '../../../../types/messaging/Messages';

interface ConversationalSearchCitationsProps {
  citations: ConversationalSearchItemCitation[];
  searchResults?: SearchResult[];
  selectedCitationIndex: number;
  onSelectCitation: (index: number) => void;
  onChange: (index: number) => void;
  onReady: () => void;
}

export default function ConversationalSearchCitations({
  citations,
  searchResults,
  selectedCitationIndex,
  onSelectCitation,
  onChange,
  onReady,
}: ConversationalSearchCitationsProps) {
  const languagePack = useSelector(
    (state: AppState) => ({
      carousel_nextNavButton: state.languagePack.carousel_nextNavButton,
      carousel_prevNavButton: state.languagePack.carousel_prevNavButton,
    }),
    shallowEqual
  );
  useEffect(() => onReady(), [onReady]);

  return (
    <div className="cds-aichat--conversational-search-citations">
      <Carousel
        nextBtnText={languagePack.carousel_nextNavButton}
        previousBtnText={languagePack.carousel_prevNavButton}
        onChange={(event: CustomEvent<{ currentIndex: number }>) =>
          onChange(event.detail.currentIndex)
        }>
        <div>
          {citations?.map((citation, index) => (
            <CitationCard
              key={index}
              citation={citation}
              isSelected={index === selectedCitationIndex}
              onSelectCitation={() => onSelectCitation(index)}
              relatedSearchResult={searchResults?.[citation.search_result_idx]}
            />
          ))}
        </div>
      </Carousel>
    </div>
  );
}
