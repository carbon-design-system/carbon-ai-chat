/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Prompt line conversation starters.
 *
 * Runs against both the React and Web Components examples. Each host sets
 * `input.starters` so a starter list opens on an empty, focused editor, and
 * an action button flips `starters.isOn`. Picking a starter sends it at once.
 *
 * Checks that a starter sends by mouse and by arrow keys and Enter, and that
 * the toggle is disabled while the editor has text and, when off, keeps the
 * list closed until it is turned back on.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('starters send directly and their toggle follows empty input', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.click();
  await page
    .getByRole('option', { name: /Generate a chart for key metrics/ })
    .click();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('Generate a chart for key metrics', { exact: true })
  ).toBeVisible();
  await expect(input).toBeEmpty();
  await input.fill('draft text');
  const hide = page.getByRole('button', { name: 'Hide conversation starters' });
  await expect(hide).toBeDisabled();
  // Clear with keystrokes: a programmatic fill can skip the editor's update.
  await input.press('ControlOrMeta+a');
  await input.press('Backspace');
  await expect(input).toBeEmpty();
  await expect(hide).toBeEnabled();
  await input.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await hide.click();
  const show = page.getByRole('button', { name: 'Show conversation starters' });
  await expect(show).toBeVisible();
  await input.click();
  await expect(input).toBeFocused();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await show.click();
  await input.click();
  await expect(
    page.getByRole('option', { name: /Generate a chart for key metrics/ })
  ).toBeVisible();
});

test('arrow keys select a starter and Enter sends it', async ({ page }) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  // The first ArrowDown activates the first starter, the second moves on.
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('Convert my question into an SQL query', { exact: true })
  ).toBeVisible();
  await expect(input).toBeEmpty();
});
