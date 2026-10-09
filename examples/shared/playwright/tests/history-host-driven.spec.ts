/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — History host-driven, conversations swapped by the
 * host page.
 *
 * Runs against both the React and Web Components examples. Each host captures
 * the `ChatInstance` in `onBeforeRender` and, from its own "Insert a different
 * conversation" button, calls `clearConversation()` and `insertHistory()`.
 *
 * Checks only the mount: the chat input and the host's insert button. The
 * swap stays untested because `Math.random()` picks the message count and
 * every request and reply text, so no inserted content is fixed.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable prompt', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Insert a different conversation' })
  ).toBeEnabled();
});
