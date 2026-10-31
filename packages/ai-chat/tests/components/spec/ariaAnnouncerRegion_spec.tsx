/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { ReactNode, useLayoutEffect, useMemo, useRef } from 'react';
import { render, act, waitFor } from '@testing-library/react';

const testIntl = {
  formatMessage: ({ id }: { id: string }, values?: Record<string, string>) =>
    values ? `${id}:${JSON.stringify(values)}` : id,
} as any;

// Capture the options passed to mountAriaAnnouncer and expose a mock handle.
const mockAnnounce = jest.fn();
const mockDisconnect = jest.fn();
const capturedMountCalls: any[] = [];

jest.mock(
  '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js',
  () => ({
    ...jest.requireActual(
      '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js'
    ),
    mountAriaAnnouncer: (container: HTMLElement, options: any) => {
      capturedMountCalls.push({ container, options });
      return { announce: mockAnnounce, disconnect: mockDisconnect };
    },
  })
);

// Minimal store mock — the announcer subscribes to store for announceMessage.
const storeListeners: Array<() => void> = [];
const mockStore = {
  subscribe: (fn: () => void) => {
    storeListeners.push(fn);
    return () => {
      const idx = storeListeners.indexOf(fn);
      if (idx >= 0) {
        storeListeners.splice(idx, 1);
      }
    };
  },
  getState: (): any => ({ announceMessage: null }),
};

import ChatElement from '../../../src/web-components/cds-aichat-container/cds-aichat-container';
import { ChatContainer } from '../../../src/react/ChatContainer';
import type { ChatRenderer } from '../../../src/web-components/shared/react-renderer';
import type { ChatAppEntryProps } from '../../../src/chat/ChatAppEntry';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import { ChatContext } from '../../../src/chat/contexts/ChatContext';
import { useAriaAnnouncer } from '../../../src/chat/hooks/useAriaAnnouncer';
import { ProcessingWithText } from '../../../src/chat/components/helpers/ProcessingWithText/ProcessingWithText';
import {
  createBaseConfig,
  createTestViewState,
  setupAfterEach,
} from '../../test_helpers';

function ChatWithRegion({ children }: { children?: ReactNode }) {
  const viewState = useMemo(
    () => createTestViewState({ store: mockStore as any, intl: testIntl }),
    []
  );
  const region = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    viewState.announcer.connect(region.current);
    return () => viewState.announcer.disconnect();
  }, [viewState]);
  return (
    <ChatContext.Provider value={viewState}>
      <div ref={region} />
      {children}
    </ChatContext.Provider>
  );
}

beforeEach(() => {
  mockAnnounce.mockClear();
  mockDisconnect.mockClear();
  capturedMountCalls.length = 0;
  storeListeners.length = 0;
});

afterEach(async () => {
  setupAfterEach();
  await Promise.resolve();
});

describe('container-owned announcer region', () => {
  function createNativeHost() {
    const inputs: ChatAppEntryProps[] = [];
    const renderer: ChatRenderer = {
      mount: () => ({
        render: (_App, next) => {
          inputs.push(next);
          if (next.initialViewReady) {
            queueMicrotask(next.onInitialViewCommitted);
          }
        },
        unmount: jest.fn(),
      }),
    };
    const element = document.createElement(
      'cds-aichat-container'
    ) as ChatElement;
    element.config = createBaseConfig();
    element.renderer = renderer;
    return { element, inputs };
  }

  it('connects one region after before-render and outside the React target', async () => {
    const before = resolvablePromise();
    const { element } = createNativeHost();
    element.onBeforeRender = jest.fn(() => before);
    element.onAfterRender = jest.fn();
    document.body.appendChild(element);

    await waitFor(() => expect(element.onBeforeRender).toHaveBeenCalled());
    expect(capturedMountCalls).toHaveLength(0);
    expect(
      element.shadowRoot.querySelector('.cds-aichat--aria-announcer')
    ).toBeNull();

    before.doResolve();
    await waitFor(() => expect(element.onAfterRender).toHaveBeenCalledTimes(1));
    expect(capturedMountCalls).toHaveLength(1);
    const { container, options } = capturedMountCalls[0];
    expect(options).toEqual({ politeCount: 3, assertiveCount: 2 });
    expect(container.classList.contains('cds-aichat--visually-hidden')).toBe(
      true
    );
    expect(container.parentNode).toBe(element.shadowRoot);
    expect(container.previousElementSibling).toBe(
      element.shadowRoot.querySelector('.cds-aichat--react-app')
    );

    element.assistantName = 'Changed';
    await element.updateComplete;
    expect(capturedMountCalls).toHaveLength(1);
    expect(
      element.shadowRoot.querySelector('.cds-aichat--aria-announcer')
    ).toBe(container);
  });

  it('does not connect a region when detached during before-render', async () => {
    const before = resolvablePromise();
    const { element } = createNativeHost();
    element.onBeforeRender = jest.fn(() => before);
    element.onAfterRender = jest.fn();
    document.body.appendChild(element);
    await waitFor(() => expect(element.onBeforeRender).toHaveBeenCalled());

    element.remove();
    await Promise.resolve();
    before.doResolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(capturedMountCalls).toHaveLength(0);
    expect(
      element.shadowRoot.querySelector('.cds-aichat--aria-announcer')
    ).toBeNull();
    expect(element.onAfterRender).not.toHaveBeenCalled();
  });

  it('releases the retired region and creates a fresh one on reconnect', async () => {
    const { element, inputs } = createNativeHost();
    element.onAfterRender = jest.fn();
    document.body.appendChild(element);
    await waitFor(() => expect(element.onAfterRender).toHaveBeenCalledTimes(1));
    const oldRegion = capturedMountCalls[0].container;
    const retiredAnnouncer = inputs[inputs.length - 1].viewState.announcer;

    element.remove();
    await Promise.resolve();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(oldRegion.parentNode).toBeNull();
    expect(
      element.shadowRoot.querySelector('.cds-aichat--aria-announcer')
    ).toBeNull();

    document.body.appendChild(element);
    await waitFor(() => expect(element.onAfterRender).toHaveBeenCalledTimes(2));
    expect(capturedMountCalls).toHaveLength(2);
    expect(capturedMountCalls[1].container).not.toBe(oldRegion);
    expect(
      element.shadowRoot.querySelectorAll('.cds-aichat--aria-announcer')
    ).toHaveLength(1);
    expect(inputs[inputs.length - 1].viewState.announcer).not.toBe(
      retiredAnnouncer
    );
  });

  it('keeps one native region through React StrictMode replay', async () => {
    const after = jest.fn();
    const props = createBaseConfig();
    const { rerender } = render(
      <React.StrictMode>
        <ChatContainer {...props} onAfterRender={after} />
      </React.StrictMode>
    );
    await waitFor(() => expect(after).toHaveBeenCalledTimes(1));
    const element = document.querySelector('cds-aichat-container');
    const region = element.shadowRoot.querySelector(
      '.cds-aichat--aria-announcer'
    );
    expect(capturedMountCalls).toHaveLength(1);
    expect(mockDisconnect).not.toHaveBeenCalled();

    rerender(
      <React.StrictMode>
        <ChatContainer
          {...props}
          assistantName="Changed"
          onAfterRender={after}
        />
      </React.StrictMode>
    );
    await element.updateComplete;
    expect(capturedMountCalls).toHaveLength(1);
    expect(
      element.shadowRoot.querySelector('.cds-aichat--aria-announcer')
    ).toBe(region);
    expect(
      element.shadowRoot.querySelectorAll('.cds-aichat--aria-announcer')
    ).toHaveLength(1);
  });
});

