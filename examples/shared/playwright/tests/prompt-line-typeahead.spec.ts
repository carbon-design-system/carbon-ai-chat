/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Prompt line typeahead.
 *
 * Runs against both the React and Web Components examples. Each host sets
 * `input.autocomplete` with an `items` resolver that filters a canned list as
 * the user types, with no trigger character, and returns nothing to hide it.
 *
 * Checks that a matching suggestion sends by mouse and by arrow keys and
 * Enter, and that a query with no match closes an open list until a new
 * query matches.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('matching suggestions send directly and clear the editor', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('carbon');
  await page
    .getByRole('option', { name: /What is Carbon Design System/ })
    .click();
  await expect(input).toBeEmpty();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('What is Carbon Design System?', { exact: true })
  ).toBeVisible();
});

test('no matches hide the list and a new query recovers', async ({ page }) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('carbon');
  await expect(page.getByRole('listbox')).toBeVisible();
  await input.fill('zzzz-no-match');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await input.fill('grid');
  await expect(
    page.getByRole('option', { name: /How do I use the grid system/ })
  ).toBeVisible();
});

test('arrow keys select a suggestion and Enter sends it', async ({ page }) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('carbon');
  const second = page.getByRole('option', {
    name: /How do I contribute to Carbon/,
  });
  await expect(page.getByRole('listbox')).toBeVisible();
  // The first ArrowDown activates the first option, the second moves on.
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await expect(second).toBeVisible();
  await input.press('Enter');
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('How do I contribute to Carbon?', { exact: true })
  ).toBeVisible();
  await expect(input).toBeEmpty();
  await expect(page.getByRole('listbox')).toHaveCount(0);
});
