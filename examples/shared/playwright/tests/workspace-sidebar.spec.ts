/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Workspace sidebar, host layout driven by chat events.
 *
 * Runs against both the React and Web Components examples. The host wraps the
 * chat in a `cds-aichat-sidebar` element and toggles its own `--expanded`
 * modifier from the `WORKSPACE_*` bus events, and closes or reopens the
 * sidebar from its header toggle through the view-change events.
 *
 * Checks that the chat mounts, that the header toggle closes and reopens the
 * sidebar by keyboard, and that opening the excess inventory workspace widens
 * the sidebar until the workspace closes. The preview card subtitle reads the
 * clock, so no assertion touches it.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
});

test('mounts with a usable chat surface', async ({ page }) => {
  await waitForChatReady(page, PageObjectId.INPUT);
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
  await expect(
    page.getByRole('button', { name: 'Toggle AI Chat' })
  ).toBeVisible();
});

test('closes and reopens the host sidebar by keyboard', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Toggle AI Chat' });
  const input = page.getByTestId(PageObjectId.INPUT);
  await waitForChatReady(page, PageObjectId.INPUT);
  await expect(input).toBeEditable();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(input).toBeHidden();
  // The host disables the toggle while the view change runs; wait for it to settle.
  await expect(toggle).toBeEnabled();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await waitForChatReady(page, PageObjectId.INPUT);
  await expect(input).toBeEditable();
});

test('expands the sidebar while a workspace is open', async ({ page }) => {
  // The host's own sidebar wrapper; `--expanded` is this example's modifier.
  const sidebar = page.locator('.cds-aichat-sidebar');
  const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await waitForChatReady(page, PageObjectId.INPUT);
  await panel
    .getByRole('button', { name: 'Excess Inventory', exact: true })
    .click();
  const viewDetails = panel.getByRole('button', {
    name: 'View details',
    exact: true,
  });
  await expect(viewDetails).toBeVisible();
  await expect(sidebar).not.toHaveClass(/cds-aichat-sidebar--expanded/);
  await viewDetails.click();
  // The host slots the workspace body into the panel, so it is not a DOM
  // descendant of the panel's dialog; its title is unique on the page.
  const title = page.getByRole('heading', {
    name: 'Optimizing excess inventory plan',
  });
  await expect(title).toBeVisible();
  await expect(sidebar).toHaveClass(/cds-aichat-sidebar--expanded/);
  // Only the React table takes its accessible name from the title.
  const roster = page.getByRole('table').filter({
    has: page.getByRole('cell', { name: 'Jordan Smith', exact: true }),
  });
  await expect(roster.getByRole('row')).toHaveCount(7);
  await expect(
    roster.getByRole('cell', { name: 'Jordan Smith', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(title).toBeHidden();
  await expect(sidebar).not.toHaveClass(/cds-aichat-sidebar--expanded/);
});

// Observed: the host sets `disabled` on the focused toggle during the view change, so focus drops to <body>.
// Tracked in #2519.
test.fixme('keeps focus on the toggle after closing the sidebar', async ({
  page,
}) => {
  const toggle = page.getByRole('button', { name: 'Toggle AI Chat' });
  await waitForChatReady(page, PageObjectId.INPUT);
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeHidden();
  await expect(toggle).toBeFocused();
});
