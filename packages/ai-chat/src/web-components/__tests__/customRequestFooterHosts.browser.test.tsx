/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The footer slot below a user message through a React wrapper and through
 * the `cds-aichat-container` element: restart removes the hosts each one
 * created, and a restored conversation gets footers on both sides. React
 * portals its content into the slot; the element appends the callback's node
 * to its own light DOM, so each case runs on both paths. A real browser shows
 * whether the slotted content renders.
 */

import React from 'react';
import { act, render } from '@testing-library/react';

import '../cds-aichat-container';
import { ChatCustomElement } from '../../react/ChatCustomElement';
import type { ChatInstance } from '../../types/instance/ChatInstance';
import type { PublicConfig } from '../../types/config/PublicConfig';
import type {
  RenderCustomMessageFooterState,
  RenderCustomRequestFooterState,
} from '../../types/component/ChatContainer';
import {
  MessageResponseTypes,
  type MessageRequest,
  type MessageResponse,
} from '../../types/messaging/Messages';
import type { HistoryItem } from '../../types/messaging/History';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';
import { untilCalled, untilDom } from '../../chat/__tests__/helpers/waits';

// The host element the callback's content lands in. Scoped to `div`: the
// element also emits a passthrough `<slot slot="...">` for each name.
const REQUEST_FOOTER_SLOT = 'div[slot^="request-footer-"]';
const FILLED = '.footer-content';

const config = (): PublicConfig => ({
  ...createBaseConfig(),
  openChatByDefault: true,
  homescreen: { isOn: false },
  messaging: { skipWelcome: true, customSendMessage: async () => {} },
});

/** Every element matching `selector`, through every open shadow root. */
function deepAll(selector: string, root: ParentNode = document): Element[] {
  const found = [...root.querySelectorAll(selector)];
  root.querySelectorAll('*').forEach((element) => {
    if (element.shadowRoot) {
      found.push(...deepAll(selector, element.shadowRoot));
    }
  });
  return found;
}

/** Whether the browser paints `element` with a real box. */
function rendered(element: Element): boolean {
  const box = element.getBoundingClientRect();
  return element.checkVisibility() && box.width > 0 && box.height > 0;
}

function footerContent(text: string): HTMLElement {
  const element = document.createElement('div');
  element.className = 'footer-content';
  element.style.blockSize = '24px';
  element.textContent = text;
  return element;
}

interface Host {
  instance: ChatInstance;
}

/** The demo's default React host: a `ChatCustomElement` with both footers. */
async function bootReact(): Promise<Host> {
  let instance: ChatInstance;
  const after = vi.fn();
  render(
    <ChatCustomElement
      {...config()}
      className="footer-host"
      onBeforeRender={(chat) => {
        instance = chat;
      }}
      onAfterRender={after}
      renderCustomRequestFooter={(_slotName, message) => (
        <div className="footer-content">{message.input.text}</div>
      )}
      renderCustomMessageFooter={(slotName) => (
        <div className="footer-content">{slotName}</div>
      )}
    />
  );
  await untilCalled(after);
  return { instance };
}

/** The demo's web-component host: a float `cds-aichat-container`. */
async function bootElement(): Promise<Host> {
  let instance: ChatInstance;
  const ready = vi.fn();
  const requestFooters = new Map<string, HTMLElement>();
  const messageFooters = new Map<string, HTMLElement>();
  const element = document.createElement('cds-aichat-container');
  element.config = config();
  element.onBeforeRender = (chat: ChatInstance) => {
    instance = chat;
  };
  element.onAfterRender = ready;
  // Return the same node for a slot on every call, as the callback's docs ask.
  element.renderCustomRequestFooter = (
    state: RenderCustomRequestFooterState
  ) => {
    if (!requestFooters.has(state.slotName)) {
      requestFooters.set(
        state.slotName,
        footerContent(state.message.input.text ?? '')
      );
    }
    return requestFooters.get(state.slotName);
  };
  element.renderCustomMessageFooter = (
    state: RenderCustomMessageFooterState
  ) => {
    if (!messageFooters.has(state.slotName)) {
      messageFooters.set(state.slotName, footerContent(state.slotName));
    }
    return messageFooters.get(state.slotName);
  };
  document.body.appendChild(element);
  await untilCalled(ready);
  return { instance };
}

const HOSTS = {
  react: bootReact,
  'web component': bootElement,
} as const;

async function untilFooterCount(count: number) {
  await untilDom(document.body, () =>
    expect(deepAll(REQUEST_FOOTER_SLOT)).toHaveLength(count)
  );
}

async function insertHistory(instance: ChatInstance) {
  const now = new Date().toISOString();
  const request: MessageRequest = {
    id: 'history-request-1',
    input: { text: 'a restored question' },
  };
  const response: MessageResponse = {
    id: 'history-response-1',
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: 'a restored answer',
          message_item_options: {
            custom_footer_slot: {
              is_on: true,
              slot_name: 'history-footer-1',
              additional_data: { allow_copy: true },
            },
          },
        },
      ],
    },
  };
  const history: HistoryItem[] = [
    { message: request, time: now },
    { message: response, time: now },
  ];
  await act(() => instance.messaging.insertHistory(history));
}

// `ChatCustomElement` fills the element the host sizes, as the demo's
// fullscreen layout does.
let sizing: HTMLStyleElement;

beforeEach(() => {
  setupBeforeEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
  sizing = document.createElement('style');
  sizing.textContent =
    '.footer-host { inline-size: 600px; block-size: 560px; }\n' +
    '.footer-content { block-size: 24px; }';
  document.head.appendChild(sizing);
});

afterEach(() => {
  setupAfterEach();
  sizing.remove();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe('custom request footer hosts', () => {
  it('restart removes callback-created wrappers', async () => {
    const { instance } = await HOSTS.react();
    await act(() => instance.send('before restart'));
    await untilFooterCount(1);

    await act(() => instance.messaging.restartConversation());

    // No orphaned light-DOM children survive the restart.
    await untilFooterCount(0);
  });

  describe('web component', () => {
    it('restart removes the wrappers it created', async () => {
      const { instance } = await HOSTS['web component']();
      await act(() => instance.send('before restart'));
      await untilFooterCount(1);

      await act(() => instance.messaging.restartConversation());

      await untilFooterCount(0);
    });
  });

  /** The three restore cases, once per host. */
  const restoreCases = (boot: () => Promise<Host>) => {
    it('renders a footer on a restored user message', async () => {
      const { instance } = await boot();
      await insertHistory(instance);

      await untilFooterCount(1);
      await untilDom(document.body, () => {
        const [content] = deepAll(`${REQUEST_FOOTER_SLOT} ${FILLED}`);
        expect(content?.textContent).toBe('a restored question');
        expect(rendered(content)).toBe(true);
      });
    });

    it('renders a footer on a restored assistant message', async () => {
      const { instance } = await boot();
      await insertHistory(instance);

      await untilDom(document.body, () => {
        const [host] = deepAll('div[slot="history-footer-1"]');
        expect(host).toBeDefined();
        expect(host.children.length).toBeGreaterThan(0);
        expect(rendered(host.querySelector(FILLED))).toBe(true);
      });
    });

    it('restored and live messages both get footers', async () => {
      const { instance } = await boot();
      await insertHistory(instance);
      await untilFooterCount(1);

      await act(() => instance.send('a live question'));

      await untilFooterCount(2);
    });
  };

  describe('history', () => {
    restoreCases(HOSTS.react);
  });

  // The element fills the slot on its own path rather than through a React
  // portal.
  describe('history (web component)', () => {
    restoreCases(HOSTS['web component']);
  });
});
