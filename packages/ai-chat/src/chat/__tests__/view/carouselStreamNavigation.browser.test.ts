/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A carousel that grows one card per `upsertMessage` snapshot shows one card
 * at a time while it streams, then pages through every card it ends with.
 * The checks read computed styles and real card bounds, and click the
 * carousel's own buttons, so they run in a browser. Only `upsertMessage`
 * shows a carousel while it streams, so there is no `addMessageChunk` case.
 */

import { page, userEvent } from 'vitest/browser';

import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';

import { MessageResponseTypes } from '../../../types/messaging/Messages';
import { setupAfterEach, setupBeforeEach } from '../helpers/chat';
import {
  type Responder,
  type ScrollChat,
  hasText,
  mountScrollChat,
  sendAndReceive,
  sendResponse,
  streamCarousel,
} from '../helpers/browserScroll';

interface CarouselFrame {
  cards: number;
  visible: number;
  firstVisible: boolean;
}

/** Time between cards, so the carousel starts before the next one lands. */
const CARD_DELAY = 500;

let chat: ScrollChat | undefined;

const respond: Responder = (text, request, _options, instance) => {
  if (text === 'carousel (stream)') {
    return streamCarousel(instance, request.id, CARD_DELAY);
  }
  return sendResponse(
    instance,
    {
      id: `response-${request.id}`,
      request_id: request.id,
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: 'Welcome to this example.',
          },
        ],
      },
    },
    'upsertMessage'
  );
};

beforeEach(async () => {
  setupBeforeEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
  // The demo's page size, which holds the floating window.
  await page.viewport(1280, 720);
});

afterEach(() => {
  chat?.unmount();
  chat = undefined;
  setupAfterEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe('streamed carousel through upsertMessage', () => {
  it('navigates to cards added while a carousel streams', async () => {
    chat = await mountScrollChat(respond, { layout: 'float' });
    const { root } = chat;

    // Every frame while cards arrive, until the carousel has started all
    // three: how many cards the unstarted list holds, and how many show.
    const pendingFrames = new Promise<CarouselFrame[]>((resolve) => {
      const frames: CarouselFrame[] = [];
      const sample = () => {
        for (const container of root.querySelectorAll(
          '.carousel-container-inner:not(.carousel__view-stack)'
        )) {
          const cards = Array.from(container.children);
          if (cards.length > 1) {
            const visible = cards.map((card) => {
              const style = getComputedStyle(card);
              return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                card.getBoundingClientRect().height > 0
              );
            });
            frames.push({
              cards: cards.length,
              visible: visible.filter(Boolean).length,
              firstVisible: visible[0],
            });
          }
        }
        if (root.querySelectorAll('.carousel__view').length === 3) {
          resolve(frames);
        } else {
          requestAnimationFrame(sample);
        }
      };
      requestAnimationFrame(sample);
    });
    const [frames] = await Promise.all([
      pendingFrames,
      sendAndReceive(chat, 'carousel (stream)'),
    ]);
    expect(frames.map(({ cards }) => cards)).toEqual(
      expect.arrayContaining([2, 3])
    );
    for (const frame of frames) {
      expect(frame).toMatchObject({ visible: 1, firstVisible: true });
    }

    const carousel = deepQuerySelector(root, 'cds-aichat-carousel');
    const indicator = () =>
      carousel.shadowRoot
        .querySelector('.cds-aichat-carousel__indicator')
        ?.textContent.trim();
    const next = carousel.shadowRoot.querySelector<HTMLElement>(
      '.cds-aichat-carousel__next-btn'
    );
    const active = () => carousel.querySelector('.carousel__view-active');
    const expectUnclippedCard = () =>
      expect
        .poll(() => {
          const bounds = active().getBoundingClientRect();
          const viewport = active().parentElement.getBoundingClientRect();
          return (
            bounds.left >= viewport.left - 0.1 &&
            bounds.right <= viewport.right + 0.1
          );
        })
        .toBe(true);
    // The indicator renders in the carousel's own shadow root.
    const untilIndicator = (text: string) =>
      expect.poll(indicator, { timeout: 5000 }).toBe(text);

    await untilIndicator('1 / 3');
    await expectUnclippedCard();
    await userEvent.click(next);
    await untilIndicator('2 / 3');
    await expectUnclippedCard();
    expect(hasText(active(), 'Green Leopard Jacket')).toBe(true);
    await userEvent.click(next);
    await untilIndicator('3 / 3');
    await expectUnclippedCard();
    expect(hasText(active(), 'Yellow Wool Hat')).toBe(true);
  });
});
