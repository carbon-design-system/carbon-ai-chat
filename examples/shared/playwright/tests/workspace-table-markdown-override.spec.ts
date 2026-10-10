/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests workspace table markdown override mounting and its host-visible behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable chat surface', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('opens all table rows in workspace and restores them after reopening', async ({
  page,
}) => {
  const open = page.getByRole('button', {
    name: 'Open in workspace',
    exact: true,
  });
  await expect(open).toBeVisible();
  await open.focus();
  await page.keyboard.press('Enter');
  const table = page
    .getByRole('table')
    .filter({ has: page.getByRole('cell', { name: 'ORD-1024', exact: true }) });
  await expect(table).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(25);
  await expect(
    table.getByRole('cell', { name: 'ORD-1001', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(table).toBeHidden();
  await open.click();
  await expect(table).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(25);
  await expect(
    page.getByRole('cell', { name: 'ORD-1024', exact: true })
  ).toHaveCount(1);
});
