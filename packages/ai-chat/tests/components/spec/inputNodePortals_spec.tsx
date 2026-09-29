/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import {
  act,
  render as renderWithTestingLibrary,
  waitFor,
} from '@testing-library/react';
import { createMarkdownPluginHostController } from '@carbon/ai-chat-components/es/components/markdown/src/utils/plugin-host-container.js';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import '../../../src/web-components/cds-aichat-container';
import '../../../src/web-components/cds-aichat-custom-element';
import { InputNodePortalsContainer } from '../../../src/chat/components/portals/InputNodePortalsContainer';
import type { WCRenderUserDefinedInputNode } from '../../../src/types/component/ChatContainer';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type { MessageRequest } from '../../../src/types/messaging/Messages';

import { StoreProvider } from '../../../src/chat/providers/StoreProvider';
import { createBaseConfig, makeConfigStore } from '../../test_helpers';
import actions from '../../../src/chat/store/actions';

let store: ReturnType<typeof makeConfigStore>;
function render(ui: React.ReactElement) {
  return renderWithTestingLibrary(ui, {
    wrapper: ({ children }) => (
      <StoreProvider store={store}>{children}</StoreProvider>
    ),
  });
}

const instance = {} as ChatInstance;
const slotName = 'message::0.0';

function message(): MessageRequest {
  return {
    id: 'message',
    input: {
      text: 'custom',
      display_content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'custom', attrs: { label: 'fallback' } }],
          },
        ],
      },
    },
  } as MessageRequest;
}

beforeEach(() => {
  store = makeConfigStore({});
  store.dispatch(
    actions.setAppStateValue('allMessagesByID', { message: message() })
  );
});

test.each([0, 1, 2])(
  'projects the host through %i shadow boundaries and clears every forwarder',
  (depth) => {
    const outer = document.createElement('div');
    document.body.appendChild(outer);
    const slotLists: string[][] = [];
    const controllers = [];
    let wrapper = outer;
    for (let index = 0; index <= depth; index++) {
      const current = wrapper;
      slotLists[index] = [];
      const controller = createMarkdownPluginHostController(current, {
        shouldDefer: () => index > 0,
        onSlotNamesChange: (names) => {
          slotLists[index] = names;
        },
      });
      controller.connect();
      controllers.push(controller);
      if (index < depth) {
        wrapper = document.createElement('div');
        current.attachShadow({ mode: 'open' }).appendChild(wrapper);
      }
    }
    const renderer = () => <span className="consumer-chip">custom</span>;
    const view = render(
      <InputNodePortalsContainer
        chatWrapper={wrapper}
        chatInstance={instance}
        renderUserDefinedInputNode={renderer}
      />
    );
    const chip = outer.querySelector('.consumer-chip');
    expect(chip).not.toBeNull();
    expect(chip?.getRootNode()).toBe(document);
    expect(chip?.parentElement?.getAttribute('slot')).toBe(slotName);
    expect(slotLists).toEqual(
      Array.from({ length: depth + 1 }, () => [slotName])
    );
    view.rerender(
      <InputNodePortalsContainer
        chatWrapper={wrapper}
        chatInstance={instance}
        renderUserDefinedInputNode={() => null}
      />
    );
    expect(outer.querySelector('.consumer-chip')).toBeNull();
    expect(slotLists).toEqual(
      Array.from({ length: depth + 1 }, (): string[] => [])
    );
    view.rerender(
      <InputNodePortalsContainer
        chatWrapper={wrapper}
        chatInstance={instance}
        renderUserDefinedInputNode={renderer}
      />
    );
    expect(outer.querySelector('.consumer-chip')).not.toBeNull();
    expect(slotLists).toEqual(
      Array.from({ length: depth + 1 }, () => [slotName])
    );
    view.unmount();
    expect(outer.querySelector('.consumer-chip')).toBeNull();
    expect(slotLists).toEqual(
      Array.from({ length: depth + 1 }, (): string[] => [])
    );
    controllers.forEach((controller) => controller.disconnect());
    outer.remove();
  }
);

