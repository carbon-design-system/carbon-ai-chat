/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Float, detailed behavior.
 *
 * Runs against both the React and Web Components examples. Each project
 * checks the same behavior through its own host application.
 *
 * Covers this example's one concern — the built-in float layout, where
 * `ChatContainer` renders a launcher that opens the chat window — plus the
 * baseline: it mounts with no console errors and settles one streamed reply
 * from the mock backend. The keyboard test closes and reopens the window;
 * focus return to the launcher is recorded as a fixme.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await page.getByTestId(PageObjectId.LAUNCHER).click();
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('opens from the launcher with a usable prompt', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('closes and reopens from the launcher by keyboard', async ({ page }) => {
  await page.getByRole('button', { name: /close|minimi/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeHidden();
  const launcher = page.getByTestId(PageObjectId.LAUNCHER);
  // Focus does not return to the launcher on close (see the fixme below).
  await launcher.focus();
  await page.keyboard.press('Enter');
  await waitForChatReady(page, PageObjectId.INPUT);
});

// Observed: focus falls to <body> on close, although the built-in launcher
// is meant to take it back (`LauncherContainer` requests focus).
// Tracked in #2519.
test.fixme('returns focus to the launcher when the chat closes', async ({
  page,
}) => {
  await page.getByRole('button', { name: /close|minimi/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeHidden();
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeFocused();
});

test('settles one streamed mock reply and clears the prompt', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('stream request');
  await expect(input).toHaveValue('stream request');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('Vel congue semper, rhoncus tempus nisl nam.', {
        exact: false,
      })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /stop/i })).toHaveCount(0);
  await expect(input).toHaveValue('');
});

test('stops a streamed reply and marks it stopped', async ({ page }) => {
  await page.getByTestId(PageObjectId.INPUT).fill('stream request');
  await page.getByRole('button', { name: /send/i }).click();
  const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(
    panel.getByText('Lorem ipsum odor amet', { exact: false })
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Stop response', exact: true })
    .click();
  // The back end answers the abort with a `stream_stopped` final item.
  await expect(
    panel.getByText('Response stopped', { exact: true })
  ).toBeVisible();
  await expect(
    panel.getByText('Vel congue semper, rhoncus tempus nisl nam.', {
      exact: false,
    })
  ).toHaveCount(0);
});
