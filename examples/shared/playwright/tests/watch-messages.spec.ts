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
 * Opens the floating chat, sends one message, and checks the host's mirror of
 * public messages and conversation status while the mock holds a stream open.
 * The host's Finish response button releases the stream, so the partial and
 * final snapshots are each asserted while settled.
 */

import AxeBuilder from '@axe-core/playwright';
import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await page.getByTestId(PageObjectId.LAUNCHER).click();
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('shows partial and final public messages with status changes', async ({
  page,
}) => {
  await page.getByTestId(PageObjectId.INPUT).fill('Show the public state');
  await page.getByRole('button', { name: /send/i }).click();

  await expect(page.getByTestId('selected-messages')).toContainText(
    'A partial response is visible.'
  );
  await expect(page.getByTestId('status-history')).toContainText('submitted');
  await expect(page.getByTestId('status-history')).toContainText('streaming');

  const finish = page.getByRole('button', { name: 'Finish response' });
  await finish.focus();
  await expect(finish).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('selected-messages')).toContainText(
    'The response is complete.'
  );
  await expect(page.getByTestId('conversation-status')).toHaveText('ready');
});

test('has no detected WCAG 2.1 A or AA violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .include('.watch-messages-host')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
