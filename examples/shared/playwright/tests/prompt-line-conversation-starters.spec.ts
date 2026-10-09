/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests the prompt-line conversation starters behavior with local fixtures. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('starters send directly and their toggle follows empty input', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.click();
  await page
    .getByRole('option', { name: /Generate a chart for key metrics/ })
    .click();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('Generate a chart for key metrics', { exact: true })
  ).toBeVisible();
  await expect(input).toBeEmpty();
  await input.fill('draft text');
  const hide = page.getByRole('button', { name: 'Hide conversation starters' });
  await expect(hide).toBeDisabled();
  await input.fill('');
  await expect(hide).toBeEnabled();
  await hide.click();
  await input.click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Show conversation starters' })
    .click();
  await input.click();
  await expect(
    page.getByRole('option', { name: /Generate a chart for key metrics/ })
  ).toBeVisible();
});
