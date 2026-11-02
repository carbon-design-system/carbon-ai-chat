/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Feedback.
 *
 * Runs against both the React and Web Components examples.
 *
 * The mock backend tags a reply with `message_item_options.feedback`, and the
 * host forwards each submitted `BusEventType.FEEDBACK` event to an alert. The
 * tests read that alert: a thumbs-up submits at once, while a thumbs-down opens
 * the details form (`show_negative_details`) and submits its text by keyboard.
 */

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

test('forwards negative feedback details submitted by keyboard', async ({
  page,
}) => {
  await page.getByTestId(PageObjectId.INPUT).fill('text');
  await page.getByRole('button', { name: /send/i }).click();
  const report = page.waitForEvent('dialog').then(async (dialog) => {
    const data = JSON.parse(dialog.message());
    await dialog.accept();
    return data;
  });
  const dislike = page.getByLabel('I dislike this response', { exact: true });
  await dislike.focus();
  await dislike.press('Enter');
  // show_negative_details opens the details form instead of submitting. Its
  // text area has no accessible name, so its placeholder tells it from the
  // prompt; the role query skips the hidden positive-details form.
  const details = page
    .getByRole('textbox')
    .and(page.getByPlaceholder('Add a comment', { exact: true }));
  await details.focus();
  await page.keyboard.type('Missing a source link');
  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  await submit.focus();
  await submit.press('Enter');
  const data = await report;
  expect(data.isPositive).toBe(false);
  expect(data.text).toBe('Missing a source link');
  expect(data.messageItem.message_item_options.feedback.id).toBe('1');
});
