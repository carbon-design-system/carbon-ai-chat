/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests reasoning steps controlled mounting and its host-visible behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable chat surface', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('keeps the completed controlled trace collapsed until opened', async ({
  page,
}) => {
  await page.getByTestId(PageObjectId.INPUT).fill('controlled reasoning');
  await page.getByRole('button', { name: /send/i }).click();
  const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
  const show = page.getByRole('button', {
    name: 'Show reasoning',
    exact: true,
  });
  // While the host loading label is up, the reasoning panel stays closed.
  await expect(
    panel.getByText('Read the user request...', { exact: true })
  ).toBeVisible();
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  await expect(
    panel.getByText(
      'reasoning example is set to keep all reasoning steps closed by default with a loading indicator visible instead.',
      { exact: false }
    )
  ).toBeVisible({ timeout: 45000 });
  await expect(page.getByRole('button', { name: /stop/i })).toHaveCount(0);
  await expect(
    panel.getByText('Prepare the response...', { exact: true })
  ).toHaveCount(0);
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  await show.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Read the user request', exact: true })
  ).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByRole('button', { name: 'Pick a scenario', exact: true })
  ).toHaveAttribute('aria-expanded', 'true');
});
