/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests custom-element-lazy-load: mounts the chat and exercises the host's demonstrated behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await expect(page.locator('.chat-custom-element-loading')).toBeVisible();
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable prompt', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('finishes fullscreen initialization without a launcher', async ({
  page,
}) => {
  await expect(page.locator('.chat-custom-element-loading')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /close|minimi/i })).toHaveCount(
    0
  );
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeHidden();
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).not.toHaveAttribute(
    'show-frame'
  );
});
