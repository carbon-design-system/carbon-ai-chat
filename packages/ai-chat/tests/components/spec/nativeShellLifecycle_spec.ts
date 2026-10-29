/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import ChatShell from '../../../src/chat/components/shell/ChatShell';
import type ChatInput from '../../../src/chat/components/input/ChatInput';
import type { ChatViewState } from '../../../src/chat/services/chatViewState';
import { useChatViewStateInstance } from '../../../src/chat/hooks/useChatViewState';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import actions from '../../../src/chat/store/actions';
import * as resizeLifecycle from '../../../src/chat/utils/resizeObserver';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const wrappers = [
  ['ChatContainer', ChatContainer],
  ['ChatCustomElement', ChatCustomElement],
] as const;

async function boot(
  Wrapper: (typeof wrappers)[number][1] = ChatContainer,
  props: Partial<ChatContainerProps> = {}
) {
  let instance: ChatInstance;
  const after = jest.fn();
  const mounted = render(
    React.createElement(Wrapper, {
      ...createBaseConfig(),
      openChatByDefault: true,
      shouldTakeFocusIfOpensAutomatically: false,
      homescreen: { isOn: false },
      ...props,
      onBeforeRender: (chat) => {
        instance = chat;
        props.onBeforeRender?.(chat);
      },
      onAfterRender: after,
    })
  );
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
    timeout: 5000,
  });
  const root = document.querySelector('cds-aichat-container').shadowRoot;
  const view = root.querySelector<ChatShell>('cds-aichat-chat-shell');
  await view.whenReady();
  const manager = (view as unknown as { viewState: ChatViewState }).viewState
    .serviceManager;
  return { instance, root, view, mounted, manager };
}

beforeEach(setupBeforeEach);
afterEach(() => {
  setupAfterEach();
  jest.restoreAllMocks();
});

describe.each(wrappers)(
  'native shell registration through %s',
  (_name, Wrapper) => {
    it('publishes renderer handles before the first consumer passive effect', async () => {
      const seen = jest.fn();
      function Consumer(): React.ReactElement | null {
        const { serviceManager } = useChatViewStateInstance();
        useEffect(() => {
          const { appWindow, mainWindow } = serviceManager;
          seen(appWindow, mainWindow);
        }, [serviceManager]);
        return null;
      }
      const f = await boot(Wrapper, {
        renderWriteableElements: {
          footerElement: React.createElement(Consumer),
        },
      });
      expect(seen).toHaveBeenCalledTimes(1);
      const [appWindow, mainWindow] = seen.mock.calls[0];
      expect(appWindow?.requestFocus).toEqual(expect.any(Function));
      expect(mainWindow?.requestFocus).toEqual(expect.any(Function));
      expect(mainWindow?.doAutoScroll).toEqual(expect.any(Function));
      expect(mainWindow?.doScrollToMessage).toEqual(expect.any(Function));
      expect(mainWindow?.getMessagesScrollBottom).toEqual(expect.any(Function));
      expect(f.manager.appWindow).toBe(appWindow);
      expect(f.manager.mainWindow).toBe(mainWindow);
      f.mounted.unmount();
      expect(f.manager.appWindow).toBeUndefined();
      expect(f.manager.mainWindow).toBeUndefined();
    });
  }
);

