/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Human agent, hand-off to a service desk.
 *
 * Runs against both the React and Web Components examples. Each host passes a
 * `serviceDeskFactory` that returns a `MockServiceDesk`, and its mock back end
 * answers "human" with a `CONNECT_TO_HUMAN_AGENT` response.
 *
 * The Web Components host also simulates a login five seconds after mount:
 * the new user data rebuilds the factory, which resets any active agent chat,
 * and the agent then greets the user by name.
 *
 * Checks that the chat mounts, then requests an agent from that card and
 * awaits the mock desk's fixed connect sequence: the agent joins, the card
 * and takeover panel report the connection, and the agent's greeting
 * arrives. Only the mock's file-upload timing is random; these tests do not
 * upload.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  // A controllable clock lets the hand-off test skip past the simulated login.
  await page.clock.install();
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable prompt', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('hands the conversation to a human agent', async ({ page, target }) => {
  // The mock desk joins after about four seconds of fixed delays and greets
  // two seconds later.
  test.setTimeout(30_000);
  const greeting = target.startsWith('web-components-')
    ? "Hi Bob, I'm Shepard!"
    : "Hi, I'm Shepard!";
  // Fire the Web Components host's login timer now, so the factory rebuild
  // it triggers cannot end the chat mid-test. The React host has no timer.
  await page.clock.fastForward(5_000);
  const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await page.getByTestId(PageObjectId.INPUT).fill('human');
  await page.getByRole('button', { name: /send/i }).click();
  const connect = panel.getByRole('button', {
    name: 'Connect to agent',
    exact: true,
  });
  await expect(connect).toBeEnabled();
  await connect.click();
  await expect(
    panel.getByRole('button', { name: 'Connecting...', exact: true })
  ).toBeDisabled();
  await expect(
    panel.getByText('Shepard connected.', { exact: true })
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    panel.getByRole('button', { name: 'Connected', exact: true })
  ).toBeDisabled();
  await expect(
    panel.getByRole('button', { name: 'Disconnect', exact: true })
  ).toBeVisible();
  await expect(panel.getByText(greeting)).toBeVisible({
    timeout: 15_000,
  });
});
