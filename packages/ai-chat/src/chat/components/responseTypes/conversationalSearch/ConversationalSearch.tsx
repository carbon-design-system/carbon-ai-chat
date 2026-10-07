/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createComponent } from '@lit/react';
import SkeletonPlaceholderElement from '@carbon/web-components/es/components/skeleton-placeholder/skeleton-placeholder.js';
import ConversationalSearchText from '@carbon/ai-chat-components/es/react/conversational-search-text.js';
import {
  insertHighlightMarkdown,
  sortCitations,
} from '@carbon/ai-chat-components/es/components/conversational-search/src/citation-utils.js';
import { ScrollElementIntoViewFunction } from '../../../components-legacy/MessagesComponent';
import { useSelector } from '../../../hooks/useSelector';
import { useCounter } from '../../../hooks/useCounter';
import { useServiceManager } from '../../../hooks/useServiceManager';
import { shallowEqual } from '../../../store/appStore';
import { AppState } from '../../../../types/state/AppState';
import { LocalMessageItem } from '../../../../types/messaging/LocalMessageItem';
import { ConversationalSearchItem } from '../../../../types/messaging/Messages';
import { InlineError } from '../error/InlineError';
import { MarkdownWithDefaults } from '../../helpers/MarkdownWithDefaults/MarkdownWithDefaults';
import { CitationsErrorBoundary } from './CitationsErrorBoundary';

const Citations = lazy(() => import('./ConversationalSearchCitations'));
const SkeletonPlaceholder = createComponent({
  tagName: 'cds-skeleton-placeholder',
  elementClass: SkeletonPlaceholderElement,
  react: React,
});

interface ConversationalSearchProps {
  localMessageItem: LocalMessageItem<ConversationalSearchItem>;
  scrollElementIntoView: ScrollElementIntoViewFunction;
  isStreamingError: boolean;
}

function ConversationalSearch({
  localMessageItem,
  scrollElementIntoView,
  isStreamingError,
}: ConversationalSearchProps) {
  const [selectedCitationIndex, setSelectedCitationIndex] = useState(0);
  const [citationsOpen, setCitationsOpen] = useState(false);
  const citationsContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const citationsOpenRef = useRef(false);
  const serviceManager = useServiceManager();
  const toggleId = `cds-aichat--conversational-search-text-${useCounter()}${serviceManager.namespace.suffix}`;
  const languagePack = useSelector(
    (state: AppState) => ({
      conversationalSearch_citationsLabel:
        state.languagePack.conversationalSearch_citationsLabel,
      conversationalSearch_toggleCitations:
        state.languagePack.conversationalSearch_toggleCitations,
      conversationalSearch_streamingIncomplete:
        state.languagePack.conversationalSearch_streamingIncomplete,
    }),
    shallowEqual
  );
  const messageItem = localMessageItem.item;
  const sortedCitations = useMemo(
    () => sortCitations(messageItem.citations),
    [messageItem.citations]
  );
  const streamingState = localMessageItem.ui_state.streamingState;
  const streaming = Boolean(streamingState && !streamingState.isDone);
  const text = streaming
    ? streamingState.chunks.map((chunk) => chunk.text).join('')
    : messageItem.text;
  const highlightedText = insertHighlightMarkdown(
    text,
    citationsOpen ? sortedCitations?.[selectedCitationIndex] : null
  );

  const cancelScroll = useCallback(() => {
    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = undefined;
  }, []);

  const scrollCitations = useCallback(() => {
    cancelScroll();
    // Leave room for the toggle above and any suggestions below the cards.
    scrollTimerRef.current = setTimeout(() => {
      const target = citationsContainerRef.current;
      if (citationsOpenRef.current && target) {
        scrollElementIntoView(target, 32, 64);
      }
      scrollTimerRef.current = undefined;
    }, 50);
  }, [cancelScroll, scrollElementIntoView]);

  useEffect(() => {
    citationsOpenRef.current = citationsOpen;
    if (!citationsOpen) {
      cancelScroll();
    }
  }, [citationsOpen, cancelScroll]);
  useEffect(() => cancelScroll, [cancelScroll]);

  function onSelectCitation(index: number) {
    setCitationsOpen(true);
    setSelectedCitationIndex(index);
    scrollCitations();
  }

  function onToggleCitations(event: CustomEvent<{ open: boolean }>) {
    setCitationsOpen(event.detail.open);
    if (!event.detail.open) {
      cancelScroll();
    }
  }

  return (
    <div className="cds-aichat--conversational-search">
      <ConversationalSearchText
        className="cds-aichat--conversational-search__answer"
        citationsOpen={citationsOpen}
        showCitationsToggle={Boolean(sortedCitations?.length)}
        citationsLabel={languagePack.conversationalSearch_citationsLabel}
        toggleLabel={languagePack.conversationalSearch_toggleCitations}
        toggleId={toggleId}
        streaming={streaming}
        onCitationsToggle={onToggleCitations}
        onCitationsScroll={scrollCitations}>
        <MarkdownWithDefaults
          text={highlightedText}
          overrideSanitize={false}
          streaming={streaming}
          highlight
        />
      </ConversationalSearchText>
      {isStreamingError && (
        <InlineError
          text={languagePack.conversationalSearch_streamingIncomplete}
        />
      )}
      <div ref={citationsContainerRef}>
        {citationsOpen && (
          <CitationsErrorBoundary>
            <Suspense
              fallback={
                <SkeletonPlaceholder className="cds-aichat--conversational-search__skeleton" />
              }>
              <Citations
                citations={sortedCitations}
                searchResults={messageItem.search_results}
                selectedCitationIndex={selectedCitationIndex}
                onSelectCitation={onSelectCitation}
                onChange={setSelectedCitationIndex}
                onReady={scrollCitations}
              />
            </Suspense>
          </CitationsErrorBoundary>
        )}
      </div>
    </div>
  );
}

export { ConversationalSearch };
