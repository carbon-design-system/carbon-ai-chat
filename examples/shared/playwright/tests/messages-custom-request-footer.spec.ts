/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Custom request footer.
 *
 * Runs against both the React and Web Components examples.
 *
 * The host renders a copy button beneath each user message through the request
 * footer callback; assistant replies get no footer. The test copies a sent
 * message by keyboard, checks the clipboard, then checks the reply adds no
 * second copy button.
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

test('copies the request through its custom footer', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByTestId(PageObjectId.INPUT).fill('request alpha');
  await page.getByRole('button', { name: /send/i }).click();
  const copy = page.getByRole('button', {
    name: 'Copy your message',
    exact: true,
  });
  await copy.focus();
  await copy.press('Enter');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('request alpha');
  // Wait for the reply before ruling out a footer on it.
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText(
        'Thanks. Your message above has a copy button under it; this reply does not.',
        { exact: true }
      )
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Copy your message', exact: true })
  ).toHaveCount(1);
});
