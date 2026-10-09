/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests messages-custom-footer: mounts the chat and exercises the host's demonstrated behavior. */

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

test('copies the reply through its custom footer', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByTestId(PageObjectId.INPUT).fill('request alpha');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText(
        'Here is a reply with a custom footer. Use the copy button to copy this text.',
        { exact: true }
      )
  ).toBeVisible();
  // The welcome and the reply each get an identically named Copy button, so
  // scope to the reply's footer slot (the backend names it copy_footer_2).
  const copy = page
    .locator('[slot="copy_footer_2"]')
    .getByRole('button', { name: 'Copy', exact: true });
  await copy.focus();
  await copy.press('Enter');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(
      'Here is a reply with a custom footer. Use the copy button to copy this text.'
    );
});
