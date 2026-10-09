/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests the prompt-line mentions and commands custom render behavior with local fixtures. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('a custom mention and a default command reach the mock summary', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('hello /');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await input.fill('/');
  await page.getByRole('option', { name: /summarize/i }).click();
  await input.pressSequentially('@Jane');
  await page.getByRole('option', { name: /Jane Smith/ }).click();
  // The custom token is slotted host DOM, so it is not reachable under the input locator.
  await expect(page.getByText('@Jane Smith', { exact: true })).toBeVisible();
  await input.pressSequentially(' review');
  await page.getByRole('button', { name: /send/i }).click();
  const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(
    panel.getByText('Mentions: Jane Smith', { exact: false })
  ).toBeVisible();
  await expect(
    panel.getByText('Commands: /summarize', { exact: false })
  ).toBeVisible();
  await expect(input).toBeEmpty();
});

// renderCustomToken receives the item without `description` (the prompt line strips it), so the tooltip shows "Jane Smith", not "Design Lead".
test.fixme('the custom mention tooltip shows the description by keyboard', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.pressSequentially('@Jane');
  await page.getByRole('option', { name: /Jane Smith/ }).click();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Jane Smith' })).toBeFocused();
  await expect(page.getByRole('tooltip')).toHaveText('Design Lead');
});
