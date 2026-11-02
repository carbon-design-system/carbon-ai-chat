/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Prompt line custom typeahead list, Web Components host.
 *
 * The Web Components host replaces the built-in dropdown through
 * `autocomplete.renderCustomList` with its own list element. Picking a
 * suggestion fills the editor; the user still sends it.
 *
 * Checks pointer selection before an explicit send, that a new query restarts
 * the highlight, and that a query with no match hides the list. The keyboard
 * cases are fixme: the list never receives the editor's arrow and Enter keys.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('picking a suggestion fills the editor before explicit send', async ({
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
  await expect(page.getByRole('option')).toHaveCount(2);
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await second.hover();
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(first).toHaveAttribute('aria-selected', 'false');
  await first.click();
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
  ).toHaveCount(1);
});

test('queries reset the selection and an empty result hides the list', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('carbon');
  const last = page.getByRole('option', {
    name: /How do I contribute to Carbon/,
  });
  await last.hover();
  await expect(last).toHaveAttribute('aria-selected', 'true');
  await input.fill('grid');
  await expect(
    page.getByRole('option', { name: /How do I use the grid system/ })
  ).toHaveAttribute('aria-selected', 'true');
  await input.fill('zzzz-no-match');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await input.fill('grid');
  await expect(page.getByRole('listbox')).toBeVisible();
});

// The prompt line re-dispatches ArrowUp/ArrowDown/Enter as non-composed keydown on the list inside the chat's shadow root, so the list's document listener never sees them: aria-selected stays on the first option and Enter does nothing.
// Tracked in #2524.
test.fixme('keyboard selection fills the editor before explicit send', async ({
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
  await page.getByRole('button', { name: /send/i }).click();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('Received your message: "What is Carbon Design System?"', {
        exact: true,
      })
  ).toHaveCount(1);
});

// Same root cause: arrow keys never reach the list, and Escape leaves the listbox open.
// Tracked in #2524.
test.fixme('keyboard navigation clamps and Escape preserves editing', async ({
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
  await input.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(input).toBeFocused();
  await expect(input).toHaveText('carbon');
});
