/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — History fullscreen, swapping conversations from a
 * custom history panel beside the chat.
 *
 * Runs against both the React and Web Components examples. With
 * `history.isOn`, each full-screen host renders its own conversation list into
 * `historyPanelElement`; picking a conversation calls `clearConversation()`
 * and `insertHistory()` with that conversation's name as the user request.
 *
 * Checks that the chat mounts, then picks a pinned conversation from the open
 * history panel and awaits its name in place of the restored request. The
 * mock picks each reply at random, so no assertion reads replies. The swap is
 * a known failure in the Web Components flavor; see the fixme below.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

const RESTORED_REQUEST = "Let's use this as the master invoice document.";
const PICKED_REQUEST =
  "Here's the onboarding doc that includes all the information to get started.";

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable prompt', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('replaces the conversation with a pinned one from the history panel', async ({
  page,
  target,
}) => {
  // Observed: the Web Components host lays its history list out one viewport height down, so the panel column looks empty and its items are off screen.
  // Tracked in #2525.
  test.fixme(
    target.startsWith('web-components-'),
    'The history list renders below the viewport.'
  );
  const messages = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(
    messages.getByText(RESTORED_REQUEST, { exact: true })
  ).toBeVisible();
  const pinned = page
    .getByRole('navigation', { name: 'Chat history' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: 'Pinned' }) });
  const picked = pinned.getByRole('button', {
    name: PICKED_REQUEST,
    exact: true,
  });
  await expect(picked).toBeInViewport();
  await picked.click();
  await expect(
    messages.getByText(PICKED_REQUEST, { exact: true })
  ).toBeVisible();
  await expect(
    messages.getByText(RESTORED_REQUEST, { exact: true })
  ).toBeHidden();
});
