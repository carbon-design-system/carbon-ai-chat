/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { test, expect, type Page } from '@playwright/test';
import { destroyChatSession, openChatWindow, sendChatMessage } from './utils';
import type {} from '../types/window';

interface ScrollFrame {
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

const resizeCustomContent = async (
  page: Page,
  height: number,
  transient = false
) =>
  page
    .locator('.external')
    .last()
    .evaluate(
      (element, { nextHeight, transient, list }) =>
        new Promise<ScrollFrame[]>((resolve) => {
          const scroller = list.parentElement!;
          const requests = list.querySelectorAll(
            '.cds-aichat--message--request'
          );
          const pin = requests[requests.length - 1];
          const frames: ScrollFrame[] = [];
          const sample = () => {
            frames.push({
              offset:
                pin.getBoundingClientRect().top -
                scroller.getBoundingClientRect().top,
              scrollTop: scroller.scrollTop,
              scrollHeight: scroller.scrollHeight,
              spacerHeight: list
                .querySelector('#chat-bottom-spacer')!
                .getBoundingClientRect().height,
            });
            if (frames.length === 6) {
              resolve(frames);
            } else {
              requestAnimationFrame(sample);
            }
          };
          requestAnimationFrame(() => {
            if (transient) {
              (element as HTMLElement).style.height = '0px';
              // Force the same temporary layout a renderer can measure while replacing its contents.
              element.getBoundingClientRect();
            }
            (element as HTMLElement).style.height = `${nextHeight}px`;
            (element as HTMLElement).style.overflow = 'hidden';
            requestAnimationFrame(sample);
          });
        }),
      {
        nextHeight: height,
        transient,
        list: (await page.locator('.cds-aichat--messages').elementHandle())!,
      }
    );

test.afterEach(async ({ page }) => destroyChatSession(page));

test('keeps the pin through completed custom content resizes and respects scroll-away', async ({
  page,
}) => {
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());
  await page.goto('/');
  await openChatWindow(page);
  await sendChatMessage(page, 'text');
  await sendChatMessage(page, 'user_defined (stream)');
  await expect(page.locator('.external').last()).toBeVisible();
  const baseline = await readGeometry(page);
  expect(baseline.scrollTop).toBeGreaterThan(100);
  for (const height of [1000, 1000, 0, 300, 1, 900, 20]) {
    const frames = await resizeCustomContent(page, height, height === 1000);
    expect(
      Math.max(
        ...frames.map((frame) => Math.abs(frame.offset - baseline.offset))
      ),
      JSON.stringify(frames)
    ).toBeLessThanOrEqual(2);
  }
  await page.locator('.cds-aichat--messages__wrapper').hover();
  await page.mouse.wheel(0, -150);
  await expect
    .poll(async () => (await readGeometry(page)).scrollTop)
    .toBeLessThan(baseline.scrollTop - 50);
  const away = await readGeometry(page);
  for (const height of [1000, 0, 400]) {
    const frames = await resizeCustomContent(page, height, height === 1000);
    expect(
      frames.every((frame) => frame.scrollTop <= away.scrollTop + 2),
      JSON.stringify(frames)
    ).toBe(true);
  }
  await resizeCustomContent(page, 1400);
  await page.mouse.wheel(0, 400);
  await expect
    .poll(async () => (await readGeometry(page)).scrollTop)
    .toBeGreaterThan(baseline.scrollTop + 50);
  const belowPin = await readGeometry(page);
  for (const height of [1600, 1200]) {
    const frames = await resizeCustomContent(page, height);
    expect(
      Math.max(
        ...frames.map((frame) => Math.abs(frame.scrollTop - belowPin.scrollTop))
      ),
      JSON.stringify(frames)
    ).toBeLessThanOrEqual(2);
  }
});

test('keeps the latest request pinned when older custom content resizes', async ({
  page,
}) => {
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());
  await page.goto('/');
  await openChatWindow(page);
  await sendChatMessage(page, 'user_defined');
  await sendChatMessage(page, 'text');
  const baseline = await readGeometry(page);
  for (const height of [350, 50, 800, 0, 300]) {
    const frames = await resizeCustomContent(page, height);
    expect(
      Math.max(
        ...frames.map((frame) => Math.abs(frame.offset - baseline.offset))
      ),
      JSON.stringify(frames)
    ).toBeLessThanOrEqual(2);
  }
});

for (const response of [
  'text (stream)',
  'text (stream) with reasoning steps',
  'code (stream)',
]) {
  test(`keeps the request pinned for ${response}`, async ({ page }) => {
    await page.route(/.*ibm-common\.js$/, (route) => route.abort());
    await page.goto('/');
    await openChatWindow(page);
    const sending = sendChatMessage(page, response);
    await expect(
      page.locator('.cds-aichat--message--request').last()
    ).toContainText(response);
    await expect
      .poll(async () => (await readGeometry(page)).scrollTop)
      .toBeGreaterThan(0);
    const baseline = await readGeometry(page);
    const samples = await page
      .locator('.cds-aichat--messages')
      .evaluateHandle((list) => {
        const scroller = list.parentElement!;
        const requests = list.querySelectorAll('.cds-aichat--message--request');
        const pin = requests[requests.length - 1];
        const offsets: number[] = [];
        let active = true;
        const sample = () => {
          offsets.push(
            pin.getBoundingClientRect().top -
              scroller.getBoundingClientRect().top
          );
          if (active) {
            requestAnimationFrame(sample);
          }
        };
        sample();
        return {
          stop: () => {
            active = false;
            return offsets;
          },
        };
      });
    await sending;
    if (response === 'code (stream)') {
      await expect(page.locator('.cm-editor').first()).toBeAttached();
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
    }
    if (response.includes('reasoning')) {
      const reasoning = page.locator('cds-aichat-reasoning-steps').first();
      await expect(reasoning).toBeAttached();
      for (const open of [true, false, true, false]) {
        await reasoning.evaluate(
          (element, value) =>
            new Promise<void>((resolve) => {
              element.addEventListener(
                'reasoning-animation-end',
                () => resolve(),
                { once: true }
              );
              element.toggleAttribute('open', value);
            }),
          open
        );
      }
    }
    const offsets = await samples.evaluate((samples) => samples.stop());
    await samples.dispose();
    expect(
      Math.max(...offsets.map((offset) => Math.abs(offset - baseline.offset)))
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs((await readGeometry(page)).offset - baseline.offset)
    ).toBeLessThanOrEqual(2);
  });
}
