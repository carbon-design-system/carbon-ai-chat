/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect, fixture, html, nextFrame, waitUntil } from '@open-wc/testing';
import prefix from '../../../globals/settings.js';
import '../index.js';
import type CDSAIChatMessagesShell from '../src/messages-shell.js';

const blockClass = `${prefix}-messages-shell`;

function row(id: string, height: number): HTMLDivElement {
  const element = document.createElement('div');
  element.id = id;
  element.dataset.messageId = id;
  element.style.blockSize = `${height}px`;
  return element;
}

async function renderConversation(streaming = false) {
  const box = await fixture<HTMLElement>(html`
    <div style="block-size:200px;inline-size:400px">
      <cds-aichat-messages-shell>
        <div id="welcome" style="block-size:360px"></div>
      </cds-aichat-messages-shell>
    </div>
  `);
  const shell = box.querySelector<CDSAIChatMessagesShell>(
    'cds-aichat-messages-shell'
  )!;
  const scroller = shell.shadowRoot!.querySelector<HTMLElement>(
    `.${blockClass}__scroller`
  )!;
  const spacer = shell.shadowRoot!.querySelector<HTMLElement>(
    `.${blockClass}__spacer`
  )!;
  const welcome = shell.querySelector<HTMLElement>('#welcome')!;
  const request = row('request', 40);
  request.setAttribute('data-aichat-pinnable', '');
  const response = row('response', 20);
  response.setAttribute('data-aichat-response', '');
  if (streaming) {
    response.setAttribute('data-aichat-streaming', '');
  }
  shell.append(request, response);
  const offset = (element: HTMLElement) =>
    element.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  const spacerHeight = () => spacer.getBoundingClientRect().height;
  const waitForPin = (element = request) =>
    waitUntil(
      () => Math.abs(offset(element) - 60) <= 1,
      'The real slotted request did not reach its pin position'
    );
  return {
    box,
    shell,
    scroller,
    welcome,
    request,
    response,
    offset,
    spacerHeight,
    waitForPin,
  };
}

describe('messages-shell scrolling consumers', () => {
  it('keeps the request position while real earlier rows and response sizes change', async () => {
    const view = await renderConversation();
    try {
      await view.waitForPin();
      expect(view.scroller.scrollTop).to.be.greaterThan(0);
      expect(view.spacerHeight()).to.be.greaterThan(0);
      const firstTop = view.scroller.scrollTop;

      view.response.style.blockSize = '600px';
      await waitUntil(
        () =>
          view.spacerHeight() <= 1 &&
          Math.abs(view.offset(view.request) - 60) <= 1,
        'Growing the response did not reconcile the real spacer'
      );
      view.welcome.style.blockSize = '500px';
      await view.waitForPin();
      expect(view.scroller.scrollTop).to.be.greaterThan(firstTop + 100);

      view.response.style.blockSize = '20px';
      await waitUntil(
        () =>
          view.spacerHeight() > 0 &&
          Math.abs(view.offset(view.request) - 60) <= 1,
        'Shrinking the response lost the pin or the reachable scroll range'
      );
    } finally {
      view.box.remove();
    }
  });

  it('settles the streaming spacer and keeps a chosen reading position through later resize', async () => {
    const view = await renderConversation(true);
    try {
      await view.waitForPin();
      expect(view.spacerHeight()).to.be.greaterThan(0);
      view.response.style.blockSize = '600px';
      await waitUntil(
        () => view.response.getBoundingClientRect().height === 600,
        'The streaming response did not grow'
      );
      await nextFrame();
      await nextFrame();
      expect(view.spacerHeight()).to.be.greaterThan(0);
      view.scroller.scrollTop = 450;
      view.scroller.dispatchEvent(new Event('scroll'));
      expect(view.scroller.scrollTop).to.equal(450);
      expect(view.spacerHeight()).to.be.greaterThan(0);

      view.response.removeAttribute('data-aichat-streaming');
      await waitUntil(
        () =>
          view.spacerHeight() <= 1 &&
          Math.abs(view.scroller.scrollTop - 450) <= 1,
        'Completion did not settle the spacer at the chosen reading position'
      );
      view.response.style.blockSize = '20px';
      await waitUntil(
        () =>
          view.spacerHeight() > 0 &&
          Math.abs(view.scroller.scrollTop - 450) <= 1,
        'A later response resize lost the reading position'
      );
    } finally {
      view.box.remove();
    }
  });

  it('runs public top and bottom commands against the actual consuming scroller', async () => {
    const view = await renderConversation();
    try {
      await view.waitForPin();
      view.response.style.blockSize = '600px';
      await waitUntil(
        () => view.spacerHeight() <= 1,
        'The response did not release its spacer'
      );
      view.shell.doAutoScroll({ scrollToTop: 100 });
      await waitUntil(
        () => Math.abs(view.scroller.scrollTop - 100) <= 1,
        'The public top command did not reach the consuming scroller'
      );
      view.shell.doAutoScroll({ scrollToBottom: 0, preferAnimate: false });
      await waitUntil(
        () =>
          Math.abs(
            view.scroller.scrollHeight -
              view.scroller.clientHeight -
              view.scroller.scrollTop
          ) <= 1,
        'The public bottom command did not reach the actual bottom'
      );
      expect(view.shell.getContainerScrollBottom()).to.be.at.most(1);
    } finally {
      view.box.remove();
    }
  });

  it('pins a new request and follows its geometry after the consuming shell moves', async () => {
    const view = await renderConversation();
    try {
      await view.waitForPin();
      const parent = view.shell.parentElement!;
      view.shell.remove();
      parent.append(view.shell);
      await view.shell.updateComplete;

      const next = row('next-request', 40);
      next.setAttribute('data-aichat-pinnable', '');
      view.shell.append(next);
      await view.waitForPin(next);
      expect(view.scroller.scrollTop).to.be.greaterThan(0);
      const pinnedTop = view.scroller.scrollTop;

      view.response.style.blockSize = '300px';
      await view.waitForPin(next);
      expect(view.scroller.scrollTop).to.be.greaterThan(pinnedTop + 200);
    } finally {
      view.box.remove();
    }
  });
});