describe.each(['cds-aichat-container', 'cds-aichat-custom-element'])(
  '%s input nodes',
  (tagName) => {
    async function boot(
      renderUserDefinedInputNode: WCRenderUserDefinedInputNode
    ) {
      let chat!: ChatInstance;
      const element = document.createElement(tagName) as HTMLElement &
        Record<string, unknown>;
      element.config = { ...createBaseConfig(), openChatByDefault: true };
      element.onBeforeRender = (next: ChatInstance) => {
        chat = next;
      };
      element.renderUserDefinedInputNode = renderUserDefinedInputNode;
      document.body.appendChild(element);
      await waitFor(() => expect(chat).toBeDefined(), { timeout: 8000 });
      await act(() => chat.send(message()));
      const bubbleSlot = () =>
        deepQuerySelector(
          element.shadowRoot,
          `slot[name="${slotName}"]`
        ) as HTMLSlotElement | null;
      await waitFor(() => expect(bubbleSlot()).not.toBeNull(), {
        timeout: 8000,
      });
      return { element, bubbleSlot, chat };
    }

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('shows the fallback when the callback returns null', async () => {
      const callback = jest.fn((): HTMLElement | null => null);
      const { element, bubbleSlot } = await boot(callback);
      await waitFor(() => expect(callback).toHaveBeenCalled());
      expect(element.querySelector(`[slot="${slotName}"]`)).toBeNull();
      expect(bubbleSlot().assignedNodes()).toHaveLength(0);
      expect(bubbleSlot().textContent).toBe('fallback');
    }, 20000);

    it('hosts the returned element in page light DOM and projects it into the bubble', async () => {
      const chip = document.createElement('span');
      chip.textContent = 'custom';
      const { element, bubbleSlot } = await boot(() => chip);
      await waitFor(() =>
        expect(
          bubbleSlot()
            .assignedNodes({ flatten: true })
            .map((node) => node.textContent)
        ).toEqual(['custom'])
      );
      const host = element.querySelector(`:scope > [slot="${slotName}"]`);
      expect(host?.contains(chip)).toBe(true);
      expect(chip.getRootNode()).toBe(document);
    }, 20000);

    it('keeps the returned element through unrelated message updates', async () => {
      const chip = document.createElement('span');
      const callback = jest.fn(() => chip);
      const { element, chat } = await boot(callback);
      await waitFor(() => expect(chip.isConnected).toBe(true));
      const host = element.querySelector(`[slot="${slotName}"]`);
      const calls = callback.mock.calls.length;
      await act(() => chat.send('unrelated'));
      await act(async () => {});
      expect(callback).toHaveBeenCalledTimes(calls);
      expect(chip.isConnected).toBe(true);
      expect(element.querySelector(`[slot="${slotName}"]`)).toBe(host);
    }, 20000);
  }
);

test('Strict Mode keeps one host, moves it with the wrapper, and removes deleted messages', () => {
  const wrapper = document.createElement('div');
  const replacement = document.createElement('div');
  const renderer = () => <span>custom</span>;
  const tree = (chatWrapper: HTMLElement) => (
    <React.StrictMode>
      <InputNodePortalsContainer
        chatWrapper={chatWrapper}
        chatInstance={instance}
        renderUserDefinedInputNode={renderer}
      />
    </React.StrictMode>
  );
  const view = render(tree(wrapper));
  expect(wrapper.children).toHaveLength(1);
  view.rerender(tree(replacement));
  expect(wrapper.children).toHaveLength(0);
  expect(replacement.children).toHaveLength(1);
  act(() => store.dispatch(actions.setAppStateValue('allMessagesByID', {})));
  view.rerender(tree(replacement));
  expect(replacement.children).toHaveLength(0);
  view.unmount();
});
