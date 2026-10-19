/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Watch state with Redux.
 *
 * Runs against the React example only.
 *
 * The host bridges `BusEventType.STATE_CHANGE` into a Redux store, and a status
 * panel outside the chat reads the homescreen flag through a selector. The test
 * moves between the homescreen and the conversation twice and checks the
 * panel follows each transition.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await page.getByTestId(PageObjectId.LAUNCHER).click();
});

test('mounts with a usable chat surface', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.HOME_SCREEN_PANEL)).toBeVisible();
});

test('mirrors homescreen transitions in both directions', async ({ page }) => {
  const home = page.getByTestId(PageObjectId.HOME_SCREEN_PANEL);
  // The status line is host DOM, so the example's own wrapper scopes it.
  const host = page.locator('.watch-state-host');
  const hostStatus = host.getByText('Homescreen', { exact: true });
  await expect(hostStatus).toBeVisible();
  for (let turn = 0; turn < 2; turn += 1) {
    await home
      .getByRole('button', { name: 'What can you help me with?' })
      .focus();
    await page.keyboard.press('Enter');
    await waitForChatReady(page, PageObjectId.INPUT);
    await expect(host.getByText('Chat View', { exact: true })).toBeVisible();
    await expect(hostStatus).toBeHidden();
    await page
      .getByRole('button', { name: 'Return to the home screen' })
      .click();
    await expect(home).toBeVisible();
    await expect(hostStatus).toBeVisible();
  }
});
