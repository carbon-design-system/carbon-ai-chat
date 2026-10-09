/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests basic-custom-element-sidebar: mounts the chat and exercises the host's demonstrated behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable prompt', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('toggles the sidebar by keyboard and restores the prompt', async ({
  page,
}) => {
  const toggle = page.getByRole('button', { name: 'Toggle AI Chat' });
  await toggle.focus();
  await toggle.press('Enter');
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeHidden();
  await expect(toggle).toBeEnabled();
  await toggle.press('Enter');
  await waitForChatReady(page, PageObjectId.INPUT);
});
