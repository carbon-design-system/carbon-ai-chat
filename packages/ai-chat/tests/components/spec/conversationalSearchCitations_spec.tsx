/**
 * @jest-environment-options {"customExportConditions":["browser"]}
 */

/* eslint jsdoc/check-tag-names: ["error", { "definedTags": ["jest-environment-options"] }] */

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ConversationalSearchCitations from '../../../src/chat/components/responseTypes/conversationalSearch/ConversationalSearchCitations';
import { SearchResult } from '../../../src/types/messaging/Messages';

jest.mock('../../../src/chat/hooks/useSelector', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      languagePack: {
        carousel_nextNavButton: 'Next translated',
        carousel_prevNavButton: 'Previous translated',
      },
    }),
}));
jest.mock(
  '../../../src/chat/components-legacy/responseTypes/util/citations/CitationCard',
  () => ({
    CitationCard: ({
      citation,
      isSelected,
      relatedSearchResult,
      onSelectCitation,
    }: {
      citation: { title: string };
      isSelected: boolean;
      relatedSearchResult?: SearchResult;
      onSelectCitation: () => void;
    }) => (
      <button
        type="button"
        data-selected={isSelected}
        data-result={relatedSearchResult?.body}
        onClick={onSelectCitation}>
        {citation.title}
      </button>
    ),
  })
);

it('bridges real carousel navigation, card selection, related results, and translated labels', async () => {
  const onSelectCitation = jest.fn();
  const onChange = jest.fn();
  const onReady = jest.fn();
  const citations = [
    { title: 'First citation', search_result_idx: 1 },
    { title: 'Second citation', search_result_idx: 0 },
    { title: 'URL citation', url: 'https://example.com' },
  ];
  const searchResults: SearchResult[] = [
    { body: 'Result zero' },
    { body: 'Result one' },
  ];
  const tree = (selectedCitationIndex: number) => (
    <ConversationalSearchCitations
      citations={citations}
      searchResults={searchResults}
      selectedCitationIndex={selectedCitationIndex}
      onSelectCitation={onSelectCitation}
      onChange={onChange}
      onReady={onReady}
    />
  );
  const { container, rerender } = render(tree(0));
  const carousel = container.querySelector(
    'cds-aichat-carousel'
  ) as HTMLElement & { updateComplete: Promise<boolean> };
  await act(async () => {
    await carousel.updateComplete;
  });
  expect(carousel).toHaveProperty('nextBtnText', 'Next translated');
  expect(carousel).toHaveProperty('previousBtnText', 'Previous translated');
  expect(onReady).toHaveBeenCalledTimes(1);
  expect(screen.getByText('First citation')).toHaveAttribute(
    'data-selected',
    'true'
  );
  expect(screen.getByText('First citation')).toHaveAttribute(
    'data-result',
    'Result one'
  );
  expect(screen.getByText('Second citation')).toHaveAttribute(
    'data-result',
    'Result zero'
  );
  expect(screen.getByText('URL citation')).not.toHaveAttribute('data-result');
  fireEvent.click(screen.getByText('Second citation'));
  expect(onSelectCitation).toHaveBeenCalledWith(1);
  fireEvent(
    carousel,
    new CustomEvent('cds-aichat-carousel-onchange', {
      detail: { currentIndex: 2 },
      bubbles: true,
      composed: true,
    })
  );
  expect(onChange).toHaveBeenCalledWith(2);
  rerender(tree(1));
  expect(screen.getByText('Second citation')).toHaveAttribute(
    'data-selected',
    'true'
  );
  expect(screen.getByText('First citation')).toHaveAttribute(
    'data-selected',
    'false'
  );
  expect(onReady).toHaveBeenCalledTimes(1);
});
