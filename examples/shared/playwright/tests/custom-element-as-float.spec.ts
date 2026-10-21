/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Custom element as float, detailed behavior.
 *
 * Runs against both the React and Web Components examples. Each project
 * checks the same behavior through its own host application.
 *
 * Covers this example's one concern — rebuilding the float view from a
 * custom element styled with the shipped float-layout CSS and a standalone
 * `Launcher` the host drives from `VIEW_CHANGE` — plus the baseline: it mounts
 * with no console errors. The keyboard test closes and reopens the window;
 * focus return to the launcher is recorded as a fixme.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await page.getByRole('button', { name: 'Open chat', exact: true }).click();
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('opens from the standalone launcher with a usable prompt', async ({
  page,
}) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('closes and reopens from the launcher by keyboard', async ({ page }) => {
  await page.getByRole('button', { name: /close|minimi/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeHidden();
  const launcher = page.getByRole('button', { name: 'Open chat', exact: true });
  // Focus does not return to the launcher on close (see the fixme below).
  await launcher.focus();
  await page.keyboard.press('Enter');
  await waitForChatReady(page, PageObjectId.INPUT);
});

// Observed: the host's standalone launcher does not take focus back on
// close; focus falls to <body>.
// Tracked in #2519.
test.fixme('returns focus to the launcher when the chat closes', async ({
  page,
}) => {
  await page.getByRole('button', { name: /close|minimi/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Open chat', exact: true })
  ).toBeFocused();
});
