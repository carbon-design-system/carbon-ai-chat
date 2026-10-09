/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests the prompt-line typeahead behavior with local fixtures. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('matching suggestions send directly and clear the editor', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('carbon');
  await page
    .getByRole('option', { name: /What is Carbon Design System/ })
    .click();
  await expect(input).toBeEmpty();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('What is Carbon Design System?', { exact: true })
  ).toBeVisible();
});

test('no matches hide the list and a new query recovers', async ({ page }) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('zzzz-no-match');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await input.fill('grid');
  await expect(
    page.getByRole('option', { name: /How do I use the grid system/ })
  ).toBeVisible();
});
