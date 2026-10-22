/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Custom element (Sidebar), detailed behavior.
 *
 * Runs against both the React and Web Components examples. Each project
 * checks the same behavior through its own host application.
 *
 * Covers this example's one concern — the chat docked as a side panel with the
 * shipped `cds-aichat-sidebar` layout classes, opened and closed from a host
 * header toggle that calls `ChatInstance.changeView` — plus the baseline: it
 * mounts open with no console errors. The toggle test drives the keyboard
 * path and checks the panel returns at the default 360px width. Focus loss
 * on the toggle is recorded as a fixme.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts open with a usable prompt', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('toggles the sidebar by keyboard and restores the prompt', async ({
  page,
}) => {
  const toggle = page.getByRole('button', { name: 'Toggle AI Chat' });
  const input = page.getByTestId(PageObjectId.INPUT);
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(input).toBeHidden();
  await expect(toggle).toBeEnabled();
  // Focus drops from the toggle while it is disabled (see the fixme below), so
  // move it back before the next key press.
  await toggle.focus();
  await page.keyboard.press('Enter');
  await waitForChatReady(page, PageObjectId.INPUT);
  await expect(input).toBeEditable();
  // `.cds-aichat-sidebar` is the shipped layout class the host puts on its own
  // wrapper, not a chat internal. With no `--cds-aichat-sidebar-width`
  // override the panel keeps the 360px default.
  await expect
    .poll(
      async () =>
        (await page.locator('.cds-aichat-sidebar').boundingBox())?.width
    )
    .toBe(360);
});

// Observed: the host disables the focused toggle while `changeView` resolves,
// and focus falls to <body>, so a second Enter does nothing.
// Tracked in #2519.
test.fixme('keeps focus on the toggle after closing the sidebar', async ({
  page,
}) => {
  const toggle = page.getByRole('button', { name: 'Toggle AI Chat' });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeHidden();
  await expect(toggle).toBeEnabled();
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Enter');
  await waitForChatReady(page, PageObjectId.INPUT);
});
