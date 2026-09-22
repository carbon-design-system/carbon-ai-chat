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
 * Also covers default hide-on-close: no `onViewChange` is supplied, so closing
 * falls back to the built-in behavior of collapsing the host element.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, test } from '@playwright/test';
import { watchForConsoleErrors } from '../../../shared/playwright/helpers';

test.describe('basic fullscreen', async () => {
  let errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];

    await page.goto('/');

    watchForConsoleErrors(page, errors);
  });

  test.afterEach(async () => {
    await expect.poll(() => errors).toEqual([]);
  });

  test('mounts fullscreen and open, with no console errors', async ({
    page,
  }) => {
    // `openChatByDefault` means the conversation is up without a launcher click.
    await expect(page.getByTestId(PageObjectId.INPUT)).toBeVisible();

    // `showFrame: false` leaves no 'show-frame' attribute on the shell host, so
    // the chat fills its container rather than sitting in a framed window.
    await expect(
      page.getByTestId(PageObjectId.CHAT_WIDGET)
    ).not.toHaveAttribute('show-frame');
  });

  test('completes one message round-trip', async ({ page }) => {
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

  test('closing collapses the host, the default with no onViewChange', async ({
    page,
  }) => {
    await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();

    // The example's own host element, sized by the className it passes to
    // ChatCustomElement. Not a chat internal.
    const host = page.locator('.chat-custom-element');
    expect((await host.boundingBox())?.width).toBeGreaterThan(0);

    await page.getByRole('button', { name: /close|minimi/i }).click();

    // With no `onViewChange`, the chat collapses the host to 0x0. Supplying any
    // callback hands sizing to the host and leaves it at full size, so asserting
    // only that the chat is hidden would pass either way — the inner contents are
    // hidden regardless, to avoid invisible tab stops.
    await expect.poll(async () => (await host.boundingBox())?.width).toBe(0);

    await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeVisible();
  });
});
