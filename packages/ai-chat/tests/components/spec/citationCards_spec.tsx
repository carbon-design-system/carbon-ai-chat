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
import { ConversationalSearch } from '../../../src/chat/components/responseTypes/conversationalSearch/ConversationalSearch';
import { WindowSizeContext } from '../../../src/chat/contexts/WindowSizeContext';
import actions from '../../../src/chat/store/actions';
import { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import {
  ConversationalSearchItem,
  ConversationalSearchItemCitation,
  MessageResponseTypes,
  SearchResult,
} from '../../../src/types/messaging/Messages';

type LitElementLike = HTMLElement & { updateComplete: Promise<boolean> };

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const TEXT_CLASS = 'cds-aichat--citation-card-text';

// The answer highlights the selected source's range, so these show which
// source is selected.
const LINK_SELECTED = '==Alpha== Beta Gamma';
const RESULT_SELECTED = 'Alpha ==Beta== Gamma';
const PLAIN_SELECTED = 'Alpha Beta ==Gamma==';

const mockDispatch = jest.fn();
const mockLanguagePack = {
  carousel_nextNavButton: 'Next translated',
  carousel_prevNavButton: 'Previous translated',
  conversationalSearch_viewSourceDocument: 'View source',
  conversationalSearch_citationsLabel: 'Sources translated',
  conversationalSearch_toggleCitations: 'Toggle sources translated',
  conversationalSearch_streamingIncomplete: 'Incomplete translated',
};

jest.mock('../../../src/chat/hooks/useSelector', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ languagePack: mockLanguagePack }),
}));
jest.mock('../../../src/chat/hooks/useServiceManager', () => ({
  useServiceManager: () => ({ store: { dispatch: mockDispatch } }),
}));
jest.mock(
  '../../../src/chat/components/helpers/MarkdownWithDefaults/MarkdownWithDefaults',
  () => ({
    MarkdownWithDefaults: ({ text }: { text: string }) => (
      <span data-testid="markdown">{text}</span>
    ),
  })
);

const citations: ConversationalSearchItemCitation[] = [
  {
    title: 'Link source',
    text: 'Link text',
    url: 'https://www.example.com/page',
    ranges: [{ start: 0, end: 5 }],
  },
  {
    title: 'Result source',
    text: 'Result text',
    search_result_idx: 0,
    ranges: [{ start: 6, end: 10 }],
  },
  {
    title: 'Plain source',
    text: 'Plain text',
    ranges: [{ start: 11, end: 16 }],
  },
];
const searchResults: SearchResult[] = [{ body: 'Result body' }];

// jsdom has no layout, so the card's overflow check reads these instead.
const textHeights = { client: 40, scroll: 40 };
const originalMatchMedia = window.matchMedia;

// The carousel reads this once at startup. With it, slide changes end
// synchronously, because jsdom never fires transitionend.
function preferReducedMotion() {
  window.matchMedia = (query: string) => ({
    ...originalMatchMedia(query),
    matches: query === REDUCED_MOTION,
  });
}

function makeItem(): LocalMessageItem<ConversationalSearchItem> {
  return {
    item: {
      response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
      text: 'Alpha Beta Gamma',
      citations,
      search_results: searchResults,
    },
    ui_state: { id: 'answer' },
    fullMessageID: 'message',
  };
}

async function toggle(shell: LitElementLike) {
  await act(async () => {
    await shell.updateComplete;
    fireEvent.click(shell.shadowRoot.querySelector('button'));
  });
  await act(async () => {
    await shell.updateComplete;
  });
}

// Let the lazy citations import resolve and render.
async function loadCitations() {
  await act(async () => {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  });
}

async function startCarousel(container: HTMLElement) {
  const carousel = container.querySelector(
    'cds-aichat-carousel'
  ) as LitElementLike;
  await act(async () => {
    await carousel.updateComplete;
  });
  // The carousel waits 100 ms before it calls initCarousel.
  await act(async () => {
    jest.advanceTimersByTime(100);
    await Promise.resolve();
  });
  return carousel;
}

// Renders the answer, opens Sources, and starts the carousel.
async function openSources() {
  const view = render(
    <WindowSizeContext.Provider value={{ width: 400, height: 600 }}>
      <ConversationalSearch
        localMessageItem={makeItem()}
        isStreamingError={false}
        scrollElementIntoView={jest.fn()}
      />
    </WindowSizeContext.Provider>
  );
  const shell = view.container.querySelector(
    'cds-aichat-conversational-search-shell'
  ) as LitElementLike;
  await toggle(shell);
  await loadCitations();
  const carousel = await startCarousel(view.container);
  return { ...view, shell, carousel };
}

function highlighted() {
  return screen.getByTestId('markdown').textContent;
}

// Role queries skip the slides the carousel makes inert, so find the card's
// button by the label it's named with.
function cardButton(title: string) {
  return document.querySelector<HTMLButtonElement>(
    `button[aria-label="${title}"]`
  );
}

function clickNext(carousel: HTMLElement) {
  act(() => {
    fireEvent.click(
      carousel.shadowRoot.querySelector('.cds-aichat-carousel__next-btn')
    );
  });
}

