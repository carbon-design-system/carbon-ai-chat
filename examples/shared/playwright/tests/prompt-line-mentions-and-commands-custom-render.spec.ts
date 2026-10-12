/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Mentions and commands with a custom mention chip.
 *
 * Runs against both the React and Web Components examples. Each host replaces
 * the mention chip with a tooltip-wrapped Carbon tag through
 * `mention.renderCustomToken`, and draws the same chip in the sent message
 * with `renderUserDefinedInputNode`. Commands keep the default chip.
 *
 * Checks that a mid-line slash leaves the list closed, that a custom mention
 * and a default command both reach the mock's structured-data summary, and
 * that the custom chip moves from the editor into the sent message.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import type { Locator } from '@playwright/test';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

/**
 * Test IDs of the chat elements that hold a slotted host node. The custom chip
 * is host DOM, so locator chaining under a chat element cannot reach it.
 */
function slottedInto(locator: Locator) {
  return locator.evaluate((element) => {
    const ids: string[] = [];
    let node: Node | null = element;
    while (node) {
      if (node instanceof Element) {
        const id = node.getAttribute('data-testid');
        if (id) {
          ids.push(id);
        }
      }
      node =
        (node instanceof Element && node.assignedSlot) ||
        node.parentNode ||
        (node instanceof ShadowRoot ? node.host : null);
    }
    return ids;
  });
}

test('a custom mention and a default command reach the mock summary', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  const list = page.getByRole('listbox');

  // Await the typed text first so an editor that missed the keys cannot pass.
  await input.pressSequentially('hello /');
  await expect(input).toHaveText('hello /');
  await expect(list).toBeHidden();

  await input.fill('');
  await input.pressSequentially('/');
  await expect(list).toBeVisible();
  await page.getByRole('option', { name: /summarize/i }).click();
  await input.pressSequentially('@Jane');
  await page.getByRole('option', { name: /Jane Smith/ }).click();
  await expect(list).toBeHidden();

  const chip = page
    .getByText('@Jane Smith', { exact: true })
    .filter({ visible: true });
  await expect(chip).toHaveCount(1);
  expect(await slottedInto(chip)).toContain(PageObjectId.INPUT);

  await input.pressSequentially(' review');
  await page.getByRole('button', { name: /send/i }).click();
  const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(
    panel.getByText('Mentions: Jane Smith', { exact: false })
  ).toBeVisible();
  await expect(
    panel.getByText('Commands: /summarize', { exact: false })
  ).toBeVisible();
  await expect(input).toBeEmpty();

  // The editor's chip is gone; the one left is the sent message's copy.
  await expect(chip).toHaveCount(1);
  await expect.poll(() => slottedInto(chip)).not.toContain(PageObjectId.INPUT);
  expect(await slottedInto(chip)).toContain(PageObjectId.MAIN_PANEL);
});

// The custom chip is not keyboard focusable: Tab from the editor skips it and
// lands on a toolbar button, so its "Design Lead" tooltip shows only on hover.
// Tracked in #2518.
test.fixme('the custom mention tooltip opens by keyboard', async ({ page }) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await input.pressSequentially('@Jane');
  // Pick by keyboard so the pointer cannot open the tooltip by hovering.
  await expect(page.getByRole('option', { name: /Jane Smith/ })).toBeVisible();
  await input.press('Enter');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(
    page.getByText('Design Lead', { exact: true }).filter({ visible: true })
  ).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(
    page.getByText('Design Lead', { exact: true }).filter({ visible: true })
  ).toBeVisible();
});
