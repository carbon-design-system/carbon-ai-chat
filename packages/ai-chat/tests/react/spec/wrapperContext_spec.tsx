/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Custom content rendered through a React wrapper stays part of the host's
 * React tree. Host context reaches it, its events bubble to host handlers,
 * host error boundaries catch its errors, and its state and DOM nodes survive
 * unrelated host re-renders.
 *
 * A separate React root for the chat would silently break each of these, so
 * they are asserted here independently of how the host DOM is laid out.
 */

import React, {
  createContext,
  lazy,
  Suspense,
  useContext,
  useState,
} from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { RenderUserDefinedResponse } from '../../../src/types/component/ChatContainer';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import {
  addUserDefinedResponse,
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const ThemeContext = createContext('none');

function Probe() {
  const theme = useContext(ThemeContext);
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      data-probe="udr"
      onClick={() => setCount((value) => value + 1)}>
      {theme}:{count}
    </button>
  );
}

const renderProbe: RenderUserDefinedResponse = () => <Probe />;

interface HostProps {
  theme: string;
  onParentClick?: () => void;
  onBeforeRender: (instance: ChatInstance) => void;
  label?: string;
}

type Wrapper = (props: HostProps) => React.ReactElement;

const config = { ...createBaseConfig(), openChatByDefault: true };

const wrappers: Array<[string, Wrapper]> = [
  [
    'ChatContainer',
    ({ theme, onParentClick, onBeforeRender, label }) => (
      <ThemeContext.Provider value={theme}>
        {/* Observes React event bubbling only; nothing here is interactive. */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div onClick={onParentClick} data-label={label}>
          <ChatContainer
            {...config}
            onBeforeRender={onBeforeRender}
            renderUserDefinedResponse={renderProbe}
          />
        </div>
      </ThemeContext.Provider>
    ),
  ],
  [
    'ChatCustomElement',
    ({ theme, onParentClick, onBeforeRender, label }) => (
      <ThemeContext.Provider value={theme}>
        {/* Observes React event bubbling only; nothing here is interactive. */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div onClick={onParentClick} data-label={label}>
          <ChatCustomElement
            {...config}
            className="chat-host"
            onBeforeRender={onBeforeRender}
            renderUserDefinedResponse={renderProbe}
          />
        </div>
      </ThemeContext.Provider>
    ),
  ],
];

class Boundary extends React.Component<
  { children: React.ReactNode },
  { caught: string | null }
> {
  state = { caught: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { caught: error.message };
  }

  render() {
    return this.state.caught ? (
      <p data-probe="boundary">{this.state.caught}</p>
    ) : (
      this.props.children
    );
  }
}

function probeButton() {
  return document.querySelector<HTMLButtonElement>('[data-probe="udr"]');
}

describe('React wrappers keep custom content in the host React tree', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  describe.each(wrappers)('%s', (_name, Host) => {
    it('passes host context, bubbles events to host handlers, and keeps state and nodes across host re-renders', async () => {
      let instance: ChatInstance | null = null;
      const onBeforeRender = (chat: ChatInstance) => {
        instance = chat;
      };
      const onParentClick = jest.fn();

      const view = render(
        <Host
          theme="light"
          onParentClick={onParentClick}
          onBeforeRender={onBeforeRender}
        />
      );
      await waitFor(() => expect(instance).not.toBeNull(), { timeout: 5000 });
      await addUserDefinedResponse(instance, 'context-probe');
      await waitFor(() => expect(probeButton()).not.toBeNull(), {
        timeout: 5000,
      });

      const button = probeButton();
      expect(button.textContent).toBe('light:0');

      fireEvent.click(button);
      expect(button.textContent).toBe('light:1');
      expect(onParentClick).toHaveBeenCalledTimes(1);

      view.rerender(
        <Host
          theme="dark"
          onParentClick={onParentClick}
          onBeforeRender={onBeforeRender}
        />
      );
      await waitFor(() => expect(button.textContent).toBe('dark:1'));
      expect(probeButton()).toBe(button);

      view.rerender(
        <Host
          theme="dark"
          onParentClick={onParentClick}
          onBeforeRender={onBeforeRender}
          label="unrelated"
        />
      );
      await waitFor(() =>
        expect(
          document.querySelector('[data-label="unrelated"]')
        ).not.toBeNull()
      );
      expect(probeButton()).toBe(button);
      expect(button.textContent).toBe('dark:1');
    });
  });

  it('lets the host choose the fallback for lazy custom content', async () => {
    const content = resolvablePromise<{ default: () => React.ReactElement }>();
    const DeferredContent = lazy(() => content);
    const onBeforeRender = jest.fn();
    const onAfterRender = jest.fn();
    render(
      <Suspense fallback={<p data-probe="host-loading">Loading response</p>}>
        <ChatContainer
          {...config}
          onBeforeRender={onBeforeRender}
          onAfterRender={onAfterRender}
          renderUserDefinedResponse={() => <DeferredContent />}
        />
      </Suspense>
    );
    await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    const instance = onBeforeRender.mock.calls[0][0];
    try {
      await addUserDefinedResponse(instance, 'lazy-response');
      await waitFor(() =>
        expect(
          document.querySelector('[data-probe="host-loading"]')
        ).not.toBeNull()
      );
      await act(async () =>
        content.doResolve({
          default: () => <p data-probe="loaded-response">Loaded response</p>,
        })
      );
      await waitFor(() =>
        expect(
          document.querySelector('[data-probe="loaded-response"]')
        ).not.toBeNull()
      );
      expect(document.querySelector('[data-probe="host-loading"]')).toBeNull();
      expect(onBeforeRender).toHaveBeenCalledTimes(1);
      expect(onAfterRender).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () =>
        content.doResolve({ default: () => <p>Loaded response</p> })
      );
    }
  });

  // One wrapper is enough: the boundary sits above both, and the content
  // reaches it through the same portal.
  it('lets a host error boundary catch an error thrown by custom content', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    let instance: ChatInstance | null = null;

    function Thrower(): React.ReactElement {
      throw new Error('custom content failed');
    }

    render(
      <Boundary>
        {React.createElement(ChatContainer, {
          ...config,
          className: 'chat-host',
          onBeforeRender: (chat: ChatInstance) => {
            instance = chat;
          },
          renderUserDefinedResponse: () => <Thrower />,
        })}
      </Boundary>
    );
    await waitFor(() => expect(instance).not.toBeNull(), { timeout: 5000 });
    await addUserDefinedResponse(instance, 'boundary-probe');

    await waitFor(
      () =>
        expect(
          document.querySelector('[data-probe="boundary"]')?.textContent
        ).toBe('custom content failed'),
      { timeout: 5000 }
    );
    consoleError.mockRestore();
  });
});
