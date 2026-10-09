/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — History file attachments, restored without links.
 *
 * Runs against both the React and Web Components examples. Each host's
 * `customLoadHistory` restores a request whose `structured_data` holds a
 * `file` field, and the chat renders it as a chip in the user's bubble.
 *
 * Checks that the chat mounts, and that the restored attachment chip shows
 * its file name without a download link.
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

test('restores an attachment chip without a download link', async ({
  page,
}) => {
  await expect(
    page.getByText('quarterly-report.pdf', { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'quarterly-report.pdf' })
  ).toHaveCount(0);
});
