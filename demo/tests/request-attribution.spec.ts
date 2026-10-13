/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { BusEventType, PageObjectId } from '@carbon/ai-chat/server';
import type { BusEventPreReceive, BusEventSend } from '@carbon/ai-chat';
import { test, expect, type Page } from '@playwright/test';

import {
  destroyChatSession,
  openChatWindow,
  prepareDemoPage,
  waitForChatReady,
} from './utils';

declare global {
  interface Window {
    demoRequestAttribution: {
      requests: Array<string | undefined>;
      responses: Array<string | undefined>;
    };
  }
}

const FEEDBACK_TEXT = "We'd love to hear your thoughts on Carbon!";

const messagesWith = (page: Page, text: string) =>
  page.getByTestId(/^message-by-index-/).filter({ hasText: text });

async function sendThroughInput(page: Page, text: string) {
  await page.getByTestId(PageObjectId.INPUT).click();
  await page.keyboard.insertText(text);
  await page.getByTestId(PageObjectId.INPUT_SEND).click();
}

test.beforeEach(async ({ page }) => {
  await prepareDemoPage(page);
  await waitForChatReady(page);
  await openChatWindow(page);
  await expect(
    messagesWith(page, 'Welcome to this example of a custom back-end.')
  ).toHaveCount(1);
  await page.evaluate((events) => {
    window.demoRequestAttribution = { requests: [], responses: [] };
    window.chatInstance?.on({
      type: events.SEND,
      handler: (event) => {
        window.demoRequestAttribution.requests.push(
          (event as BusEventSend).data.id
        );
      },
    });
    window.chatInstance?.on({
      type: events.PRE_RECEIVE,
      handler: (event) => {
        window.demoRequestAttribution.responses.push(
          (event as BusEventPreReceive).data.request_id
        );
      },
    });
  }, BusEventType);
});

test.afterEach(async ({ page }) => {
  await destroyChatSession(page);
});

test('both delayed responses carry the original request ID', async ({
  page,
}) => {
  await sendThroughInput(page, 'text (consecutive responses)');
  await expect(messagesWith(page, FEEDBACK_TEXT)).toHaveCount(2, {
    timeout: 10000,
  });

  const { requests, responses } = await page.evaluate(
    () => window.demoRequestAttribution
  );
  expect(requests).toHaveLength(1);
  expect(requests[0]).toBeTruthy();
  expect(responses).toEqual([requests[0], requests[0]]);
});

test('restart discards both delayed responses and accepts a new request', async ({
  page,
}) => {
  await page
    .locator('cds-accordion-item[title="Chat instance methods"]')
    .getByRole('button', { name: 'Chat instance methods' })
    .click();
  const restart = page
    .locator('demo-chat-instance-switcher')
    .getByRole('button', { name: 'Restart conversation', exact: true });
  await expect(restart).toBeVisible();

  await sendThroughInput(page, 'text (consecutive responses)');
  const originalRequestID = await page.evaluate(
    () => window.demoRequestAttribution.requests[0]
  );
  expect(originalRequestID).toBeTruthy();
  await restart.click();
  await expect(page.locator('.cds-aichat--sent')).toHaveCount(0);

  // Wait past both mock timers so an absent reply proves that restart discarded it.
  await page.waitForTimeout(5000);
  await expect(messagesWith(page, FEEDBACK_TEXT)).toHaveCount(0);
  expect(
    await page.evaluate(() => window.demoRequestAttribution.responses)
  ).not.toContain(originalRequestID);

  const responseCount = await page.evaluate(
    () => window.demoRequestAttribution.responses.length
  );
  await sendThroughInput(page, 'text');
  await expect
    .poll(
      () => page.evaluate(() => window.demoRequestAttribution.responses.length),
      { timeout: 10000 }
    )
    .toBe(responseCount + 1);
  const { requests, responses } = await page.evaluate(
    () => window.demoRequestAttribution
  );
  expect(responses.at(-1)).toBe(requests.at(-1));
  expect(responses).not.toContain(originalRequestID);
  await expect(page.getByTestId(/^message-by-index-/)).toHaveCount(4);
});

test('a completed stream carries its original request ID', async ({ page }) => {
  await sendThroughInput(page, 'text (stream early resolve)');
  await expect
    .poll(
      () => page.evaluate(() => window.demoRequestAttribution.responses.length),
      { timeout: 10000 }
    )
    .toBe(1);
  const { requests, responses } = await page.evaluate(
    () => window.demoRequestAttribution
  );
  expect(requests).toHaveLength(1);
  expect(requests[0]).toBeTruthy();
  expect(responses).toEqual(requests);
  await expect(
    messagesWith(
      page,
      'The button should only disappear after this final chunk arrives.'
    )
  ).toHaveCount(1);
});
