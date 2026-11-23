/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The footer slot below a user message, measured in a real browser. The
 * spacing depends on `::slotted` styles and a flex gap that only a real layout
 * computes.
 */

import React from 'react';
import { act, render } from '@testing-library/react';

import { ChatContainer } from '../../../react/ChatContainer';
import type { ChatInstance } from '../../../types/instance/ChatInstance';
import { MessageResponseTypes } from '../../../types/messaging/Messages';
import {
  createBaseConfig,
  getChatShadowRoot,
  setupAfterEach,
  setupBeforeEach,
} from '../helpers/chat';
import { untilCalled, untilDom } from '../helpers/waits';

const REQUEST_FOOTER_SLOT = 'div[slot^="request-footer-"]';
const REQUEST_FOOTER_WRAPPER = '.cds-aichat--request-footer-slot';

// The demo page loads Carbon's global reset, which zeroes the margin and
// padding of every div in the document. The host's footer content is one, so
// the spacing must not rely on a margin there.
const GLOBAL_RESET = 'div { margin: 0; padding: 0; border: 0; }';
// A filled footer, sized like the demo's box.
const FOOTER_BOX =
  '.request-footer-box { block-size: 40px; inline-size: 120px; background: green; }';

let reset: HTMLStyleElement;

beforeEach(() => {
  setupBeforeEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
  reset = document.createElement('style');
  reset.textContent = `${GLOBAL_RESET}\n${FOOTER_BOX}`;
  document.head.appendChild(reset);
});

afterEach(() => {
  setupAfterEach();
  reset.remove();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

/** A filled footer, sized like the demo's box by `FOOTER_BOX`. */
function FooterBox() {
  return <div className="request-footer-box" />;
}

async function mountChat(): Promise<{
  instance: ChatInstance;
  root: ShadowRoot;
}> {
  let instance: ChatInstance;
  const after = vi.fn();
  render(
    <ChatContainer
      {...createBaseConfig()}
      openChatByDefault
      homescreen={{ isOn: false }}
      messaging={{ skipWelcome: true, customSendMessage: async () => {} }}
      onBeforeRender={(chat) => {
        instance = chat;
      }}
      onAfterRender={after}
      renderCustomRequestFooter={() => <FooterBox />}
      renderCustomMessageFooter={() => <FooterBox />}
    />
  );
  await untilCalled(after);
  return { instance, root: getChatShadowRoot() };
}

async function send(instance: ChatInstance, text: string) {
  await act(() => instance.send(text));
}

describe('custom request footer layout', () => {
  it('an unfilled footer slot costs the message no height', async () => {
    const { instance, root } = await mountChat();
    await send(instance, 'measure me');

    await untilDom([document.body, root], () => {
      expect(root.querySelector(REQUEST_FOOTER_WRAPPER)).not.toBeNull();
      expect(
        document.querySelector(`${REQUEST_FOOTER_SLOT} .request-footer-box`)
      ).not.toBeNull();
    });
    const wrapper = root.querySelector<HTMLElement>(REQUEST_FOOTER_WRAPPER);

    // Measure the whole sent column, not the wrapper alone: a margin on the
    // wrapper would not show up in its own box but would still push the next
    // message down.
    const column = root.querySelector<HTMLElement>('.cds-aichat--sent');
    const filled = column.getBoundingClientRect().height;
    expect(filled).toBeGreaterThan(0);

    // Emptying the slot must return the column to the height it has when no
    // host fills the wrapper.
    document
      .querySelectorAll('[slot^="request-footer-"]')
      .forEach((node) => node.parentElement?.removeChild(node));

    const emptied = column.getBoundingClientRect().height;

    // The wrapper is still in the DOM and still empty, and the column is back
    // to its unfooted height.
    expect(wrapper.isConnected).toBe(true);
    expect(emptied).toBeLessThan(filled);
    await expect.poll(() => wrapper.getBoundingClientRect().height).toBe(0);
  });

  it('the footer sits as far below the bubble as a reply footer', async () => {
    const { instance, root } = await mountChat();
    await send(instance, 'mind the gap');
    await act(() =>
      instance.messaging.addMessage({
        id: 'reply-with-footer',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'a reply',
              message_item_options: {
                custom_footer_slot: {
                  is_on: true,
                  slot_name: 'reply-footer-1',
                },
              },
            },
          ],
        },
      })
    );

    await untilDom([document.body, root], () => {
      expect(
        document.querySelector(`${REQUEST_FOOTER_SLOT} .request-footer-box`)
      ).not.toBeNull();
      expect(root.querySelector('.cds-aichat--message-footer')).not.toBeNull();
    });
    const footers = document.querySelectorAll<HTMLElement>(REQUEST_FOOTER_SLOT);
    const footer = footers[footers.length - 1];
    const bubbles = root.querySelectorAll<HTMLElement>(
      '.cds-aichat--sent--bubble'
    );
    const bubbleBottom =
      bubbles[bubbles.length - 1].getBoundingClientRect().bottom;
    const footerTop = footer.getBoundingClientRect().top;

    const replyFooters = root.querySelectorAll<HTMLElement>(
      '.cds-aichat--message-footer'
    );
    const replySpacing = parseFloat(
      getComputedStyle(replyFooters[replyFooters.length - 1]).marginBlockStart
    );

    // The reset zeroed the host's div margin, so the gap is the chat's own.
    expect(getComputedStyle(footer).marginBlockStart).toBe('0px');
    expect(replySpacing).toBeGreaterThan(0);
    expect(Math.round(footerTop - bubbleBottom)).toBe(replySpacing);
  });
});
