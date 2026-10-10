/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests the prompt-line history mechanism behavior with local fixtures. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';
import type { Locator, Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

// macOS Chromium has no Home/End caret moves, so use the editor's Ctrl-A and
// Ctrl-E line bindings there.
const isMac = process.platform === 'darwin';

async function caretToStart(input: Locator) {
  await input.press(isMac ? 'Control+a' : 'Home');
}

async function caretToEnd(input: Locator) {
  await input.press(isMac ? 'Control+e' : 'End');
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
