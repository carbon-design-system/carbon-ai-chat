/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests custom-element-as-float: mounts the chat and exercises the host's demonstrated behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await page.getByRole('button', { name: 'Open chat', exact: true }).click();
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable prompt', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('closes and reopens through the launcher keyboard path', async ({
  page,
}) => {
  await page.getByRole('button', { name: /close|minimi/i }).click();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeHidden();
  const launcher = page.getByRole('button', { name: 'Open chat', exact: true });
  await launcher.focus();
  await launcher.press('Enter');
  await waitForChatReady(page, PageObjectId.INPUT);
});
