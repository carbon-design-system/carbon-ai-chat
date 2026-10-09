/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Custom element (Fullscreen), detailed behavior.
 *
 * Runs against both the React and Web Components examples. Each project
 * checks the same behavior through its own host application.
 *
 * Covers this example's one concern — a fullscreen surface open from first
 * paint — plus the baseline every example carries: it mounts with no console
 * errors and completes one message round-trip.
 *
 * Also covers default hide-on-close: no `onViewChange` is supplied, so closing
 * falls back to the built-in behavior of collapsing the host element.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import type { Page } from '@playwright/test';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.describe('basic fullscreen', () => {
  test.beforeEach(async ({ page }) => {
    await openExample(page);
  });

  test('mounts fullscreen and open, with no console errors', async ({
    page,
  }) => {
    // `openChatByDefault` means the conversation is up without a launcher click.
    await waitForChatReady(page, PageObjectId.INPUT);

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

    // The example's own host element, sized by its chat-custom-element class.
    // Both flavors use this class; it is not a chat internal.
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

  // The mock back end below is shared, nearly verbatim, by the other layout
  // examples. Its replies are proven here once rather than in each copy.
  async function send(page: Page, text: string) {
    await waitForChatReady(page, PageObjectId.INPUT);
    await page.getByTestId(PageObjectId.INPUT).fill(text);
    await page.getByRole('button', { name: /send/i }).click();
  }

  test('streams a reply to its end', async ({ page }) => {
    await send(page, 'stream text');
    const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
    // The stream emits one word per tick, so its last line takes a while.
    await expect(
      panel.getByText('print(generate_lorem_ipsum(2))', { exact: false })
    ).toBeVisible({ timeout: 45 * 1000 });
    await expect(
      page.getByRole('button', { name: 'Stop response', exact: true })
    ).toBeHidden();
  });

  test('stops a streaming reply', async ({ page }) => {
    await send(page, 'stream text');
    const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
    await expect(
      panel.getByText('Lorem ipsum odor amet', { exact: false })
    ).toBeVisible();
    const stop = page.getByRole('button', {
      name: 'Stop response',
      exact: true,
    });
    await stop.click();
    await expect(stop).toBeDisabled();

    // Settle a second reply. By then an unstopped stream would have run on.
    // The `text` reply contains the closing code line once; the stopped
    // stream must add no second copy.
    await page.getByTestId(PageObjectId.INPUT).fill('text');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(
      panel.getByText('Lorem ipsum odor amet, consectetuer adipiscing elit.', {
        exact: false,
      })
    ).toHaveCount(2);
    await expect(
      panel.getByText('print(generate_lorem_ipsum(2))', { exact: false })
    ).toHaveCount(1);
  });

  test('answers an unknown request with the list of demo replies', async ({
    page,
  }) => {
    await send(page, 'something else');
    // The welcome and the fallback reply both list the demo commands.
    await expect(
      page
        .getByTestId(PageObjectId.MAIN_PANEL)
        .getByText('You can try the following responses:', { exact: false })
    ).toHaveCount(2);
  });
});
