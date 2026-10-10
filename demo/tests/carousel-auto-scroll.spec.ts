/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { destroyChatSession, openChatWindow, sendChatMessage } from './utils';
import type {} from '../types/window';

interface ScrollFrame {
  pinnedMessage?: string;
  streamState?: string;
  offset: number;
  scrollTop: number;
  scrollHeight: number;
  spacerHeight: number;
}

const readGeometry = (page: Page) =>
  page.locator('.cds-aichat--messages').evaluate((list): ScrollFrame => {
    const scroller = list.parentElement!;
    const pin = list.querySelectorAll('.cds-aichat--message--request');
    return {
      offset:
        pin[pin.length - 1].getBoundingClientRect().top -
        scroller.getBoundingClientRect().top,
      scrollTop: scroller.scrollTop,
      scrollHeight: scroller.scrollHeight,
      spacerHeight: list
        .querySelector('#chat-bottom-spacer')!
        .getBoundingClientRect().height,
    };
  });

test.afterEach(async ({ page }) => destroyChatSession(page));

for (const history of [false, true]) {
  test(`keeps the streamed carousel request pinned${history ? ' with history' : ''}`, async ({
    page,
    useUpsertMessage,
  }) => {
    test.skip(
      !useUpsertMessage,
      'The carousel response uses streaming upserts.'
    );
    await page.route(/.*ibm-common\.js$/, (route) => route.abort());
    await page.goto('/');
    await openChatWindow(page);
    if (history) {
      await sendChatMessage(page, 'text');
      await sendChatMessage(page, 'text');
    }
    const sending = sendChatMessage(page, 'carousel (stream)');
    await expect(
      page.locator('.cds-aichat--message--request').last()
    ).toContainText('carousel (stream)');
    await expect
      .poll(async () => (await readGeometry(page)).offset)
      .toBeLessThan(100);
    await expect
      .poll(async () => (await readGeometry(page)).scrollTop)
      .toBeGreaterThan(0);
    const baseline = await readGeometry(page);
    const framesPromise = page.locator('.cds-aichat--messages').evaluate(
      (list) =>
        new Promise<ScrollFrame[]>((resolve) => {
          const scroller = list.parentElement!;
          const requests = list.querySelectorAll(
            '.cds-aichat--message--request'
          );
          const pin = requests[requests.length - 1];
          const frames: ScrollFrame[] = [];
          const messaging = window.chatInstance!.messaging;
          const upsertMessage = messaging.upsertMessage;
          let streamState = 'pending';
          messaging.upsertMessage = (id, state, updater) => {
            streamState = state;
            return upsertMessage(id, state, updater);
          };
          let initializedFrames = 0;
          const sample = () => {
            frames.push({
              pinnedMessage: pin.getAttribute('data-testid')!,
              streamState,
              offset:
                pin.getBoundingClientRect().top -
                scroller.getBoundingClientRect().top,
              scrollTop: scroller.scrollTop,
              scrollHeight: scroller.scrollHeight,
              spacerHeight: list
                .querySelector('#chat-bottom-spacer')!
                .getBoundingClientRect().height,
            });
            if (list.querySelectorAll('.carousel__view').length === 3) {
              initializedFrames++;
            }
            if (initializedFrames === 12) {
              messaging.upsertMessage = upsertMessage;
              resolve(frames);
            } else {
              requestAnimationFrame(sample);
            }
          };
          requestAnimationFrame(sample);
        })
    );
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
      Math.abs((await readGeometry(page)).offset - baseline.offset)
    ).toBeLessThanOrEqual(2);
  });
}
