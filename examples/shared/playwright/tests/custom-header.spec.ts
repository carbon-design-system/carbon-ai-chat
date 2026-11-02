/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Custom header, detailed behavior.
 *
 * Runs against both the React and Web Components examples. Each project
 * checks the same behavior through its own host application.
 *
 * Covers this example's one concern — replacing the built-in chat header
 * with host content through `WriteableElementName.CUSTOM_HEADER` — plus the
 * baseline: it mounts with no console errors and completes one message
 * round-trip. The tests check the default header is gone and the custom one
 * stays single after a reply.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('replaces the default header with the custom one', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
  await expect(page.getByText('Custom Header', { exact: true })).toBeVisible();
  // With the same config minus CUSTOM_HEADER, the chat renders its default
  // header with a "Close the chat window" button.
  await expect(page.getByTestId(PageObjectId.CHAT_HEADER)).toHaveCount(0);
  await expect(page.getByTestId(PageObjectId.CLOSE_CHAT)).toHaveCount(0);
});

test('retains exactly one custom header after a request', async ({ page }) => {
  await expect(page.getByText('Custom Header', { exact: true })).toHaveCount(1);
  await page.getByTestId(PageObjectId.INPUT).fill('header request');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('This is a response from the mock backend.', { exact: false })
  ).toBeVisible();
  await expect(page.getByText('Custom Header', { exact: true })).toHaveCount(1);
});
