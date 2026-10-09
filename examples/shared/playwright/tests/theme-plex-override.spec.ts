/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests theme plex override mounting and its host-visible behavior. */

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
