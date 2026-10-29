/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { ErrorBody } from '../../../src/chat/components/panels/native/ErrorBody';
import { PanelBodyContentAdapter } from '../../../src/chat/components/panels/PanelBodyContentAdapter';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import {
  createBaseConfig,
  getChatShadowRoot,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const markdownEffects: Array<{
  target: HTMLElement;
  connected: boolean;
  assigned: boolean;
}> = [];
let markdownRenders = 0;
let markdownPassiveEffects = 0;

// Isolate the retained subtree's React commit from the markdown element's own
// asynchronous parse and custom-renderer portal lifecycle.
jest.mock('@carbon/ai-chat-components/es/react/markdown.js', () => ({
  __esModule: true,
  default: function TestMarkdown({
    markdown,
    customRenderers,
  }: {
    markdown: string;
    customRenderers?: { codeBlock?: (args: unknown) => React.ReactNode };
  }) {
    const ref = React.useRef<HTMLDivElement>(null);
    markdownRenders += 1;
    React.useLayoutEffect(() => {
      const target = ref.current.parentElement;
      const bodySlotHost = target.closest<HTMLElement>('[slot="body"]');
      markdownEffects.push({
        target,
        connected: target.isConnected,
        assigned: Boolean(bodySlotHost?.assignedSlot),
      });
    }, []);
    React.useEffect(() => {
      markdownPassiveEffects += 1;
    }, []);
    return (
      <div ref={ref} data-probe="retained-markdown" data-source={markdown}>
        {customRenderers?.codeBlock?.({ code: markdown }) ?? markdown}
      </div>
    );
  },
}));

const HostContext = createContext('missing');

function StatefulHostRenderer() {
  const value = useContext(HostContext);
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      data-probe="panel-renderer"
      onClick={() => setCount((current) => current + 1)}>
      {value}:{count}
    </button>
  );
}

const markdownConfig = {
  customRenderers: { codeBlock: () => <StatefulHostRenderer /> },
};

const wrappers = [
  ['ChatContainer', ChatContainer],
  ['ChatCustomElement', ChatCustomElement],
] as const;

