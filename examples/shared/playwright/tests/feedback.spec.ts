/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests feedback: mounts the chat and exercises the host's demonstrated behavior. */

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

test('forwards positive feedback to the host', async ({ page }) => {
  await page.getByTestId(PageObjectId.INPUT).fill('text');
  await page.getByRole('button', { name: /send/i }).click();
  const report = page.waitForEvent('dialog').then(async (dialog) => {
    const data = JSON.parse(dialog.message());
    await dialog.accept();
    return data;
  });
  // The cds-icon-button host also reports role=button, so target its labelled control.
  await page.getByLabel('I like this response', { exact: true }).click();
  const data = await report;
  expect(data.isPositive).toBe(true);
  expect(data.messageItem.message_item_options.feedback.id).toBe('1');
});
