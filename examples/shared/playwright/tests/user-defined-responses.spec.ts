/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests user defined responses mounting and its host-visible behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable chat surface', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('retains both custom cards and marks only the newest active', async ({
  page,
}) => {
  const cards = page.locator('.external');
  await page.getByTestId(PageObjectId.INPUT).fill('user_defined');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('Is this the most recent message? Yes');
  await page.getByTestId(PageObjectId.INPUT).fill('user_defined');
  await page.getByRole('button', { name: /send/i }).click();
  // An array asserts the cards in DOM order: the older card goes inactive.
  await expect(cards).toContainText([
    'Is this the most recent message? Nope',
    'Is this the most recent message? Yes',
  ]);
});
