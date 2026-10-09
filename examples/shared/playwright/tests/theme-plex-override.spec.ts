/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests theme plex override mounting and its host-visible behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import type { Locator } from '@playwright/test';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await page.getByTestId(PageObjectId.LAUNCHER).click();
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable chat surface', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('loads the bundled replacement font for chat input', async ({ page }) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  await expect
    .poll(() =>
      input.evaluate(async (element) => {
        await document.fonts.load('16px "Permanent Marker"');
        return (
          document.fonts.check('16px "Permanent Marker"') &&
          getComputedStyle(element).fontFamily.includes('Permanent Marker')
        );
      })
    )
    .toBe(true);
});

// Resolves once the element's computed family is the replacement font.
function usesReplacementFont(locator: Locator) {
  return expect
    .poll(() =>
      locator.evaluate((element) =>
        getComputedStyle(element).fontFamily.includes('Permanent Marker')
      )
    )
    .toBe(true);
}

test('renders reply text and code in the replacement font', async ({
  page,
}) => {
  await page.getByTestId(PageObjectId.INPUT).fill('text');
  await page.getByRole('button', { name: /send/i }).click();
  const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
  // Body text uses the `sans` family; the inline code span uses `mono`.
  await usesReplacementFont(
    panel.getByText('Lorem ipsum odor amet, consectetuer adipiscing elit.', {
      exact: false,
    })
  );
  await usesReplacementFont(
    panel.getByText('Inline Code Venenatis', { exact: true })
  );
});

test('renders the custom response in the replacement font', async ({
  page,
}) => {
  await page.getByTestId(PageObjectId.INPUT).fill('user_defined');
  await page.getByRole('button', { name: /send/i }).click();
  // The custom response is host-rendered and slotted, so select it by the
  // example's own class; the announcer's off-screen copy is excluded.
  const card = page.locator('.external').filter({ visible: true });
  await expect(card).toContainText(
    'This is text from the server placed into a user_defined response.'
  );
  await usesReplacementFont(card);
});
