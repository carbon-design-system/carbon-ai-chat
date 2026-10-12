/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Tests for the rewired aria-announcer path introduced in issue #1933:
 *   - AriaAnnouncerProvider drives mountAriaAnnouncer with the correct options
 *     and forwards announcements through the context function.
 *   - ProcessingWithText calls the announcer when visible with a typing message.
 */

import React, { useContext } from 'react';
import { render, act } from '@testing-library/react';

jest.mock('../../../src/chat/hooks/useIntl', () => ({
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }, values?: Record<string, string>) =>
      values ? `${id}:${JSON.stringify(values)}` : id,
  }),
}));

// Capture the options passed to mountAriaAnnouncer and expose a mock handle.
const mockAnnounce = jest.fn();
const mockDisconnect = jest.fn();
const capturedMountCalls: any[] = [];

jest.mock(
  '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js',
  () => ({
    mountAriaAnnouncer: (container: HTMLElement, options: any) => {
      capturedMountCalls.push({ container, options });
      return { announce: mockAnnounce, disconnect: mockDisconnect };
    },
  })
);

// Minimal store mock — the provider subscribes to store for announceMessage.
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

jest.mock('../../../src/chat/hooks/useServiceManager', () => ({
  useServiceManager: () => ({ store: mockStore }),
}));

import { AriaAnnouncerProvider } from '../../../src/chat/providers/AriaAnnouncerProvider';
import { AriaAnnouncerContext } from '../../../src/chat/contexts/AriaAnnouncerContext';
import { ProcessingWithText } from '../../../src/chat/components/helpers/ProcessingWithText/ProcessingWithText';

beforeEach(() => {
  mockAnnounce.mockClear();
  mockDisconnect.mockClear();
  capturedMountCalls.length = 0;
  storeListeners.length = 0;
});

// ---------------------------------------------------------------------------
// AriaAnnouncerProvider
// ---------------------------------------------------------------------------

describe('AriaAnnouncerProvider', () => {
  it('mounts live regions with politeCount=3 and assertiveCount=2', () => {
    render(
      <AriaAnnouncerProvider>
        <span />
      </AriaAnnouncerProvider>
    );
    expect(capturedMountCalls).toHaveLength(1);
    expect(capturedMountCalls[0].options).toEqual({
      politeCount: 3,
      assertiveCount: 2,
    });
  });

  it('disconnects the handle when unmounted', () => {
    const { unmount } = render(
      <AriaAnnouncerProvider>
        <span />
      </AriaAnnouncerProvider>
    );
    unmount();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('announces a plain string via the context function', async () => {
    let contextValue: any;
    function Capture(): null {
      contextValue = useContext(AriaAnnouncerContext);
      return null;
    }
    render(
      <AriaAnnouncerProvider>
        <Capture />
      </AriaAnnouncerProvider>
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
      contextValue = useContext(AriaAnnouncerContext);
      return null;
    }
    render(
      <AriaAnnouncerProvider>
        <Capture />
      </AriaAnnouncerProvider>
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
      contextValue = useContext(AriaAnnouncerContext);
      return null;
    }
    render(
      <AriaAnnouncerProvider>
        <Capture />
      </AriaAnnouncerProvider>
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
      <AriaAnnouncerProvider>
        {React.createElement(ProcessingWithText, props)}
      </AriaAnnouncerProvider>
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
