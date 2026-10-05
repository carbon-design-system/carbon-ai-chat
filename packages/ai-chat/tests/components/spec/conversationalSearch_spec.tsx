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
import { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import {
  ConversationalSearchItem,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';

const mockLanguagePack = {
  conversationalSearch_citationsLabel: 'Sources translated',
  conversationalSearch_toggleCitations: 'Toggle sources translated',
  conversationalSearch_streamingIncomplete: 'Incomplete translated',
  errors_generalContent: 'Content error translated',
};
let mockLazyGate: Promise<void>;

// Keep lazy caches independent between tests and stable during Suspense retries.
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    lazy: (load: () => Promise<unknown>) => {
      let gate: Promise<void>;
      let Component: React.ComponentType;
      return function GatedLazy(props: Record<string, unknown>) {
        if (gate !== mockLazyGate) {
          gate = mockLazyGate;
          const currentGate = gate;
          Component = actual.lazy(async () => {
            await currentGate;
            return load();
          });
        }
        return actual.createElement(Component, props);
      };
    },
  };
});
jest.mock('../../../src/chat/hooks/useSelector', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ languagePack: mockLanguagePack }),
}));
jest.mock('../../../src/chat/hooks/useServiceManager', () => ({
  useServiceManager: () => ({ namespace: { suffix: '-test' } }),
}));
jest.mock(
  '../../../src/chat/components/helpers/MarkdownWithDefaults/MarkdownWithDefaults',
  () => ({
    MarkdownWithDefaults: ({
      text,
      streaming,
      overrideSanitize,
    }: {
      text: string;
      streaming?: boolean;
      overrideSanitize?: boolean;
    }) => (
      <span
        data-testid="markdown"
        data-streaming={Boolean(streaming)}
        data-sanitize={String(overrideSanitize)}>
        {text}
      </span>
    ),
  })
);
jest.mock(
  '../../../src/chat/components/responseTypes/conversationalSearch/ConversationalSearchCitations',
  () => ({
    __esModule: true,
    default: function MockCitations({
      citations,
      selectedCitationIndex,
      onSelectCitation,
      onChange,
      onReady,
    }: {
      citations: { title: string }[];
      selectedCitationIndex: number;
      onSelectCitation: (index: number) => void;
      onChange: (index: number) => void;
      onReady: () => void;
    }) {
      React.useEffect(onReady, [onReady]);
      return (
        <div data-testid="citations" data-selected={selectedCitationIndex}>
          {citations.map((citation, index) => (
            <button
              type="button"
              key={citation.title}
              onClick={() => onSelectCitation(index)}>
              {citation.title}
            </button>
          ))}
          <button type="button" onClick={() => onChange(1)}>
            Next citation
          </button>
        </div>
      );
    },
  })
);

function makeItem(): LocalMessageItem<ConversationalSearchItem> {
  return {
    item: {
      response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
      text: 'Alpha Beta',
      citations: [
        { title: 'First source', ranges: [{ start: 0, end: 5 }] },
        { title: 'Second source', ranges: [{ start: 6, end: 10 }] },
      ],
    },
    ui_state: { id: 'answer' },
    fullMessageID: 'message',
  };
}

