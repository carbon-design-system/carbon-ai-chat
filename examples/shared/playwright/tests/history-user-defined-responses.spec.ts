/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests history-user-defined-responses: mounts the chat and exercises the host's demonstrated behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

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
  // The announcer clones cards off screen, so count only rendered cards.
  const messages = page.locator('.external').filter({ visible: true });
  for (const text of [
    'Dashboard summary card.',
    'Reports overview card.',
    'Settings panel card.',
  ]) {
    await expect(messages.getByText(text)).toBeVisible();
  }
  await expect(
    messages.getByText('Is this the most recent message? Yes', { exact: true })
  ).toHaveCount(1);
  await expect(
    messages.getByText('Is this the most recent message? Nope', { exact: true })
  ).toHaveCount(2);
  await page.getByTestId(PageObjectId.INPUT).fill('user_defined');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(messages.getByText(liveCardText)).toBeVisible();
  await expect(
    messages.getByText('Is this the most recent message? Yes', { exact: true })
  ).toHaveCount(1);
  await expect(
    messages.getByText('Is this the most recent message? Nope', { exact: true })
  ).toHaveCount(3);
});