it('releases native DOM resources and registrations on detach, reconnects once, and preserves replacement registrations', async () => {
  const observeResize = resizeLifecycle.observeResize;
  const releases: { target: HTMLElement; release: jest.Mock }[] = [];
  jest
    .spyOn(resizeLifecycle, 'observeResize')
    .mockImplementation((target, callback) => {
      const release = jest.fn(observeResize(target, callback));
      releases.push({ target, release });
      return release;
    });
  const f = await boot();
  const widget = f.view.querySelector<HTMLElement>('cds-aichat-shell');
  const first = releases.filter(({ target }) => target === widget);
  expect(first).toHaveLength(1);
  const parent = f.view.parentNode;
  act(() => {
    f.view.remove();
  });
  await Promise.resolve();
  expect(first[0].release).toHaveBeenCalledTimes(1);
  expect(f.manager.appWindow).toBeUndefined();
  expect(f.manager.mainWindow).toBeUndefined();
  act(() => {
    parent.appendChild(f.view);
  });
  await f.view.updateComplete;
  await waitFor(() =>
    expect(releases.filter(({ target }) => target === widget)).toHaveLength(2)
  );
  expect(f.manager.appWindow?.requestFocus).toEqual(expect.any(Function));
  expect(f.manager.mainWindow?.requestFocus).toEqual(expect.any(Function));
  const replacementApp = { requestFocus: jest.fn() };
  const replacementMain = {
    requestFocus: jest.fn(),
    doAutoScroll: jest.fn(),
    doScrollToMessage: jest.fn(),
    getMessagesScrollBottom: () => 0,
  };
  f.manager.appWindow = replacementApp;
  f.manager.mainWindow = replacementMain;
  act(() => {
    f.view.remove();
  });
  await Promise.resolve();
  first[0].release();
  expect(f.manager.appWindow).toBe(replacementApp);
  expect(f.manager.mainWindow).toBe(replacementMain);
  act(() => {
    parent.appendChild(f.view);
  });
});

it('updates message content without updating the shell for unrelated typing and transcript changes', async () => {
  const f = await boot();
  await act(async () => {
    await f.instance.messaging.addMessage({
      id: 'shell-isolated-body',
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Before' }],
      },
    });
  });
  await f.view.whenReady();
  const messageText = () =>
    deepQuerySelector(
      f.view.querySelector('.cds-aichat--messages'),
      'cds-aichat-markdown'
    )?.shadowRoot?.textContent;
  await waitFor(() => expect(messageText()).toContain('Before'));
  const update = jest.spyOn(f.view as any, 'performUpdate');
  const store = f.manager.store;
  act(() => {
    store.dispatch(
      actions.setChatMessagesStateProperty('isMessageLoadingCounter', 1)
    );
    store.dispatch(
      actions.setAppStateValue('humanAgentState', {
        ...store.getState().humanAgentState,
        isHumanAgentTyping: true,
      })
    );
    store.dispatch(
      actions.updateInputState(
        { rawValue: 'Draft', content: { type: 'doc', content: [] } },
        false
      )
    );
    const local = Object.values(store.getState().allMessageItemsByID).find(
      (item) => item.fullMessageID === 'shell-isolated-body'
    );
    store.dispatch(
      actions.updateLocalMessageItem({
        ...local,
        item: { response_type: MessageResponseTypes.TEXT, text: 'After' },
      })
    );
  });
  await waitFor(() => expect(messageText()).toContain('After'));
  await f.view.updateComplete;
  expect(update).not.toHaveBeenCalled();
});

it('finishes receive callbacks while native input readiness is still pending', async () => {
  const f = await boot();
  const input = f.view.querySelector<ChatInput>('cds-aichat-chat-input');
  let release: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  jest.spyOn(input, 'ready', 'get').mockReturnValue(blocked);
  const ready = jest.fn();
  const pending = f.view.whenReady().then(ready);
  const order: string[] = [];
  f.instance.on([
    {
      type: BusEventType.PRE_RECEIVE,
      handler: () => {
        order.push('pre:receive');
      },
    },
    {
      type: BusEventType.RECEIVE,
      handler: () => {
        order.push('receive');
      },
    },
  ]);
  await act(async () => {
    await f.instance.messaging.addMessage({
      id: 'received-before-shell-ready',
      output: {
        generic: [
          { response_type: MessageResponseTypes.TEXT, text: 'Received' },
        ],
      },
    });
    order.push('complete');
  });
  expect(order).toEqual(['pre:receive', 'receive', 'complete']);
  expect(
    f.instance.state
      .get()
      .messages.some((message) => message.id === 'received-before-shell-ready')
  ).toBe(true);
  expect(ready).not.toHaveBeenCalled();
  release();
  await pending;
  expect(ready).toHaveBeenCalledWith(true);
});
