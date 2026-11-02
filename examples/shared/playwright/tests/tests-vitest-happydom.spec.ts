/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Vitest (happy-dom) fixture, browser smoke check.
 *
 * Runs against the React example only; there is no Web Components version.
 *
 * The example's concern is its Vitest suite, which keeps its own `test`
 * script. This spec only checks that the same app serves as a browser page:
 * it mounts behind its launcher with no console errors, and a sent message
 * gets the mock backend's echo.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await page.getByTestId(PageObjectId.LAUNCHER).click();
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable chat surface', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('serves the Vitest fixture as a browser app and sends its local echo', async ({
  page,
}) => {
  await page.getByTestId(PageObjectId.INPUT).fill('browser fixture');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('Echo from the mock backend: "browser fixture".', {
        exact: true,
      })
  ).toBeVisible();
});
