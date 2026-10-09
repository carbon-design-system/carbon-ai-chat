/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests upsert message reasoning steps mounting and its host-visible behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable chat surface', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

for (const mode of ['Reasoning steps', 'Reasoning content']) {
  test(`retains the completed ${mode.toLowerCase()} trace`, async ({
    page,
  }) => {
    await page
      .getByRole('combobox', { name: 'Select an option', exact: true })
      .click();
    await page.getByRole('option', { name: mode, exact: true }).click();
    const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
    await expect(
      panel.getByText(
        mode === 'Reasoning steps'
          ? 'This is the default behavior.'
          : 'Use this when you want a long-form rationale instead of expandable steps.',
        { exact: false }
      )
    ).toBeVisible({ timeout: 45000 });
    await expect(page.getByRole('button', { name: /stop/i })).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Show reasoning', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Hide reasoning', exact: true })
    ).toHaveAttribute('aria-expanded', 'true');
    if (mode === 'Reasoning steps') {
      await expect(
        page.getByRole('button', { name: 'Read the user request', exact: true })
      ).toBeVisible();
      await expect(
        panel.getByText('Prepare the response', { exact: true })
      ).toBeVisible();
    } else {
      await expect(
        panel.getByText('Scanning the prompt', { exact: false })
      ).toBeVisible();
    }
  });
}
