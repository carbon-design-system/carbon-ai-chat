/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Custom element (lazy load), detailed behavior.
 *
 * Runs against both the React and Web Components examples. Each project
 * checks the same behavior through its own host application.
 *
 * Covers this example's one concern — deferring the chat bundle while
 * `<cds-aichat-shell>` covers the page until the chat finishes initializing —
 * plus the baseline: it mounts with no console errors. The second test checks
 * the embedded config takes effect once the shell is gone: no minimize button
 * and no frame.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await expect(page.locator('.chat-custom-element-loading')).toBeVisible();
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('replaces the loading shell with a usable prompt', async ({ page }) => {
  await expect(page.locator('.chat-custom-element-loading')).toHaveCount(0);
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('finishes initialization embedded, without minimize or frame', async ({
  page,
}) => {
  await expect(page.locator('.chat-custom-element-loading')).toHaveCount(0);
  // `header.hideMinimizeButton` removes the close control.
  await expect(page.getByRole('button', { name: /close|minimi/i })).toHaveCount(
    0
  );
  // `showFrame: false` leaves no 'show-frame' attribute on the shell host.
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).not.toHaveAttribute(
    'show-frame'
  );
});
