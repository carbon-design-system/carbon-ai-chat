/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests upsert message reasoning steps controlled mounting and its host-visible behavior. */

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
  // The welcome's post-back button is the example's own trigger; waiting for
  // it also keeps the send from racing the welcome handshake.
  await page
    .getByRole('button', { name: 'Send a message to see example', exact: true })
    .click();
  // The host-driven loading label tracks the last step, then clears.
  const loadingLabel = page
    .getByTestId(PageObjectId.MAIN_PANEL)
    .getByText('Prepare the response...', { exact: true });
  await expect(loadingLabel).toBeVisible({ timeout: 30000 });
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText(
        'reasoning example is set to keep all reasoning steps closed by default with a loading indicator visible instead.',
        { exact: false }
      )
  ).toBeVisible({ timeout: 45000 });
  await expect(page.getByRole('button', { name: /stop/i })).toHaveCount(0);
  await expect(loadingLabel).toHaveCount(0);
  const show = page.getByRole('button', {
    name: 'Show reasoning',
    exact: true,
  });
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
