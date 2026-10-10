/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests basic-float: mounts the chat and exercises the host's demonstrated behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await page.getByTestId(PageObjectId.LAUNCHER).click();
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
  const launcher = page.getByTestId(PageObjectId.LAUNCHER);
  await launcher.focus();
  await launcher.press('Enter');
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('settles one streamed mock reply and clears the prompt', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('stream request');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('Vel congue semper, rhoncus tempus nisl nam.', {
        exact: false,
      })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /stop/i })).toHaveCount(0);
  await expect(input).toHaveText('');
});
