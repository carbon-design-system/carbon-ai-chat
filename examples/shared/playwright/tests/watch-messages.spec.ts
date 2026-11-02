/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Watch messages, detailed behavior.
 *
 * Runs against the React and React with Redux examples. Each project checks
 * the same visible contract through its own host: one selects public state
 * into React state, the other mirrors it into a Redux store.
 *
 * Follows the welcome button through submitted, streaming, and ready, then
 * checks restart recovery, keyboard focus, and the streaming host panel.
 */

import AxeBuilder from '@axe-core/playwright';
import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await page.getByTestId(PageObjectId.LAUNCHER).click();
  await waitForChatReady(page, PageObjectId.INPUT);
  await expect(
    page.getByRole('button', { name: 'Start response' })
  ).toBeVisible();
  await expect(page.getByTestId('conversation-status')).toHaveText('ready');
});

test('shows the welcome again for ordinary input', async ({ page }) => {
  const chat = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(
    chat.getByRole('button', { name: 'Start response' })
  ).toBeVisible();
  await page.getByTestId(PageObjectId.INPUT).fill('Hello');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(
    chat.getByRole('button', { name: 'Start response' })
  ).toHaveCount(2);
  await expect(page.getByTestId('conversation-status')).toHaveText('ready');
});

test('shows the exact trigger sequence and keeps keyboard focus after finishing', async ({
  page,
}) => {
  await expect(page.getByTestId('conversation-status')).toHaveText('ready');
  const history = page.getByTestId('status-history').getByRole('listitem');
  const start = (await history.count()) - 1;
  await page.getByRole('button', { name: 'Start response' }).click();
  await expect(page.getByTestId('conversation-status')).toHaveText('streaming');
  await expect(page.getByTestId('selected-messages')).toContainText(
    'A partial response is visible.'
  );
  const finish = page.getByRole('button', { name: 'Finish response' });
  // Shift+Tab reaches the preceding host control from the first chat control.
  for (
    let index = 0;
    index < 30 &&
    !(await finish.evaluate((element) => element === document.activeElement));
    index += 1
  ) {
    await page.keyboard.press('Shift+Tab');
  }
  await expect(finish).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('selected-messages')).toContainText(
    'The response is complete.'
  );
  await expect(page.getByTestId('conversation-status')).toHaveText('ready');
  await expect(finish).toBeFocused();
  await expect(history).toHaveCount(start + 4);
  await expect(
    page.getByTestId('status-history').locator(`li:nth-child(n+${start + 1})`)
  ).toHaveText(['ready', 'submitted', 'streaming', 'ready']);
});

test('finishes a new response after restarting an unfinished response', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Start response' }).click();
  await expect(page.getByTestId('conversation-status')).toHaveText('streaming');
  await page.getByRole('button', { name: /restart/i }).click();
  await expect(page.getByTestId('conversation-status')).toHaveText('ready');
  await page.getByRole('button', { name: 'Start response' }).click();
  await expect(page.getByTestId('conversation-status')).toHaveText('streaming');
  await page.getByRole('button', { name: 'Finish response' }).click();
  await expect(page.getByTestId('conversation-status')).toHaveText('ready');
  await expect(page.getByTestId('selected-messages')).toContainText(
    'The response is complete.'
  );
});

test('has no detected WCAG 2.1 A or AA violations while streaming', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Start response' }).click();
  await expect(page.getByTestId('conversation-status')).toHaveText('streaming');
  const results = await new AxeBuilder({ page })
    .include('.watch-messages-host')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
