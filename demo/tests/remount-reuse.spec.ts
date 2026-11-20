/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { test, expect } from './fixtures';
import {
  destroyChatSession,
  expectNoCspViolations,
  openChatWindow,
  prepareDemoPage,
  sendChatMessage,
  waitForChatReady,
} from './utils';
import type {} from '../types/window';

type RemountWindow = Window & { firstChatInstance?: unknown };

test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

for (const framework of ['react', 'web-component']) {
  test(`${framework} remount with reuse on keeps the transcript and the agent chat`, async ({
    page,
  }) => {
    await prepareDemoPage(page, {
      settings: { framework, layout: 'float' },
      config: { lifecycle: { reuseInstance: true } },
    });
    await openChatWindow(page);
    await waitForChatReady(page);
    await sendChatMessage(page, 'text');
    await page.evaluate(() =>
      window.chatInstance?.serviceDesk.startConversation()
    );
    await page.waitForFunction(
      () => window.chatInstance?.state.get().humanAgent.isConnected,
      undefined,
      { timeout: 30_000 }
    );
    const before = await page.evaluate(() => {
      (window as RemountWindow).firstChatInstance = window.chatInstance;
      return window.chatInstance?.state.get().messages.map(({ id }) => id);
    });
    const chatElement = page.locator('cds-aichat-container');
    await expect(chatElement).toHaveCount(1);
    const firstElement = await chatElement.elementHandle();

    // The lifecycle switcher's button sends this event.
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('demo-remount-chat'))
    );
    await page.waitForFunction(
      () =>
        Boolean(window.chatInstance) &&
        window.chatInstance !== (window as RemountWindow).firstChatInstance
    );
    await waitForChatReady(page);

    // A new element, so this was a remount, not a move.
    expect(await firstElement.evaluate((node) => node.isConnected)).toBe(false);
    await expect(chatElement).toHaveCount(1);
    const after = await page.evaluate(() => ({
      messages: window.chatInstance?.state.get().messages.map(({ id }) => id),
      isConnected: window.chatInstance?.state.get().humanAgent.isConnected,
    }));
    expect(after.messages).toEqual(before);
    expect(after.isConnected).toBe(true);
    // The user's message, not the welcome's option of the same name.
    await expect(
      page
        .locator('cds-aichat-container')
        .getByTestId('message-by-index-2')
        .getByText('text', { exact: true })
    ).toBeVisible();
  });
}
