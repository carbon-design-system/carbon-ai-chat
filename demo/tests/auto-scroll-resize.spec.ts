/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import type { Page } from '@playwright/test';
import { MessageResponseTypes, MessageState } from '@carbon/ai-chat/server';
import { test, expect } from './fixtures';
import {
  destroyChatSession,
  openChatWindow,
  prepareDemoPage,
  sendChatMessage,
} from './utils';
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

async function startReadingStream(page: Page, useUpsertMessage: boolean) {
  await prepareDemoPage(page, { setChatConfig: true });
  await page.waitForFunction(() => Boolean(window.setChatConfig));
  await page.evaluate(async () => {
    await window.setChatConfig!({
      messaging: {
        skipWelcome: true,
        customSendMessage: () => new Promise<void>(() => {}),
      },
    });
  });
  await openChatWindow(page);
  await page.evaluate(async () => {
    await window.chatInstance!.messaging.addMessage({
      output: {
        generic: [{ response_type: 'text', text: 'Earlier conversation' }],
      },
    });
    void window.chatInstance!.send('Read this answer');
  });
  await expect(
    page.locator('.cds-aichat--message--request').last()
  ).toContainText('Read this answer');
  const stream = await page.evaluateHandle(
    ({ useUpsertMessage, MessageResponseTypes, MessageState }) => {
      const instance = window.chatInstance!;
      const text = Array.from(
        { length: 40 },
        (_, index) =>
          `Reading marker ${index}. This paragraph stays in the same place when the answer completes.`
      ).join('\n\n');
      const item = {
        response_type: MessageResponseTypes.TEXT,
        text,
        streaming_metadata: { id: 'reading-item' },
      };
      const response = { id: 'reading-response', output: { generic: [item] } };
      let finalWrite = Promise.resolve();
      return {
        beginFinal() {
          finalWrite = this.write('final', true, true);
        },
        finishFinal: () => finalWrite,
        write: async (
          stage: 'stream' | 'item' | 'final',
          extra: boolean,
          delayed = false
        ) => {
          const generic = extra
            ? [
                item,
                ...(delayed
                  ? [
                      {
                        response_type: MessageResponseTypes.PAUSE,
                        time: 1500,
                        typing: true,
                      },
                    ]
                  : []),
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: 'Final extra item',
                },
              ]
            : [item];
          if (useUpsertMessage) {
            await instance.messaging.upsertMessage(
              response.id,
              stage === 'stream'
                ? MessageState.STREAMING
                : MessageState.COMPLETE,
              () => ({
                ...response,
                output: { generic },
              })
            );
          } else if (stage === 'final') {
            await instance.messaging.addMessageChunk({
              final_response: {
                ...response,
                output: { generic },
              },
            });
          } else {
            await instance.messaging.addMessageChunk({
              streaming_metadata: { response_id: response.id },
              partial_response: { id: response.id },
              ...(stage === 'item'
                ? { complete_item: item }
                : { partial_item: item }),
            });
          }
        },
      };
    },
    { useUpsertMessage, MessageResponseTypes, MessageState }
  );
  await stream.evaluate((stream) => stream.write('stream', false));
  await expect(
    page
      .locator('.cds-aichat--messages')
      .getByText('Reading marker 39.', { exact: false })
  ).toBeAttached();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return stream;
}

