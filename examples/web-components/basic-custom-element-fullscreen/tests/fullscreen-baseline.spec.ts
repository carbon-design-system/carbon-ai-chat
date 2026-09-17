/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Custom element (Fullscreen), Web Components.
 *
 * Covers this example's one concern — a fullscreen surface open from first
 * paint — plus the baseline every example carries: it mounts with no console
 * errors and completes one message round-trip.
 *
 * Selects only through `PageObjectId`, so the assertions hold wherever the
 * chat's markup changes.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, test, type Page } from '@playwright/test';

/** Collects console errors so a test can assert the page stayed clean. */
function watchForConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

test('mounts fullscreen and open, with no console errors', async ({ page }) => {
  const errors = watchForConsoleErrors(page);

  await page.goto('/');

  // `openChatByDefault` means the conversation is up without a launcher click.
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeVisible();

  // `showFrame: false` leaves no 'show-frame' attribute on the shell host, so
  // the chat fills its container rather than sitting in a framed window.
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).not.toHaveAttribute(
    'show-frame'
  );

  // Poll rather than read once: a deferred chunk or a late import can raise
  // after the assertions above settle.
  await expect.poll(() => errors).toEqual([]);
});

test('completes one message round-trip', async ({ page }) => {
  await page.goto('/');

  // The input is a contenteditable with no dependable accessible name, so use
  // the library's maintained test-id contract rather than a role.
  const input = page.getByTestId(PageObjectId.INPUT);
  await expect(input).toBeVisible();
  await input.fill('text');

  // The send button does expose a stable accessible name, so prefer the
  // user-facing locator — it doubles as an accessibility check.
  await page.getByRole('button', { name: /send/i }).click();

  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('Lorem ipsum odor amet, consectetuer adipiscing elit.', {
        exact: false,
      })
  ).toBeVisible();
});
