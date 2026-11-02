/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Custom element as float (lazy load), detailed
 * behavior.
 *
 * Runs against both the React and Web Components examples. Each project
 * checks the same behavior through its own host application.
 *
 * Covers this example's one concern — fetching the chat bundle on the first
 * launcher click, with `<cds-aichat-shell>` covering the float area until the
 * chat finishes initializing — plus the baseline: it mounts with no console
 * errors. The keyboard test checks reopening skips the loading shell; focus
 * return to the launcher is recorded as a fixme.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

// The example's own loading shell, rendered with the float-open class.
const loadingShell = 'cds-aichat-shell.cds-aichat-float--open';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await page.getByRole('button', { name: 'Open chat', exact: true }).click();
  await expect(page.locator(loadingShell)).toBeVisible();
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('removes the loading shell and mounts a usable prompt', async ({
  page,
}) => {
  await expect(page.locator(loadingShell)).toHaveCount(0);
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('closes and reopens from the launcher by keyboard without the shell', async ({
  page,
}) => {
  await page.getByRole('button', { name: /close|minimi/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeHidden();
  const launcher = page.getByRole('button', { name: 'Open chat', exact: true });
  // Focus does not return to the launcher on close (see the fixme below).
  await launcher.focus();
  await page.keyboard.press('Enter');
  await waitForChatReady(page, PageObjectId.INPUT);
  // The bundle is already loaded, so the shell must not come back.
  await expect(page.locator(loadingShell)).toHaveCount(0);
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