function deferred() {
  let resolve: () => void;
  let reject: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderAnswer(item = makeItem(), isStreamingError = false) {
  const scroll = jest.fn();
  const view = render(
    <ConversationalSearch
      localMessageItem={item}
      isStreamingError={isStreamingError}
      scrollElementIntoView={scroll}
    />
  );
  const answer = view.container.querySelector(
    'cds-aichat-conversational-search-text'
  ) as HTMLElement & { updateComplete: Promise<boolean> };
  return { ...view, scroll, answer };
}

async function toggle(
  answer: HTMLElement & { updateComplete: Promise<boolean> }
) {
  await act(async () => {
    await answer.updateComplete;
    fireEvent.click(answer.shadowRoot.querySelector('button'));
  });
  await act(async () => {
    await answer.updateComplete;
  });
}

async function resolveLoad(pending: ReturnType<typeof deferred>) {
  await act(async () => {
    pending.resolve();
    await pending.promise;
  });
}

beforeEach(() => {
  jest.useFakeTimers({
    doNotFake: ['queueMicrotask', 'nextTick', 'setImmediate', 'performance'],
  });
  mockLazyGate = Promise.resolve();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

it('renders active chunks until the final answer replaces them', () => {
  const item = makeItem();
  item.ui_state.streamingState = {
    isDone: false,
    chunks: [{ text: 'Partial ' }, { text: 'answer' }],
  };
  const { rerender, scroll } = renderAnswer(item);
  expect(screen.getByText('Partial answer')).toHaveAttribute(
    'data-streaming',
    'true'
  );
  expect(screen.getByText('Partial answer')).toHaveAttribute(
    'data-sanitize',
    'false'
  );
  rerender(
    <ConversationalSearch
      localMessageItem={{
        ...item,
        ui_state: {
          ...item.ui_state,
          streamingState: { ...item.ui_state.streamingState, isDone: true },
        },
      }}
      isStreamingError={false}
      scrollElementIntoView={scroll}
    />
  );
  expect(screen.getByText('Alpha Beta')).toHaveAttribute(
    'data-streaming',
    'false'
  );
});

it('retains the partial answer beside the translated incomplete-stream error', () => {
  const item = makeItem();
  item.ui_state.streamingState = {
    isDone: false,
    chunks: [{ text: 'Partial answer' }],
  };
  renderAnswer(item, true);
  expect(screen.getByText('Partial answer')).toBeInTheDocument();
  expect(screen.getByText('Incomplete translated')).toBeInTheDocument();
});

it('updates highlights from selection and carousel navigation through the real answer wrapper', async () => {
  const { answer } = renderAnswer();
  await act(async () => {
    await answer.updateComplete;
  });
  const button = answer.shadowRoot.querySelector('button');
  expect(button).toHaveAttribute('aria-label', 'Toggle sources translated');
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(button).toHaveTextContent('Sources translated');
  await toggle(answer);
  expect(button).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('==Alpha== Beta')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Second source'));
  expect(screen.getByText('Alpha ==Beta==')).toBeInTheDocument();
  fireEvent.click(screen.getByText('First source'));
  fireEvent.click(screen.getByText('Next citation'));
  expect(screen.getByText('Alpha ==Beta==')).toBeInTheDocument();
  await toggle(answer);
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByText('Alpha Beta')).toBeInTheDocument();
  expect(screen.queryByTestId('citations')).not.toBeInTheDocument();
});

it('omits the toggle for an answer without citations', async () => {
  const item = makeItem();
  item.item.citations = [];
  const { answer } = renderAnswer(item);
  await act(async () => {
    await answer.updateComplete;
  });
  expect(answer.shadowRoot.querySelector('button')).toBeNull();
});

it('shows a skeleton until the lazy citations load while retaining the answer and toggle', async () => {
  const pending = deferred();
  mockLazyGate = pending.promise;
  const { answer, container } = renderAnswer();
  await toggle(answer);
  expect(
    container.querySelector('cds-skeleton-placeholder')
  ).toBeInTheDocument();
  expect(screen.getByText('==Alpha== Beta')).toBeInTheDocument();
  expect(answer.shadowRoot.querySelector('button')).toBeInTheDocument();
  expect(screen.queryByTestId('citations')).not.toBeInTheDocument();
  await resolveLoad(pending);
  expect(screen.getByTestId('citations')).toBeInTheDocument();
  expect(
    container.querySelector('cds-skeleton-placeholder')
  ).not.toBeInTheDocument();
});

it('stays closed when the citations import resolves after closing', async () => {
  const pending = deferred();
  mockLazyGate = pending.promise;
  const { answer, scroll, container } = renderAnswer();
  await toggle(answer);
  await toggle(answer);
  await resolveLoad(pending);
  act(() => jest.advanceTimersByTime(50));
  expect(scroll).not.toHaveBeenCalled();
  expect(screen.queryByTestId('citations')).not.toBeInTheDocument();
  expect(
    container.querySelector('cds-skeleton-placeholder')
  ).not.toBeInTheDocument();
  expect(screen.getByText('Alpha Beta')).toBeInTheDocument();
});

it('replaces a rejected citations import with the translated content error while keeping the answer', async () => {
  const pending = deferred();
  mockLazyGate = pending.promise;
  const { answer, container } = renderAnswer();
  await toggle(answer);
  await act(async () => {
    pending.reject(new Error('Import failed'));
    await pending.promise.catch(() => {});
  });
  expect(screen.getByText('Content error translated')).toBeInTheDocument();
  expect(
    container.querySelector('cds-skeleton-placeholder')
  ).not.toBeInTheDocument();
  expect(screen.getByText('==Alpha== Beta')).toBeInTheDocument();
  await toggle(answer);
  expect(screen.getByText('Alpha Beta')).toBeInTheDocument();
});

it('scrolls opening and selection after 50 ms with the existing padding', async () => {
  const { answer, scroll } = renderAnswer();
  await toggle(answer);
  act(() => jest.advanceTimersByTime(49));
  expect(scroll).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(scroll).toHaveBeenCalledTimes(1);
  expect(scroll).toHaveBeenCalledWith(expect.any(HTMLElement), 32, 64);
  expect(scroll.mock.calls[0][0]).toContainElement(
    screen.getByTestId('citations')
  );
  scroll.mockClear();
  fireEvent.click(screen.getByText('Second source'));
  act(() => jest.advanceTimersByTime(49));
  expect(scroll).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(scroll).toHaveBeenCalledWith(expect.any(HTMLElement), 32, 64);
});

it('scrolls the mounted cards again after a late lazy import', async () => {
  const pending = deferred();
  mockLazyGate = pending.promise;
  const { answer, scroll } = renderAnswer();
  await toggle(answer);
  act(() => jest.advanceTimersByTime(50));
  expect(scroll).toHaveBeenCalledTimes(1);
  await resolveLoad(pending);
  act(() => jest.advanceTimersByTime(50));
  expect(scroll).toHaveBeenCalledTimes(2);
  expect(scroll.mock.calls[1][0]).toContainElement(
    screen.getByTestId('citations')
  );
});

it('cancels pending scrolls on close and unmount', async () => {
  const { answer, scroll, unmount } = renderAnswer();
  await toggle(answer);
  await toggle(answer);
  act(() => jest.advanceTimersByTime(50));
  expect(scroll).not.toHaveBeenCalled();
  await toggle(answer);
  unmount();
  act(() => jest.advanceTimersByTime(50));
  expect(scroll).not.toHaveBeenCalled();
});

it('ignores late citations resolution after the answer unmounts', async () => {
  const pending = deferred();
  mockLazyGate = pending.promise;
  const { answer, scroll, unmount } = renderAnswer();
  await toggle(answer);
  unmount();
  await resolveLoad(pending);
  act(() => jest.advanceTimersByTime(50));
  expect(scroll).not.toHaveBeenCalled();
  expect(screen.queryByTestId('citations')).not.toBeInTheDocument();
});

it('updates an open answer highlight as citation ranges arrive with streamed text', async () => {
  const item = makeItem();
  item.ui_state.streamingState = { isDone: false, chunks: [{ text: 'Alpha' }] };
  const { answer, scroll, rerender } = renderAnswer(item);
  await toggle(answer);
  expect(screen.getByText('==Alpha==')).toHaveAttribute(
    'data-streaming',
    'true'
  );
  const nextItem = {
    ...item,
    item: {
      ...item.item,
      citations: [{ title: 'Updated source', ranges: [{ start: 6, end: 10 }] }],
    },
    ui_state: {
      ...item.ui_state,
      streamingState: {
        isDone: false,
        chunks: [{ text: 'Alpha' }, { text: ' Beta' }],
      },
    },
  };
  rerender(
    <ConversationalSearch
      localMessageItem={nextItem}
      isStreamingError={false}
      scrollElementIntoView={scroll}
    />
  );
  expect(screen.getByText('Alpha ==Beta==')).toHaveAttribute(
    'data-streaming',
    'true'
  );
  expect(screen.getByText('Updated source')).toBeInTheDocument();
  expect(screen.queryByText('First source')).not.toBeInTheDocument();
  rerender(
    <ConversationalSearch
      localMessageItem={{
        ...nextItem,
        ui_state: {
          ...nextItem.ui_state,
          streamingState: { ...nextItem.ui_state.streamingState, isDone: true },
        },
      }}
      isStreamingError={false}
      scrollElementIntoView={scroll}
    />
  );
  expect(screen.getByText('Alpha ==Beta==')).toHaveAttribute(
    'data-streaming',
    'false'
  );
  await act(async () => {
    await answer.updateComplete;
  });
  expect(answer).toHaveProperty('streaming', false);
});

it('adds a citation toggle when citations arrive after the first answer chunk', async () => {
  const item = makeItem();
  item.item.citations = undefined;
  const { answer, rerender, scroll } = renderAnswer(item);
  await act(async () => {
    await answer.updateComplete;
  });
  expect(answer.shadowRoot.querySelector('button')).toBeNull();
  rerender(
    <ConversationalSearch
      localMessageItem={{
        ...item,
        item: { ...item.item, citations: makeItem().item.citations },
      }}
      isStreamingError={false}
      scrollElementIntoView={scroll}
    />
  );
  await toggle(answer);
  expect(screen.getByText('==Alpha== Beta')).toBeInTheDocument();
  expect(screen.getByText('First source')).toBeInTheDocument();
});

it('reopens loaded citations with the previous selection and no loading skeleton', async () => {
  const pending = deferred();
  mockLazyGate = pending.promise;
  const { answer, container, scroll } = renderAnswer();
  await toggle(answer);
  await resolveLoad(pending);
  fireEvent.click(screen.getByText('Second source'));
  await toggle(answer);
  act(() => jest.advanceTimersByTime(50));
  expect(scroll).not.toHaveBeenCalled();
  await toggle(answer);
  expect(
    container.querySelector('cds-skeleton-placeholder')
  ).not.toBeInTheDocument();
  expect(screen.getByTestId('citations')).toHaveAttribute('data-selected', '1');
  expect(screen.getByText('Alpha ==Beta==')).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(50));
  expect(scroll).toHaveBeenCalledTimes(1);
  expect(scroll.mock.calls[0][0]).toContainElement(
    screen.getByTestId('citations')
  );
});

it('coalesces rapid citation selections into one scroll after the last selection', async () => {
  const { answer, scroll } = renderAnswer();
  await toggle(answer);
  act(() => jest.advanceTimersByTime(50));
  scroll.mockClear();
  fireEvent.click(screen.getByText('Second source'));
  act(() => jest.advanceTimersByTime(30));
  fireEvent.click(screen.getByText('First source'));
  act(() => jest.advanceTimersByTime(49));
  expect(scroll).not.toHaveBeenCalled();
  expect(screen.getByText('==Alpha== Beta')).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(1));
  expect(scroll).toHaveBeenCalledTimes(1);
});

it('removes the incomplete-stream error when the answer finishes', () => {
  const item = makeItem();
  item.ui_state.streamingState = {
    isDone: false,
    chunks: [{ text: 'Partial answer' }],
  };
  const { rerender, scroll } = renderAnswer(item, true);
  expect(screen.getByText('Incomplete translated')).toBeInTheDocument();
  rerender(
    <ConversationalSearch
      localMessageItem={{
        ...item,
        ui_state: {
          ...item.ui_state,
          streamingState: { ...item.ui_state.streamingState, isDone: true },
        },
      }}
      isStreamingError={false}
      scrollElementIntoView={scroll}
    />
  );
  expect(screen.queryByText('Incomplete translated')).not.toBeInTheDocument();
  expect(screen.queryByText('Partial answer')).not.toBeInTheDocument();
  expect(screen.getByText('Alpha Beta')).toBeInTheDocument();
});