for (const distance of [30, 200]) {
  for (const extra of [false, true]) {
    test(`preserves reading position at pin + ${distance}px on completion (extra item: ${extra})`, async ({
      page,
      useUpsertMessage,
    }) => {
      const stream = await startReadingStream(page, useUpsertMessage);
      const scroller = page.locator('.cds-aichat--messages__wrapper');
      await expect
        .poll(async () => (await readGeometry(page)).scrollTop)
        .toBeGreaterThan(0);
      const pin = (await readGeometry(page)).scrollTop;
      await scroller.evaluate((element, distance) => {
        element.scrollTop += distance;
      }, distance);
      await expect
        .poll(async () => (await readGeometry(page)).scrollTop)
        .toBeGreaterThanOrEqual(pin + distance - 2);
      const marker = page
        .locator('.cds-aichat--messages')
        .getByText('Reading marker 5.', { exact: false });
      const input = page.getByRole('textbox');
      await input.focus();
      const before = await marker.boundingBox();
      const top = (await readGeometry(page)).scrollTop;
      const samples = await sampleReadingFrames(page);
      if (extra && !useUpsertMessage) {
        await stream.evaluate((stream) => stream.write('item', false));
      }
      await stream.evaluate(
        (stream, extra) => stream.write('final', extra),
        extra
      );
      await expect(
        page.getByRole('button', { name: 'Stop response' })
      ).toBeHidden();
      if (extra) {
        await expect(
          page
            .locator('.cds-aichat--messages')
            .getByText('Final extra item', { exact: true })
        ).toBeAttached();
      }
      const frames = await samples.evaluate((samples) => samples.finish());
      await samples.dispose();
      expect(
        Math.max(...frames.map((frame) => Math.abs(frame.scrollTop - top))),
        JSON.stringify(frames)
      ).toBeLessThanOrEqual(2);
      await expect
        .poll(async () => Math.abs((await readGeometry(page)).scrollTop - top))
        .toBeLessThanOrEqual(2);
      expect(
        Math.abs((await marker.boundingBox())!.y - before!.y)
      ).toBeLessThanOrEqual(2);
      expect(
        frames.slice(-5).every((frame) => frame.spacerHeight <= 2),
        JSON.stringify(frames)
      ).toBe(true);
      await expect(input).toBeFocused();
      await stream.dispose();
    });
  }
}

async function sampleReadingFrames(page: Page) {
  return page.locator('.cds-aichat--messages').evaluateHandle((list) => {
    const frames: { scrollTop: number; spacerHeight: number }[] = [];
    let active = true;
    const sample = () => {
      frames.push({
        scrollTop: list.parentElement!.scrollTop,
        spacerHeight: list
          .querySelector('#chat-bottom-spacer')!
          .getBoundingClientRect().height,
      });
      if (active) {
        requestAnimationFrame(sample);
      }
    };
    sample();
    return {
      finish: async () => {
        for (let frame = 0; frame < 12; frame++) {
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve())
          );
        }
        active = false;
        return frames;
      },
    };
  });
}

for (const input of ['wheel', 'keyboard'] as const) {
  test(`respects a newer ${input} scroll during final rendering`, async ({
    page,
    useUpsertMessage,
  }) => {
    const stream = await startReadingStream(page, useUpsertMessage);
    const scroller = page.locator('.cds-aichat--messages__wrapper');
    const handle = page
      .locator('.cds-aichat--messages')
      .getByRole('button', { name: 'Select message', exact: true })
      .first();
    await handle.focus();
    const pin = (await readGeometry(page)).scrollTop;
    await scroller.evaluate((element) => {
      element.scrollTop += 200;
    });
    await expect
      .poll(async () => (await readGeometry(page)).scrollTop)
      .toBeGreaterThan(pin + 150);
    const samples = await sampleReadingFrames(page);
    await stream.evaluate((stream) => stream.beginFinal());
    await expect(
      page
        .locator('.cds-aichat--messages')
        .getByText('Final extra item', { exact: true })
    ).not.toBeAttached();
    if (input === 'wheel') {
      await scroller.hover();
      await page.mouse.wheel(0, -150);
    } else {
      await page.keyboard.press('PageUp');
    }
    await expect
      .poll(async () => (await readGeometry(page)).scrollTop)
      .toBeLessThan(pin + 100);
    await stream.evaluate((stream) => stream.finishFinal());
    await expect(
      page
        .locator('.cds-aichat--messages')
        .getByText('Final extra item', { exact: true })
    ).toBeAttached();
    expect((await readGeometry(page)).scrollTop).toBeLessThan(pin + 100);
    const latest = (await readGeometry(page)).scrollTop;
    const frames = await samples.evaluate((samples) => samples.finish());
    expect(
      frames
        .slice(-10)
        .every((frame) => Math.abs(frame.scrollTop - latest) <= 2),
      JSON.stringify(frames)
    ).toBe(true);
    await expect(handle).toBeFocused();
    await samples.dispose();
    await stream.dispose();
  });
}
