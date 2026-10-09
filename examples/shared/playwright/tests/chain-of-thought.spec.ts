/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests chain-of-thought: mounts the chat and exercises the host's demonstrated behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable prompt', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('opens the finalized tool trace by keyboard', async ({ page }) => {
  await page.getByTestId(PageObjectId.INPUT).fill('trace request');
  await page.getByRole('button', { name: /send/i }).click();
  const trace = page.getByRole('button', {
    name: 'How did I get this answer?',
  });
  await expect(trace).toBeVisible();
  await trace.focus();
  await trace.press('Enter');
  const steps = ['Vector search', 'Summarize', 'Generate response'];
  for (const [index, title] of steps.entries()) {
    await expect(
      page.getByRole('button', { name: `${index + 1}: ${title} Succeeded` })
    ).toBeVisible();
  }
});
