/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import {
  BusEventType,
  MessageResponseTypes,
  MessageState,
} from '@carbon/ai-chat/server';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { destroyChatSession, openChatWindow, prepareDemoPage } from './utils';
import type {} from '../types/window';

async function startStream(
  page: Page,
  useUpsertMessage: boolean,
  immediate = false
) {
  await prepareDemoPage(page, { setChatConfig: true });
  await page.waitForFunction(() => Boolean(window.setChatConfig));
  await page.evaluate(async (showStopButtonImmediately) => {
    await window.setChatConfig!({
      messaging: {
        showStopButtonImmediately,
        skipWelcome: true,
        customSendMessage: () => new Promise<void>(() => {}),
      },
    });
  }, immediate);
  await openChatWindow(page);
  const stream = await page.evaluateHandle(
    ({
      useUpsertMessage,
      MessageState,
      MessageResponseTypes,
      BusEventType,
    }) => {
      const instance = window.chatInstance!;
      let stopEvents = 0;
      let releaseStop = () => {};
      const stopped = new Promise<void>((resolve) => {
        releaseStop = resolve;
      });
      instance.on({
        type: BusEventType.STOP_STREAMING,
        handler: () => {
          stopEvents++;
          return stopped;
        },
      });
      return {
        stopEvents: () => stopEvents,
        releaseStop: () => releaseStop(),
        write: async (
          cancellable: boolean | undefined,
          terminal?: 'complete' | 'error'
        ) => {
          const item = {
            response_type: MessageResponseTypes.TEXT,
            text: 'Streaming answer',
            streaming_metadata: {
              id: 'stop-item',
              ...(cancellable === undefined ? {} : { cancellable }),
            },
          };
          const message = {
            id: 'stop-response',
            output: { generic: [item] },
          };
          if (useUpsertMessage) {
            const states = {
              complete: MessageState.COMPLETE,
              error: MessageState.ERROR,
            };
            const state = terminal ? states[terminal] : MessageState.STREAMING;
            await instance.messaging.upsertMessage(
              message.id,
              state,
              () => message
            );
          } else if (terminal === 'error') {
            await instance.messaging.addMessageChunk({
              final_response: message,
            });
          } else if (terminal === 'complete') {
            await instance.messaging.addMessageChunk({
              partial_response: { id: message.id },
              complete_item: item,
            });
          } else {
            await instance.messaging.addMessageChunk({
              partial_response: { id: message.id },
              partial_item: item,
            });
          }
        },
      };
    },
    { useUpsertMessage, MessageState, MessageResponseTypes, BusEventType }
  );
  if (immediate) {
    await page.evaluate(() => {
      void window.chatInstance!.send('Start streaming');
    });
    await expect(
      page.getByRole('button', { name: 'Stop response' })
    ).toBeVisible();
  }
  return stream;
}

test.afterEach(async ({ page }) => destroyChatSession(page));

test('keeps stop visible but inactive until cancellable becomes true again', async ({
  page,
  useUpsertMessage,
}) => {
  const stream = await startStream(page, useUpsertMessage);
  const stop = page.getByRole('button', { name: 'Stop response' });
  await stream.evaluate((stream) => stream.write(true));
  await expect(stop).toBeEnabled();
  await stop.focus();

  await stream.evaluate((stream) => stream.write(false));
  await expect(stop).toBeVisible();
  await expect(stop).toBeDisabled();
  await expect(stop).toMatchAriaSnapshot('- button "Stop response" [disabled]');
  await stop.click({ force: true });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  expect(await stream.evaluate((stream) => stream.stopEvents())).toBe(0);

  await stream.evaluate((stream) => stream.write(undefined));
  await expect(stop).toBeVisible();
  await expect(stop).toBeDisabled();
  await stream.evaluate((stream) => stream.write(true));
  await expect(stop).toBeEnabled();
  await stop.focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => stream.evaluate((stream) => stream.stopEvents()))
    .toBe(1);
  await expect(stop).toBeDisabled();

  await stream.evaluate((stream) => stream.write(true));
  await expect(stop).toBeDisabled();
  await stop.click({ force: true });
  expect(await stream.evaluate((stream) => stream.stopEvents())).toBe(1);
  await stream.evaluate((stream) => stream.releaseStop());
  await expect(stop).toBeHidden();
  await stream.dispose();
});

for (const immediate of [false, true]) {
  test(`an initial false ${immediate ? 'disables the immediate stop button' : 'leaves stop hidden'}`, async ({
    page,
    useUpsertMessage,
  }) => {
    const stream = await startStream(page, useUpsertMessage, immediate);
    const stop = page.getByRole('button', { name: 'Stop response' });
    await stream.evaluate((stream) => stream.write(false));
    if (immediate) {
      await expect(stop).toBeVisible();
      await expect(stop).toBeDisabled();
    } else {
      await expect(stop).toBeHidden();
    }
    await stream.evaluate((stream) => stream.write(true));
    await expect(stop).toBeEnabled();
    await stop.click();
    await expect
      .poll(() => stream.evaluate((stream) => stream.stopEvents()))
      .toBe(1);
    await stream.evaluate((stream) => stream.releaseStop());
    await expect(stop).toBeHidden();
    await stream.dispose();
  });
}

for (const terminal of ['complete', 'error'] as const) {
  test(`hides disabled stop at ${terminal === 'complete' ? 'COMPLETE or complete_item' : 'ERROR or final_response'}`, async ({
    page,
    useUpsertMessage,
  }) => {
    const stream = await startStream(page, useUpsertMessage);
    const stop = page.getByRole('button', { name: 'Stop response' });
    await stream.evaluate((stream) => stream.write(true));
    await expect(stop).toBeEnabled();
    await stream.evaluate((stream) => stream.write(false));
    await expect(stop).toBeDisabled();
    await stream.evaluate(
      (stream, terminal) => stream.write(false, terminal),
      terminal
    );
    await expect(stop).toBeHidden();
    await stream.dispose();
  });
}
