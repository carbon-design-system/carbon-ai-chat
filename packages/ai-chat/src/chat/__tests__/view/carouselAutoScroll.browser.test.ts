/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A carousel that grows one card per `upsertMessage` snapshot keeps its
 * request pinned while each card mounts and the carousel starts. These cases
 * read real scroll geometry frame by frame, so they run in a browser. Only
 * `upsertMessage` shows a carousel while it streams, so there is no
 * `addMessageChunk` case.
 */

import { page } from 'vitest/browser';

import { MessageResponseTypes } from '../../../types/messaging/Messages';
import { setupAfterEach, setupBeforeEach } from '../helpers/chat';
import {
  MARKDOWN,
  type Responder,
  type ScrollChat,
  hasText,
  mountScrollChat,
  sendAndReceive,
  sendResponse,
  streamCarousel,
} from '../helpers/browserScroll';

interface ScrollFrame {
  offset: number;
  scrollTop: number;
  scrollHeight: number;
  spacerHeight: number;
}

/** Time between cards, so the carousel starts before the next one lands. */
const CARD_DELAY = 500;

let chat: ScrollChat | undefined;

function lastRequest(list: HTMLElement) {
  const requests = list.querySelectorAll('.cds-aichat--message--request');
  return requests[requests.length - 1];
}

function readGeometry({ list, scroller }: ScrollChat): ScrollFrame {
  return {
    offset:
      lastRequest(list).getBoundingClientRect().top -
      scroller.getBoundingClientRect().top,
    scrollTop: scroller.scrollTop,
    scrollHeight: scroller.scrollHeight,
    spacerHeight: list
      .querySelector('#chat-bottom-spacer')
      .getBoundingClientRect().height,
  };
}

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
            text: text === 'text' ? MARKDOWN : 'Welcome to this example.',
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
  // The demo's page size, which the fixed chat host fits inside.
  await page.viewport(1280, 720);
});

afterEach(() => {
  chat?.unmount();
  chat = undefined;
  setupAfterEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe('streamed carousel auto-scroll through upsertMessage', () => {
  it.each([
    ['', false],
    [' with history', true],
  ])(
    'keeps the streamed carousel request pinned%s',
    async (_label, history) => {
      chat = await mountScrollChat(respond);
      const scrollChat = chat;
      const { list } = scrollChat;
      if (history) {
        await sendAndReceive(scrollChat, 'text');
        await sendAndReceive(scrollChat, 'text');
      }
      const sending = sendAndReceive(scrollChat, 'carousel (stream)');
      await expect
        .poll(() => hasText(lastRequest(list), 'carousel (stream)'))
        .toBe(true);
      await expect
        .poll(() => readGeometry(scrollChat).offset)
        .toBeLessThan(100);
      await expect
        .poll(() => readGeometry(scrollChat).scrollTop)
        .toBeGreaterThan(0);
      const baseline = readGeometry(scrollChat);
      // Sample every frame until the carousel has started all three cards, then
      // twelve frames more.
      const framesPromise = new Promise<ScrollFrame[]>((resolve) => {
        const frames: ScrollFrame[] = [];
        let initializedFrames = 0;
        const sample = () => {
          frames.push(readGeometry(scrollChat));
          if (list.querySelectorAll('.carousel__view').length === 3) {
            initializedFrames++;
          }
          if (initializedFrames === 12) {
            resolve(frames);
          } else {
            requestAnimationFrame(sample);
          }
        };
        requestAnimationFrame(sample);
      });
      const [frames] = await Promise.all([framesPromise, sending]);
      expect(frames.length).toBeGreaterThan(12);
      expect(
        Math.max(
          ...frames.map((frame) => Math.abs(frame.offset - baseline.offset))
        ),
        JSON.stringify(
          frames.filter((frame) => Math.abs(frame.offset - baseline.offset) > 2)
        )
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(readGeometry(scrollChat).offset - baseline.offset)
      ).toBeLessThanOrEqual(2);
    }
  );
});
