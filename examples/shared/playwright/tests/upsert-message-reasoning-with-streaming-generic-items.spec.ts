/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests upsert message reasoning with streaming generic items mounting and its host-visible behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable chat surface', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('retains one custom summary per completed reasoning step', async ({
  page,
}) => {
  // The welcome's post-back button is the example's own trigger.
  await page
    .getByRole('button', { name: 'Send a message to see example', exact: true })
    .click();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('then appended a user_defined summary card.', { exact: false })
  ).toBeVisible({ timeout: 45000 });
  await expect(page.getByRole('button', { name: /stop/i })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Show reasoning', exact: true })
    .click();
  for (const title of [
    'Read the user request',
    'Gather supporting context',
    'Draft the response',
  ]) {
    const step = page.getByRole('button', { name: title, exact: true });
    await step.click();
    await expect(step).toHaveAttribute('aria-expanded', 'true');
  }
  // The summary cards are host-rendered, so the example's own class is the
  // handle; each step keeps exactly one card after every snapshot replaced it.
  const summaries = page
    .locator('.reasoning-summary')
    .filter({ visible: true });
  await expect(summaries).toHaveCount(3);
  for (const summary of [
    'Detected a request for an example walkthrough.',
    'Pulled 3 supporting documents from the mock retrieval service.',
    'Drafted a 2-sentence response with inline citations.',
  ]) {
    await expect(
      summaries.filter({ hasText: summary }).getByText('Step summary', {
        exact: true,
      })
    ).toBeVisible();
  }
});
