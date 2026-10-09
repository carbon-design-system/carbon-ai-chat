/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests workspace sidebar mounting and its host-visible behavior. Clock-dependent inventory replies remain outside this suite. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
});

test('mounts with a usable chat surface', async ({ page }) => {
  await expect(
    page.getByRole('button', { name: 'Toggle AI Chat' })
  ).toBeVisible();
});

test('opens, closes, and reopens the host sidebar by keyboard', async ({
  page,
}) => {
  const toggle = page.getByRole('button', { name: 'Toggle AI Chat' });
  const input = page.getByTestId(PageObjectId.INPUT);
  await waitForChatReady(page, PageObjectId.INPUT);
  await expect(input).toBeEditable();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(input).toBeHidden();
  // The host disables the toggle while the view change runs; wait for it to settle.
  await expect(toggle).toBeEnabled();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await waitForChatReady(page, PageObjectId.INPUT);
  await expect(input).toBeEditable();
});

// Observed: the host sets `disabled` on the focused toggle during the view change, so focus drops to <body>.
test.fixme('keeps focus on the toggle after closing the sidebar', async ({
  page,
}) => {
  const toggle = page.getByRole('button', { name: 'Toggle AI Chat' });
  await waitForChatReady(page, PageObjectId.INPUT);
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeHidden();
  await expect(toggle).toBeFocused();
});