describe('useAriaAnnouncer', () => {
  it('announces a plain string via the context function', async () => {
    let contextValue: any;
    function Capture(): null {
      contextValue = useAriaAnnouncer();
      return null;
    }
    render(
      <ChatWithRegion>
        <Capture />
      </ChatWithRegion>
    );

    await act(async () => {
      contextValue('hello world');
      await Promise.resolve();
    });

    expect(mockAnnounce).toHaveBeenCalledWith('hello world', 'polite');
  });

  it('announces an assertive AnnounceMessage via the context function', async () => {
    let contextValue: any;
    function Capture(): null {
      contextValue = useAriaAnnouncer();
      return null;
    }
    render(
      <ChatWithRegion>
        <Capture />
      </ChatWithRegion>
    );

    await act(async () => {
      contextValue({
        messageText: 'error occurred',
        assertive: true,
      });
      await Promise.resolve();
    });

    expect(mockAnnounce).toHaveBeenCalledWith('error occurred', 'assertive');
  });

  it('coalesces same-microtask polite calls into one announce', async () => {
    let contextValue: any;
    function Capture(): null {
      contextValue = useAriaAnnouncer();
      return null;
    }
    render(
      <ChatWithRegion>
        <Capture />
      </ChatWithRegion>
    );

    await act(async () => {
      contextValue('part one');
      contextValue('part two');
      await Promise.resolve();
    });

    expect(mockAnnounce).toHaveBeenCalledTimes(1);
    expect(mockAnnounce).toHaveBeenCalledWith('part one part two', 'polite');
  });
});

// ---------------------------------------------------------------------------
// ProcessingWithText
// ---------------------------------------------------------------------------

describe('ProcessingWithText', () => {
  const baseProps = {
    carbonTheme: 'white' as any,
    index: 0,
    processingLabel: 'Loading',
    isVisible: true,
  };

  function renderWithProvider(props: any) {
    return render(
      <ChatWithRegion>
        {React.createElement(ProcessingWithText, props)}
      </ChatWithRegion>
    );
  }

  it('calls the announcer when isVisible and isTypingMessage are set', async () => {
    await act(async () => {
      renderWithProvider({
        ...baseProps,
        isTypingMessage: 'Watson is typing',
      });
      await Promise.resolve();
    });

    expect(mockAnnounce).toHaveBeenCalledWith('Watson is typing', 'polite');
  });

  it('does not call the announcer when isVisible is false', async () => {
    await act(async () => {
      renderWithProvider({
        ...baseProps,
        isVisible: false,
        isTypingMessage: 'Watson is typing',
      });
      await Promise.resolve();
    });

    expect(mockAnnounce).not.toHaveBeenCalled();
  });

  it('does not call the announcer when isTypingMessage is undefined', async () => {
    await act(async () => {
      renderWithProvider({ ...baseProps });
      await Promise.resolve();
    });

    expect(mockAnnounce).not.toHaveBeenCalled();
  });
});
