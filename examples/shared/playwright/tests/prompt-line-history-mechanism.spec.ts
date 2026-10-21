/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Prompt line history mechanism.
 *
 * Runs against both the React and Web Components examples. Each host adds a
 * keyboard-only Tiptap extension: ArrowUp at the start of a one-block draft
 * recalls earlier sends, and ArrowDown at the end walks back to the saved
 * draft, through `instance.input.updateContent`.
 *
 * Checks that ArrowUp without history keeps the draft, that recall stops at
 * the oldest entry and restores the draft past the newest, and that arrows in
 * a multiline draft move the caret instead of recalling history.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';
import type { Locator, Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

// Move the caret to the start or end of the whole draft, not the visual
// line. Elsewhere Ctrl+Home and Ctrl+End do that. macOS Chromium has no such
// keys in a contenteditable, so use the editor's Ctrl-A and Ctrl-E bindings:
// they move to the paragraph's edges, and a Shift+Enter draft is one paragraph.
const isMac = process.platform === 'darwin';

async function caretToStart(input: Locator) {
  await input.press(isMac ? 'Control+a' : 'Control+Home');
}

async function caretToEnd(input: Locator) {
  await input.press(isMac ? 'Control+e' : 'Control+End');
}

async function sendText(page: Page, input: Locator, text: string) {
  await input.fill(text);
  await page.getByRole('button', { name: /send/i }).click();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText(`Got it: "${text}"`, { exact: true })
  ).toBeVisible();
  await expect(input).toBeEmpty();
}

test('ArrowUp with no history leaves the draft alone', async ({ page }) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.fill('unsent draft');
  await caretToStart(input);
  await input.press('ArrowUp');
  await expect(input).toHaveText('unsent draft');
});

test('history boundaries restore the saved draft', async ({ page }) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await sendText(page, input, 'first entry');
  await sendText(page, input, 'second entry');
  await input.fill('unsent draft');
  await caretToStart(input);
  await input.press('ArrowUp');
  await expect(input).toHaveText('second entry');
  await caretToStart(input);
  await input.press('ArrowUp');
  await expect(input).toHaveText('first entry');
  // The oldest entry is the boundary.
  await caretToStart(input);
  await input.press('ArrowUp');
  await expect(input).toHaveText('first entry');
  await caretToEnd(input);
  await input.press('ArrowDown');
  await expect(input).toHaveText('second entry');
  await caretToEnd(input);
  await input.press('ArrowDown');
  await expect(input).toHaveText('unsent draft');
});

async function fillTwoLines(input: Locator) {
  await input.fill('first draft line');
  await caretToEnd(input);
  await input.press('Shift+Enter');
  await input.pressSequentially('second draft line');
}

test('multiline arrows edit the draft instead of recalling history', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await sendText(page, input, 'first entry');
  await fillTwoLines(input);
  // The caret sits at the end of the second line.
  await input.press('ArrowUp');
  await expect(input).toContainText('first draft line');
  await expect(input).toContainText('second draft line');
  await input.press('ArrowDown');
  await expect(input).toContainText('first draft line');
  await expect(input).toContainText('second draft line');
  await expect(input).not.toContainText('first entry');
});

// fixme: Shift+Enter inserts a line break inside one paragraph, so the
// multi-block guard never applies; ArrowUp at the draft's start recalls "first entry".
// Tracked in #2520.
test.fixme('ArrowUp at the start of a multiline draft keeps the draft', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await sendText(page, input, 'first entry');
  await fillTwoLines(input);
  await caretToStart(input);
  await input.press('ArrowUp');
  await expect(input).toContainText('first draft line');
  await expect(input).toContainText('second draft line');
  await expect(input).not.toContainText('first entry');
});
