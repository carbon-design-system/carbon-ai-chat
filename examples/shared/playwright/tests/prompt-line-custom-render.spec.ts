/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests the prompt-line custom render behavior with local fixtures. */

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
