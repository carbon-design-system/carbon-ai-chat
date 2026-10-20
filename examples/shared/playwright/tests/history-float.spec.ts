/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — History float, swapping conversations from a custom
 * history panel.
 *
 * Runs against both the React and Web Components examples. With
 * `history.isOn`, each host renders its own conversation list into
 * `historyPanelElement`; picking a conversation calls `clearConversation()`
 * and `insertHistory()` with that conversation's name as the user request.
 *
 * Checks that the chat mounts, then opens the history panel from the header
 * menu, picks a pinned conversation, and awaits its name in place of the
 * restored request. The mock picks each reply at random, so no assertion
 * reads replies.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

const RESTORED_REQUEST = "Let's use this as the master invoice document.";
const PICKED_REQUEST =
  "Here's the onboarding doc that includes all the information to get started.";

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await page.getByTestId(PageObjectId.LAUNCHER).click();
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable prompt', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('replaces the conversation with a pinned one from the history panel', async ({
  page,
}) => {
  const messages = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(
    messages.getByText(RESTORED_REQUEST, { exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'View chats' }).click();
  const pinned = page
    .getByRole('navigation', { name: 'Chat history' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: 'Pinned' }) });
  await pinned
    .getByRole('button', { name: PICKED_REQUEST, exact: true })
    .click();
  await expect(
    messages.getByText(PICKED_REQUEST, { exact: true })
  ).toBeVisible();
  await expect(
    messages.getByText(RESTORED_REQUEST, { exact: true })
  ).toBeHidden();
});
