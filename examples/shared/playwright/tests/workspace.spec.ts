/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Workspace, opened from a preview card.
 *
 * Runs against both the React and Web Components examples. The mock back end
 * answers "Excess Inventory" with a `PREVIEW_CARD` that carries a
 * `workspace_id` and `additional_data`; the host renders the matching body
 * into `workspacePanelElement`.
 *
 * Checks that the chat mounts, then opens the workspace from the card and
 * checks its fixed title, the forwarded `additional_data`, and the agent
 * roster table, then closes it. The card and workspace subtitles read the
 * clock, so no assertion touches them.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable chat surface', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('opens the excess inventory workspace from its preview card', async ({
  page,
}) => {
  const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await panel
    .getByRole('button', { name: 'Excess Inventory', exact: true })
    .click();
  await expect(
    panel.getByRole('heading', { name: 'Optimizing excess inventory' })
  ).toBeVisible();
  await panel
    .getByRole('button', { name: 'View details', exact: true })
    .click();
  // The host slots the workspace body into the panel, so it is not a DOM
  // descendant of the panel's dialog; its title is unique on the page.
  const title = page.getByRole('heading', {
    name: 'Optimizing excess inventory plan',
  });
  await expect(title).toBeVisible();
  await expect(
    page.getByText('"data": "some additional data for the workspace"')
  ).toBeVisible();
  // Only the React table takes its accessible name from the title.
  const roster = page.getByRole('table').filter({
    has: page.getByRole('cell', { name: 'Jordan Smith', exact: true }),
  });
  // One header row and six agents.
  await expect(roster.getByRole('row')).toHaveCount(7);
  await expect(
    roster.getByRole('cell', { name: 'Jordan Smith', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(title).toBeHidden();
  await expect(
    panel.getByRole('button', { name: 'View details', exact: true })
  ).toBeVisible();
});
