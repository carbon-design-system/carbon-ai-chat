/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests reasoning with streaming generic items mounting and its host-visible behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await page.getByTestId(PageObjectId.LAUNCHER).click();
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable chat surface', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('retains one custom summary per completed reasoning step', async ({
  page,
}) => {
  await page.getByTestId(PageObjectId.INPUT).fill('reasoning demo');
  await page.getByRole('button', { name: /send/i }).click();
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
  await expect(page.locator('.reasoning-summary')).toHaveCount(3);
  await expect(
    page.getByText('Step summary', { exact: true }).filter({ visible: true })
  ).toHaveCount(3);
});