describe('retained panel body content', () => {
  beforeEach(() => {
    setupBeforeEach();
    markdownEffects.length = 0;
    markdownRenders = 0;
    markdownPassiveEffects = 0;
  });

  afterEach(() => {
    setupAfterEach();
    jest.restoreAllMocks();
  });

  it('does not mount content in a detached native target', () => {
    const target = document.createElement('div');
    const effect = jest.fn();
    function Probe() {
      const ref = useRef<HTMLSpanElement>(null);
      useLayoutEffect(() => effect(ref.current.isConnected), []);
      return <span ref={ref}>retained</span>;
    }
    const tree = () => (
      <PanelBodyContentAdapter target={target}>
        <Probe />
      </PanelBodyContentAdapter>
    );
    const mounted = render(tree());
    expect(effect).not.toHaveBeenCalled();
    document.body.appendChild(target);
    mounted.rerender(tree());
    expect(effect.mock.calls).toEqual([[true]]);
  });

  it.each(wrappers)(
    'keeps context, local state and its committed target through %s',
    async (_name, Wrapper) => {
      let instance: ChatInstance;
      const snapshots: Array<{ markdown: boolean; passive: number }> = [];
      const before = (chat: ChatInstance) => {
        instance = chat;
        chat.updateCatastrophicErrorPanel({
          isOpen: false,
          bodyText: 'Initial error body',
          title: 'Initial title',
        });
      };
      const after = jest.fn(() => {
        snapshots.push({
          markdown: Boolean(
            getChatShadowRoot()?.querySelector(
              '[data-probe="retained-markdown"]'
            )
          ),
          passive: markdownPassiveEffects,
        });
      });
      const config = createBaseConfig();
      const tree = (context: string) => (
        <HostContext.Provider value={context}>
          <Wrapper
            {...config}
            className=""
            markdown={markdownConfig}
            onBeforeRender={before}
            onAfterRender={after}
          />
        </HostContext.Provider>
      );
      const mounted = render(tree('host'));
      await waitFor(() => expect(after).toHaveBeenCalledTimes(1));
      expect(markdownEffects).toHaveLength(1);
      expect(markdownEffects[0]).toMatchObject({
        connected: true,
        assigned: true,
      });
      const root = getChatShadowRoot();
      const target = root.querySelector<HTMLElement>(
        '.cds-aichat--catastrophic-error__error-body'
      );
      expect(markdownEffects[0].target).toBe(target);
      expect(target.getRootNode()).toBe(root);
      const counter = target.querySelector('[data-probe="panel-renderer"]');
      expect(counter.textContent).toBe('host:0');
      fireEvent.click(counter);
      expect(counter.textContent).toBe('host:1');
      const native = root.querySelector('cds-aichat-error-body');
      const changed = jest.fn();
      native.addEventListener('panel-content-ready', changed);
      const initialRenders = markdownRenders;
      await act(async () => {
        instance.updateCatastrophicErrorPanel({
          isOpen: false,
          bodyText: 'Initial error body',
          title: 'Changed title',
          hideRetryButton: true,
        });
        await native.updateComplete;
        native.requestUpdate();
        await native.updateComplete;
      });
      expect(
        native.querySelector('.cds-aichat--catastrophic-error__error-heading')
          ?.textContent
      ).toBe('Changed title');
      expect(changed).not.toHaveBeenCalled();
      expect(markdownRenders).toBe(initialRenders);
      expect(
        native.querySelector('.cds-aichat--catastrophic-error__error-body')
      ).toBe(target);
      expect(target.querySelector('[data-probe="panel-renderer"]')).toBe(
        counter
      );
      mounted.rerender(tree('next'));
      await waitFor(() => expect(counter.textContent).toBe('next:1'));
      expect(target.querySelector('[data-probe="panel-renderer"]')).toBe(
        counter
      );
      expect(markdownEffects).toHaveLength(1);
      expect(after).toHaveBeenCalledTimes(1);
      expect(snapshots).toEqual([{ markdown: true, passive: 1 }]);
    }
  );

  it.each(wrappers)(
    'preserves retained state when %s moves within one task under synchronous flushing',
    async (_name, Wrapper) => {
      const before = jest.fn((instance: ChatInstance) => {
        instance.updateCatastrophicErrorPanel({
          isOpen: false,
          bodyText: 'Retained during move',
        });
      });
      const after = jest.fn();
      const mounted = render(
        <HostContext.Provider value="host">
          <Wrapper
            {...createBaseConfig()}
            className=""
            markdown={markdownConfig}
            onBeforeRender={before}
            onAfterRender={after}
          />
        </HostContext.Provider>
      );
      await waitFor(() => expect(after).toHaveBeenCalledTimes(1));
      const target = getChatShadowRoot().querySelector<HTMLElement>(
        '.cds-aichat--catastrophic-error__error-body'
      );
      const counter = target.querySelector('[data-probe="panel-renderer"]');
      fireEvent.click(counter);
      expect(counter.textContent).toBe('host:1');
      const publicHost = mounted.container.firstElementChild;
      const parent = publicHost.parentNode;
      await act(async () => {
        flushSync(() => {
          publicHost.remove();
          parent.appendChild(publicHost);
        });
      });
      await waitFor(() =>
        expect(
          getChatShadowRoot()?.querySelector('[data-probe="panel-renderer"]')
        ).not.toBeNull()
      );
      expect(before).toHaveBeenCalledTimes(1);
      expect(after).toHaveBeenCalledTimes(1);
      expect(
        getChatShadowRoot().querySelector(
          '.cds-aichat--catastrophic-error__error-body'
        )
      ).toBe(target);
      expect(
        target.querySelector('[data-probe="panel-renderer"]')?.textContent
      ).toBe('host:1');
      expect(target.querySelector('[data-probe="panel-renderer"]')).toBe(
        counter
      );
      expect(markdownEffects).toHaveLength(1);
    }
  );

  it.each(wrappers)(
    'waits for initial native targets and retained React effects before %s after-render',
    async (_name, Wrapper) => {
      const gate = resolvablePromise();
      const prototype = ErrorBody.prototype as unknown as {
        scheduleUpdate(): void | Promise<void>;
      };
      const schedule = prototype.scheduleUpdate;
      const scheduled = jest
        .spyOn(prototype, 'scheduleUpdate')
        .mockImplementation(function (this: ErrorBody) {
          return gate.then(() => schedule.call(this));
        });
      const observed: Array<{ markdown: boolean; passive: number }> = [];
      const after = jest.fn(() => {
        observed.push({
          markdown: Boolean(
            getChatShadowRoot()?.querySelector(
              '[data-probe="retained-markdown"]'
            )
          ),
          passive: markdownPassiveEffects,
        });
      });
      render(
        <HostContext.Provider value="host">
          <Wrapper
            {...createBaseConfig()}
            className=""
            markdown={markdownConfig}
            onBeforeRender={(instance) =>
              instance.updateCatastrophicErrorPanel({
                isOpen: false,
                bodyText: 'Initial retained body',
              })
            }
            onAfterRender={after}
          />
        </HostContext.Provider>
      );
      await waitFor(() => expect(scheduled).toHaveBeenCalled());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      const prematureCalls = after.mock.calls.length;
      await act(async () => {
        gate.doResolve();
        await gate;
      });
      await waitFor(() => expect(after).toHaveBeenCalledTimes(1));
      expect(prematureCalls).toBe(0);
      expect(observed).toEqual([{ markdown: true, passive: 1 }]);
      expect(markdownEffects).toHaveLength(1);
      expect(markdownEffects[0]).toMatchObject({
        connected: true,
        assigned: true,
      });
    }
  );

  it.each(wrappers)(
    'keeps the retained commit wait through %s effect replay',
    async (_name, Wrapper) => {
      let effectsAtAfter = 0;
      const after = jest.fn(() => {
        effectsAtAfter = markdownPassiveEffects;
      });
      render(
        <React.StrictMode>
          <Wrapper {...createBaseConfig()} className="" onAfterRender={after} />
        </React.StrictMode>
      );
      await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });
      expect(markdownPassiveEffects).toBeGreaterThan(0);
      expect(effectsAtAfter).toBe(markdownPassiveEffects);
    }
  );

  it.each(wrappers)(
    'releases a failed native body without blocking %s startup',
    async (_name, Wrapper) => {
      const prototype = ErrorBody.prototype as unknown as {
        renderView(): unknown;
      };
      jest.spyOn(prototype, 'renderView').mockImplementationOnce(() => {
        throw new Error('Native body failed');
      });
      const after = jest.fn();
      const onError = jest.fn();
      render(
        <Wrapper
          {...createBaseConfig()}
          className=""
          onError={onError}
          onAfterRender={after}
        />
      );
      await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(markdownPassiveEffects).toBe(0);
    }
  );

  it.each(wrappers)(
    'drops a deferred native commit after %s unmounts',
    async (_name, Wrapper) => {
      const gate = resolvablePromise();
      const prototype = ErrorBody.prototype as unknown as {
        scheduleUpdate(): void | Promise<void>;
      };
      const schedule = prototype.scheduleUpdate;
      const scheduled = jest
        .spyOn(prototype, 'scheduleUpdate')
        .mockImplementation(function (this: ErrorBody) {
          return gate.then(() => schedule.call(this));
        });
      const after = jest.fn();
      const mounted = render(
        <Wrapper {...createBaseConfig()} className="" onAfterRender={after} />
      );
      await waitFor(() => expect(scheduled).toHaveBeenCalled());
      mounted.unmount();
      await act(async () => {
        gate.doResolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(after).not.toHaveBeenCalled();
      expect(markdownPassiveEffects).toBe(0);
    }
  );
});
