/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests the prompt-line typeahead custom behavior with local fixtures. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('keyboard selection fills the editor before explicit send', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  const first = page.getByRole('option', {
    name: /What is Carbon Design System/,
  });
  const second = page.getByRole('option', {
    name: /How do I contribute to Carbon/,
  });
  await input.fill('carbon');
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await input.press('ArrowDown');
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await input.press('ArrowUp');
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await input.press('Enter');
  await expect(input).toHaveText('What is Carbon Design System?');
  const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(
    panel.getByText('What is Carbon Design System?', { exact: true })
  ).toHaveCount(0);
  await page.getByRole('button', { name: /send/i }).click();
  await expect(input).toBeEmpty();
  await expect(
    panel.getByText('Received your message: "What is Carbon Design System?"', {
      exact: true,
    })
  ).toBeVisible();
});

test('navigation clamps, queries reset, and Escape preserves editing', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('carbon');
  const first = page.getByRole('option', {
    name: /What is Carbon Design System/,
  });
  const last = page.getByRole('option', {
    name: /How do I contribute to Carbon/,
  });
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await input.press('ArrowUp');
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await expect(last).toHaveAttribute('aria-selected', 'true');
  await input.fill('grid');
  await expect(
    page.getByRole('option', { name: /How do I use the grid system/ })
  ).toHaveAttribute('aria-selected', 'true');
  await input.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(input).toBeFocused();
  await expect(input).toHaveText('grid');
  await input.fill('zzzz-no-match');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await input.fill('grid');
  await expect(page.getByRole('listbox')).toBeVisible();
});
