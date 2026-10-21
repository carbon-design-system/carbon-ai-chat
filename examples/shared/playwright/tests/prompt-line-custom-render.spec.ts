/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Prompt line custom render.
 *
 * Runs against both the React and Web Components examples. Each host page has
 * tiles outside the chat; a tile click calls `instance.input.updateContent`
 * and `updateStructuredData` so a host-rendered tile node replaces the input,
 * and `renderUserDefinedInputNode` draws it in the sent message.
 *
 * Checks that a second tile replaces the first, that the sent message shows
 * the tile and the mock reports its id, that a plain follow-up carries no tile,
 * and that a focused tile inserts its node with Enter.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('the second tile replaces the first in the prompt and sent message', async ({
  page,
}) => {
  const grid = page.locator('.tile-grid');
  const input = page.getByTestId(PageObjectId.INPUT);
  // Tiles inside the chat are host-rendered into the light DOM, so the input's
  // own text does not include them. Scope to the host's sidebar instead.
  const chatTiles = page
    .locator('.sidebar .tile-chip')
    .filter({ visible: true });

  await grid.getByText('Summarize thread', { exact: true }).click();
  await expect(chatTiles).toHaveCount(1);
  await expect(chatTiles).toContainText('Summarize thread');

  await grid.getByText('Draft a reply', { exact: true }).click();
  await expect(chatTiles).toHaveCount(1);
  await expect(chatTiles).toContainText('Draft a reply');
  await expect(chatTiles.filter({ hasText: 'Summarize thread' })).toHaveCount(
    0
  );

  await page.getByRole('button', { name: /send/i }).click();
  await expect(
    page
      .getByText('You submitted the Draft a reply tile (id: draft-reply).', {
        exact: true,
      })
      .filter({ visible: true })
  ).toBeVisible();
  // The input is cleared, so the only tile left in the chat is the bubble's.
  await expect(chatTiles).toHaveCount(1);
  await expect(chatTiles).toContainText('Draft a reply');
  await expect(chatTiles.filter({ hasText: 'Summarize thread' })).toHaveCount(
    0
  );

  // A later plain-text message carries no tile metadata.
  await input.pressSequentially('Thanks');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(
    page
      .getByText('No tile was attached to this message.', { exact: true })
      .filter({ visible: true })
  ).toBeVisible();
  await expect(chatTiles).toHaveCount(1);
});

test('a focused tile inserts its chip with Enter', async ({ page, target }) => {
  // fixme: the Web Components tile (`cds-clickable-tile` without `href`) takes
  // focus as role=button, but Enter and Space do not fire its click handler.
  // Tracked in #2526.
  test.fixme(
    target.startsWith('web-components'),
    'Enter on a focused tile inserts nothing in the Web Components host'
  );
  // The React tile is a focusable link with no role or name, so select it
  // by the host's own class.
  const tile = page
    .locator('.tile-grid .tile-chip')
    .filter({ hasText: 'Draft a reply' });
  await tile.press('Enter');
  const chatTiles = page
    .locator('.sidebar .tile-chip')
    .filter({ visible: true });
  await expect(chatTiles).toHaveCount(1);
  await expect(chatTiles).toContainText('Draft a reply');
  const send = page.getByRole('button', { name: /send/i });
  await send.focus();
  await expect(send).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page
      .getByText('You submitted the Draft a reply tile (id: draft-reply).', {
        exact: true,
      })
      .filter({ visible: true })
  ).toBeVisible();
  await expect(chatTiles).toHaveCount(1);
});
