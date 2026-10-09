/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — History user-defined responses, active card
 * tracking.
 *
 * Runs against both the React and Web Components examples. Each host restores
 * three `user_defined` cards through `insertHistory`, and every card reads
 * `activeResponseId` from chat state to say whether it is the most recent
 * message.
 *
 * Checks that the chat mounts, that only the last restored card reads "Yes",
 * and that sending a live `user_defined` message moves "Yes" to the new card
 * while the previously active card switches to "Nope".
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

const ACTIVE = 'Is this the most recent message? Yes';
const INACTIVE = 'Is this the most recent message? Nope';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable prompt', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('moves the active highlight from restored cards to a live card', async ({
  page,
  target,
}) => {
  // Each flavor's mock back end sends its own live card text.
  const liveCardText = target.startsWith('react-')
    ? 'A live user_defined card sent via customSendMessage.'
    : 'This is text from the server placed into a user_defined response.';
  // The announcer clones cards off screen, so match only rendered cards.
  const cards = page.locator('.external').filter({ visible: true });
  const card = (text: string) => cards.filter({ hasText: text });
  // An array asserts the cards in DOM order.
  await expect(cards).toContainText([
    'Dashboard summary card.',
    'Reports overview card.',
    'Settings panel card.',
  ]);
  await expect(card('Dashboard summary card.')).toContainText(INACTIVE);
  await expect(card('Reports overview card.')).toContainText(INACTIVE);
  await expect(card('Settings panel card.')).toContainText(ACTIVE);
  await page.getByTestId(PageObjectId.INPUT).fill('user_defined');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(card(liveCardText)).toContainText(ACTIVE);
  await expect(card('Settings panel card.')).toContainText(INACTIVE);
  await expect(cards).toHaveCount(4);
});