// The carousel marks every slide but the visible one inert. It also adds a
// `carousel__view-active` class, but React rewrites a card's class when its
// selection changes, which drops that class.
function slideOf(title: string) {
  return screen.getByText(title).closest('[data-index]');
}

beforeEach(() => {
  jest.useFakeTimers({
    doNotFake: ['queueMicrotask', 'nextTick', 'setImmediate', 'performance'],
  });
  textHeights.client = 40;
  textHeights.scroll = 40;
  jest
    .spyOn(Element.prototype, 'clientHeight', 'get')
    .mockImplementation(function (this: Element) {
      return this.classList.contains(TEXT_CLASS) ? textHeights.client : 0;
    });
  jest
    .spyOn(Element.prototype, 'scrollHeight', 'get')
    .mockImplementation(function (this: Element) {
      return this.classList.contains(TEXT_CLASS) ? textHeights.scroll : 0;
    });
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  mockDispatch.mockReset();
  window.matchMedia = originalMatchMedia;
});

it('link card opens its url in a new tab', async () => {
  const { container } = await openSources();
  const link = screen.getByText('Link source').closest('a');
  expect(link).toHaveAttribute('href', 'https://www.example.com/page');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(
    link.querySelector('.cds-aichat--citation-card-label')
  ).toHaveTextContent('www.example.com');
  expect(container.querySelectorAll('a')).toHaveLength(1);
});

it('focus and click select interactive cards', async () => {
  await openSources();
  const link = screen.getByText('Link source').closest('a');
  // jsdom can't navigate, so keep the click from trying.
  link.addEventListener('click', (event) => event.preventDefault());
  const expandable = cardButton('Result source');
  expect(highlighted()).toBe(LINK_SELECTED);

  fireEvent.focus(expandable);
  expect(highlighted()).toBe(RESULT_SELECTED);
  fireEvent.focus(link);
  expect(highlighted()).toBe(LINK_SELECTED);
  fireEvent.click(expandable);
  expect(highlighted()).toBe(RESULT_SELECTED);
  fireEvent.click(link);
  expect(highlighted()).toBe(LINK_SELECTED);
});

it('expandable card opens the source panel with its search result', async () => {
  await openSources();
  const expandable = cardButton('Result source');
  expect(expandable).toHaveTextContent('View source');
  // Selecting starts the 50 ms scroll timer, so a timer count that hasn't
  // grown yet at dispatch means the panel opened before the card selected.
  const timersBefore = jest.getTimerCount();
  let timersAtDispatch: number;
  mockDispatch.mockImplementation(() => {
    timersAtDispatch = jest.getTimerCount();
  });

  fireEvent.click(expandable);
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  expect(mockDispatch).toHaveBeenCalledWith(
    actions.setViewSourcePanelIsOpen(true, citations[1], searchResults[0])
  );
  expect(timersAtDispatch).toBe(timersBefore);
  expect(jest.getTimerCount()).toBe(timersBefore + 1);
  expect(highlighted()).toBe(RESULT_SELECTED);
});

it('plain card is not interactive', async () => {
  await openSources();
  const title = screen.getByText('Plain source');
  expect(title.closest('a, button')).toBeNull();
  expect(
    title
      .closest('cds-aichat-card')
      .querySelector('.cds-aichat--citation-card-footer')
  ).toBeEmptyDOMElement();

  fireEvent.focus(title.closest('cds-aichat-card'));
  fireEvent.click(title);
  expect(highlighted()).toBe(LINK_SELECTED);
  expect(mockDispatch).not.toHaveBeenCalled();
});

it('overflowing card becomes expandable', async () => {
  textHeights.scroll = 80;
  await openSources();
  const expandable = cardButton('Plain source');
  expect(expandable).toHaveTextContent('View source');

  fireEvent.click(expandable);
  expect(mockDispatch).toHaveBeenCalledWith(
    actions.setViewSourcePanelIsOpen(true, citations[2], undefined)
  );
  expect(highlighted()).toBe(PLAIN_SELECTED);
});

it('next slide reports its index', async () => {
  preferReducedMotion();
  const { carousel } = await openSources();
  expect(highlighted()).toBe(LINK_SELECTED);
  expect(slideOf('Link source')).not.toHaveAttribute('inert');

  clickNext(carousel);
  expect(highlighted()).toBe(RESULT_SELECTED);
  expect(slideOf('Result source')).not.toHaveAttribute('inert');
  expect(slideOf('Link source')).toHaveAttribute('inert');
});

it('reopen resets selection to the first source', async () => {
  preferReducedMotion();
  const { container, shell, carousel } = await openSources();
  clickNext(carousel);
  expect(highlighted()).toBe(RESULT_SELECTED);
  expect(slideOf('Result source')).not.toHaveAttribute('inert');

  await toggle(shell);
  expect(highlighted()).toBe('Alpha Beta Gamma');
  expect(screen.queryByText('Result source')).not.toBeInTheDocument();

  await toggle(shell);
  await loadCitations();
  // The selection survives until the remounted carousel starts.
  expect(highlighted()).toBe(RESULT_SELECTED);
  await startCarousel(container);
  // Its startup event then resets the selection to the first source.
  expect(highlighted()).toBe(LINK_SELECTED);
  expect(slideOf('Link source')).not.toHaveAttribute('inert');
  expect(slideOf('Result source')).toHaveAttribute('inert');
});
