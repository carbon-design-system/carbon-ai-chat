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
import type { CDSAIChatMessagesShell } from '../index.js';

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
  const request = row('request', 40);
  request.setAttribute('data-aichat-pinnable', '');
  const response = row('response', 20);
  response.setAttribute('data-aichat-response', '');
  if (streaming) {
    response.setAttribute('data-aichat-streaming', '');
  }
  shell.append(request, response);
  const requestOffset = () =>
    request.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  const spacerHeight = () => spacer.getBoundingClientRect().height;
  const waitForPin = () =>
    waitUntil(
      () => Math.abs(requestOffset() - 60) <= 1,
      'The actual request did not reach its pin position'
    );
  return {
    box,
    shell,
    scroller,
    request,
    response,
    requestOffset,
    spacerHeight,
    waitForPin,
  };
}

describe('messages-shell scrolling choices', () => {
  it('keeps an untouched pin until the last mixed response finishes streaming', async () => {
    const view = await renderConversation(true);
    try {
      const otherResponse = row('other-response', 20);
      otherResponse.setAttribute('data-aichat-response', '');
      otherResponse.setAttribute('data-aichat-streaming', '');
      view.shell.append(otherResponse);
      await view.waitForPin();
      expect(view.spacerHeight()).to.be.greaterThan(0);

      view.response.style.blockSize = '600px';
      await waitUntil(
        () => view.response.getBoundingClientRect().height === 600,
        'The first streaming response did not grow'
      );
      await nextFrame();
      await nextFrame();
      view.response.removeAttribute('data-aichat-streaming');
      await Promise.resolve();
      expect(
        view.shell.getMessages().filter((item) => item.isStreaming)
      ).to.have.length(1);
      await nextFrame();
      await nextFrame();
      expect(view.spacerHeight()).to.be.greaterThan(0);
      expect(view.requestOffset()).to.be.closeTo(60, 1);

      otherResponse.removeAttribute('data-aichat-streaming');
      await waitUntil(
        () =>
          view.spacerHeight() <= 1 && Math.abs(view.requestOffset() - 60) <= 1,
        'The last completion did not settle the spacer at the untouched pin'
      );
    } finally {
      view.box.remove();
    }
  });

  it('honors a newer scroll-up after completion is queued and through a later resize', async () => {
    const view = await renderConversation(true);
    try {
      await view.waitForPin();
      view.response.style.blockSize = '600px';
      await waitUntil(
        () => view.response.getBoundingClientRect().height === 600,
        'The streaming response did not grow'
      );
      await nextFrame();
      await nextFrame();
      expect(view.spacerHeight()).to.be.greaterThan(0);
      expect(view.scroller.scrollTop).to.be.greaterThan(200);
      expect(
        view.scroller.scrollHeight - view.scroller.clientHeight
      ).to.be.greaterThan(200);

      view.response.removeAttribute('data-aichat-streaming');
      // Let the real row observer queue completion, without yielding a frame.
      await Promise.resolve();
      expect(
        view.shell.getMessages().find((item) => item.id === 'response')
          ?.isStreaming
      ).to.equal(false);
      view.scroller.scrollTop = 100;
      view.scroller.dispatchEvent(new Event('scroll'));
      expect(view.scroller.scrollTop).to.equal(100);
      await nextFrame();
      await nextFrame();
      expect(view.scroller.scrollTop).to.be.closeTo(100, 1);

      view.response.style.blockSize = '20px';
      await waitUntil(
        () =>
          view.spacerHeight() <= 1 &&
          Math.abs(view.scroller.scrollTop - 100) <= 1,
        'A later response resize restored the abandoned pin'
      );
    } finally {
      view.box.remove();
    }
  });

  it('reconciles the spacer when the replacement response itself grows and shrinks', async () => {
    const view = await renderConversation();
    try {
      await view.waitForPin();
      expect(view.spacerHeight()).to.be.greaterThan(0);
      const replacement = row('response', 20);
      replacement.setAttribute('data-aichat-response', '');
      view.response.replaceWith(replacement);
      await waitUntil(
        () =>
          view.shell.getMessages().some((item) => item.element === replacement),
        'The replacement response was not adopted from the real slot'
      );
      await nextFrame();
      await nextFrame();
      expect(view.response.isConnected).to.equal(false);
      expect(view.spacerHeight()).to.be.greaterThan(0);

      replacement.style.blockSize = '600px';
      await waitUntil(
        () =>
          view.spacerHeight() <= 1 && Math.abs(view.requestOffset() - 60) <= 1,
        'Growing the adopted response did not reconcile its spacer'
      );
      replacement.style.blockSize = '20px';
      await waitUntil(
        () =>
          view.spacerHeight() > 0 && Math.abs(view.requestOffset() - 60) <= 1,
        'Shrinking the adopted response lost the reachable request pin'
      );
    } finally {
      view.box.remove();
    }
  });
});
