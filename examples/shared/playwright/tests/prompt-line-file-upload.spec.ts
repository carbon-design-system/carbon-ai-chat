/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests the prompt-line file upload behavior with local fixtures. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

async function attach(page: import('@playwright/test').Page, name: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add files to upload' }).click();
  await (
    await chooser
  ).setFiles({ name, mimeType: 'text/plain', buffer: Buffer.from('report') });
}

const WELCOME =
  'Welcome! This example demonstrates file uploads in Carbon AI Chat.';

test('uploaded file sends its name, type, and byte count', async ({ page }) => {
  await attach(page, 'report.txt');
  // The remove button replaces the uploading status once the upload completes.
  await expect(
    page.getByRole('button', { name: 'Remove report.txt' })
  ).toBeVisible();
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('review report');
  const send = page.getByRole('button', { name: /send/i });
  await expect(send).toBeEnabled();
  await send.click();
  const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(
    panel.getByText('File received by the mock server:', { exact: false })
  ).toBeVisible();
  await expect(
    panel.getByRole('strong').filter({ hasText: /^report\.txt$/ })
  ).toBeVisible();
  await expect(
    panel.getByText('Type: text/plain', { exact: false })
  ).toBeVisible();
  await expect(
    panel.getByText('Size: 6 bytes', { exact: false })
  ).toBeVisible();
  await expect(panel.getByText('Server ID:', { exact: false })).toBeVisible();
  await expect(
    panel.getByLabel('Attachments').getByText('report.txt', { exact: true })
  ).toBeVisible();
});

test('rejected upload blocks send and removal restores retained text', async ({
  page,
}) => {
  await attach(page, 'fail.txt');
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('review report');
  const chip = page.getByRole('group', { name: 'fail.txt', exact: true });
  await expect(chip).toHaveAttribute('aria-invalid', 'true');
  await expect(
    chip.getByText('The server rejected this file after a virus scan.', {
      exact: true,
    })
  ).toBeVisible();
  // The notice above the input. The off-screen announcer words it differently.
  const notice = page.getByText(
    /File upload error\s*The server rejected this file after a virus scan\./
  );
  await expect(notice).toBeVisible();
  const send = page.getByRole('button', { name: /send/i });
  await expect(send).toBeDisabled();
  await page.getByRole('button', { name: 'Remove fail.txt' }).click();
  await expect(chip).toHaveCount(0);
  await expect(notice).toHaveCount(0);
  await expect(input).toHaveValue('review report');
  await expect(send).toBeEnabled();
  await send.click();
  await expect(input).toBeEmpty();
  const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
  // A text-only turn gets the welcome reply again. Wait for it before
  // asserting that no file metadata arrived.
  await expect(panel.getByText(WELCOME, { exact: true })).toHaveCount(2);
  await expect(panel.getByLabel('Attachments')).toHaveCount(0);
  await expect(
    panel.getByText('File received by the mock server:', { exact: false })
  ).toHaveCount(0);
});

// fixme: no cancel control exists while an upload is pending. The chip shows
// only an uploading spinner; "Remove report.txt" appears after the upload completes.
test.fixme('canceling a pending upload contributes nothing', async ({
  page,
}) => {
  await attach(page, 'report.txt');
  await page.getByRole('button', { name: 'Remove report.txt' }).click();
  await expect(
    page.getByRole('group', { name: 'report.txt', exact: true })
  ).toHaveCount(0);
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('review report');
  await page.getByRole('button', { name: /send/i }).click();
  const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(panel.getByText(WELCOME, { exact: true })).toHaveCount(2);
  await expect(
    panel.getByText('File received by the mock server:', { exact: false })
  ).toHaveCount(0);
});
