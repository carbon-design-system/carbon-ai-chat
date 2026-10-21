/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Watch state, detailed behavior.
 *
 * Runs against both the React and Web Components examples to test each
 * host's visible state updates.
 *
 * Opens the floating chat and checks the host's state mirror through homescreen,
 * conversation, and return-home transitions. Checks the initial visible mirror
 * and updates from the STATE_CHANGE subscription. Start with the launcher below.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test('mirrors chat view state changes to the host UI', async ({ page }) => {
  await openExample(page);
  const launcher = page.getByTestId(PageObjectId.LAUNCHER);
  const homescreen = page.getByTestId(PageObjectId.HOME_SCREEN_PANEL);
  const host = page.locator('.watch-state-host');

  await expect(launcher).toBeVisible();
  await expect(homescreen).toBeHidden();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeHidden();

  // The host mirror reads `Homescreen` only until startup reports the state,
  // then `Chat View` until the chat opens. Assert after opening, when it settles.
  await launcher.click();
  await expect(homescreen).toBeVisible();
  await expect(host.getByText('Homescreen', { exact: true })).toBeVisible();

  // A homescreen starter changes the state field this host observes. Merely
  // minimizing the chat changes visibility without proving the mirror updates.
  await homescreen
    .getByRole('button', { name: 'What can you help me with?', exact: true })
    .click();
  await waitForChatReady(page, PageObjectId.INPUT);
  await expect(homescreen).toBeHidden();
  await expect(host.getByText('Chat View', { exact: true })).toBeVisible();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('That is super great.', { exact: true })
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Return to the home screen', exact: true })
    .click();
  await expect(homescreen).toBeVisible();
  await expect(host.getByText('Homescreen', { exact: true })).toBeVisible();
  await expect(host.getByText('Chat View', { exact: true })).toBeHidden();
});
