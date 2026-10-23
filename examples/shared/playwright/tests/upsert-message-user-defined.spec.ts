/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Progressive user_defined updates through upsertMessage.
 *
 * Runs against both the React and Web Components examples.
 *
 * Each run updates one host-rendered steps card in place through
 * `upsertMessage`, and a toast's "View message" action calls `scrollToMessage`
 * when a run finishes. The test runs two cards at once and checks each updates
 * in place and that the toast scrolls to the finished card. A fixme records
 * that the welcome button cannot start a second run as its copy says.
 * Stop leaves the old card unchanged without a completion toast; a fresh card finishes.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable chat surface', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('stops a card without late completion and finishes a fresh card', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.clock.install();
  const cards = page.locator('.steps-card-container').filter({ visible: true });
  const stop = page.getByRole('button', { name: 'Stop response', exact: true });
  const view = page.getByRole('button', { name: 'View message', exact: true });
  await page
    .getByRole('button', { name: 'Start steps demo', exact: true })
    .click();
  await expect(cards).toHaveCount(1);
  await expect(
    cards.getByText('Status: running', { exact: true })
  ).toBeVisible();
  await stop.click();
  await expect(stop).toHaveCount(0);
  const stoppedCard = cards.first();
  const stopped = await stoppedCard.ariaSnapshot();
  await page.clock.runFor(30_000);
  expect(await stoppedCard.ariaSnapshot()).toBe(stopped);
  await expect(
    cards.getByText('Completed successfully', { exact: true })
  ).toHaveCount(0);
  await expect(view).toHaveCount(0);
  await page.getByTestId(PageObjectId.INPUT).fill('Show me the upsert demo');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(cards).toHaveCount(2);
  await expect(stop).toBeVisible();
  await page.clock.runFor(30_000);
  await expect(cards.filter({ hasText: 'Status: completed' })).toHaveCount(1, {
    timeout: 30_000,
  });
  await expect(
    cards.last().getByText('Completed successfully', { exact: true })
  ).toHaveCount(5);
  await expect(stop).toHaveCount(0);
  await expect(view).toHaveCount(1);
  await view.click();
  await expect(view).toHaveCount(0);
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
  expect(await stoppedCard.ariaSnapshot()).toBe(stopped);
});

// The welcome copy says to click `Start steps demo` again while a run is in
// progress, but the chat disables it once the run's card becomes the latest
// message, so the button cannot start a second run.
// Tracked in #2523.
test.fixme('starts a second run from the same welcome button', async ({
  page,
}) => {
  const start = page.getByRole('button', {
    name: 'Start steps demo',
    exact: true,
  });
  await start.click();
  await expect(
    page.getByText('Status: running', { exact: true })
  ).toBeVisible();
  await expect(start).toBeEnabled();
});

test('runs cards concurrently and scrolls to the finished one', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  // The steps card is host-rendered, so the example's own class is the handle;
  // the visible filter skips the off-screen announcer copy.
  const cards = page.locator('.steps-card-container').filter({ visible: true });
  await page
    .getByRole('button', { name: 'Start steps demo', exact: true })
    .click();
  await expect(cards).toHaveCount(1);
  // Let the first run get well ahead so the two runs finish apart.
  await expect(
    cards.getByText('Completed successfully', { exact: true })
  ).toHaveCount(3, { timeout: 20000 });

  // The input stays usable mid-run; sending asks for a fresh welcome whose
  // button, as the latest message, can start the second run.
  await input.fill('another run');
  await input.press('Enter');
  await page
    .getByRole('button', {
      name: 'Start steps demo',
      exact: true,
      disabled: false,
    })
    .click();
  await expect(cards).toHaveCount(2);

  // The first run finishes while the second is still running, which tells
  // the two cards apart.
  const finished = cards.filter({ hasText: 'Status: completed' });
  await expect(finished).toHaveCount(1, { timeout: 30000 });
  await expect(cards.filter({ hasText: 'Status: running' })).toHaveCount(1);
  // The second card pushes the finished one mostly out of view.
  await expect(finished).not.toBeInViewport({ ratio: 0.5 });
  const view = page.getByRole('button', { name: 'View message', exact: true });
  await view.click();
  await expect(finished).toBeInViewport({ ratio: 0.9 });
  await expect(view).toHaveCount(0);

  // Each run updates its own card in place rather than appending a new one.
  await expect(cards.filter({ hasText: 'Status: completed' })).toHaveCount(2, {
    timeout: 30000,
  });
  await expect(cards).toHaveCount(2);
  await view.click();
  await expect(view).toHaveCount(0);
});
