/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { PageObjectId } from '@carbon/ai-chat/server';
import {
  prepareDemoPage,
  destroyChatSession,
  expectNoCspViolations,
  openChatWindow,
  waitForChatReady,
  waitForSetChatConfigApplied,
} from './utils';

// Import types for window.setChatConfig without emitting runtime code
import type {} from '../types/window';

/**
 * Where focus goes when a chat surface closes. Each case runs on both hosts
 * (React `ChatContainer` and `cds-aichat-custom-element`) and in both
 * directions.
 */

const hosts = ['react', 'web-component'] as const;
const directions = ['ltr', 'rtl'] as const;

test.beforeEach(async ({ page }) => {
  await prepareDemoPage(page, { setChatConfig: true });
});

test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

async function openChat(
  page: Page,
  framework: (typeof hosts)[number],
  direction: (typeof directions)[number]
) {
  await prepareDemoPage(page, {
    settings: {
      framework,
      layout: framework === 'react' ? 'float' : 'sidebar',
      direction,
      writeableElements: 'false',
    },
  });
  await page.waitForFunction(
    () =>
      window.chatInstance?.serviceManager?.store.getState()
        .initialViewChangeComplete
  );
  await page.evaluate(async () => {
    await window.setChatConfig!({
      launcher: { isOn: false },
      openChatByDefault: true,
    });
  });
  await waitForSetChatConfigApplied(page);
  await openChatWindow(page);
  await waitForChatReady(page, { panelTestId: PageObjectId.MAIN_PANEL });
  await expect(page.locator('html')).toHaveAttribute('dir', direction);
  await expect(page.locator('cds-aichat-custom-element')).toHaveCount(
    framework === 'react' ? 0 : 1
  );
}

/** Opens the custom panel with one button in its slotted content. */
async function openCustomPanel(
  page: Page,
  label: string,
  disableAnimation: boolean,
  closesPanel: boolean
) {
  await page.evaluate(
    ({ label, disableAnimation, closesPanel }) => {
      const panel = window.chatInstance.customPanels.getPanel();
      const button = document.createElement('button');
      button.textContent = label;
      if (closesPanel) {
        button.addEventListener('click', () => panel.close());
      }
      window.chatInstance.writeableElements.customPanelElement.replaceChildren(
        button
      );
      panel.open({ title: 'Focus proof', disableAnimation });
    },
    { label, disableAnimation, closesPanel }
  );
  const button = page.getByRole('button', { name: label, exact: true });
  await expect(button).toBeVisible();
  return button;
}

/** Blurs the deepest focused element, so the page body has focus. */
async function blurAll(page: Page) {
  await page.evaluate(() => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    (active as HTMLElement | null)?.blur();
  });
  await expect(page.locator('body')).toBeFocused();
}

for (const framework of hosts) {
  for (const direction of directions) {
    for (const disableAnimation of [false, true]) {
      const animation = disableAnimation ? 'animation off' : 'animation on';

      test(`${framework} ${direction} ${animation}: closing a custom panel from its content returns focus to the opener`, async ({
        page,
      }) => {
        await openChat(page, framework, direction);
        const opener = page.getByRole('button', {
          name: 'Close the chat window',
          exact: true,
        });
        await opener.focus();
        const close = await openCustomPanel(
          page,
          'Close from content',
          disableAnimation,
          true
        );
        await close.focus();
        await page.keyboard.press('Enter');
        await expect(close).toBeHidden();
        await expect(opener).toBeFocused();
      });

      test(`${framework} ${direction} ${animation}: closing a cover returns focus to the covered panel's control`, async ({
        page,
      }) => {
        await openChat(page, framework, direction);
        const counter = await openCustomPanel(
          page,
          'Panel counter',
          disableAnimation,
          false
        );
        await counter.focus();
        await page.evaluate(() => {
          const { store } = window.chatInstance.serviceManager;
          store.dispatch({
            type: 'HA_SET_HUMAN_AGENT_JOINED',
            responseUserProfile: { id: 'focus-agent', nickname: 'Agent' },
          });
          store.dispatch({
            type: 'HA_SET_SHOW_SCREEN_SHARE_REQUEST',
            showRequest: true,
          });
        });
        const prompt = page.locator(
          'cds-aichat-native-panels [data-panel-name="screenShare"]'
        );
        await expect(prompt).toBeVisible();
        await expect(
          prompt
            .locator('[slot="footer"]')
            .getByRole('button', { name: 'Decline', exact: true })
        ).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(prompt).toBeHidden();
        await expect(counter).toBeFocused();
      });
    }

    test(`${framework} ${direction}: closing a panel opened with nothing focused focuses the input`, async ({
      page,
    }) => {
      await openChat(page, framework, direction);
      await blurAll(page);
      const close = await openCustomPanel(
        page,
        'Close from content',
        true,
        true
      );
      await close.focus();
      await page.keyboard.press('Enter');
      await expect(close).toBeHidden();
      await expect(page.getByRole('textbox')).toBeFocused();
    });
  }
}

test('reduced motion: closing a custom panel from its content returns focus to the opener', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openChat(page, 'react', 'ltr');
  const opener = page.getByRole('button', {
    name: 'Close the chat window',
    exact: true,
  });
  await opener.focus();
  const close = await openCustomPanel(page, 'Close from content', false, true);
  await close.focus();
  await page.keyboard.press('Enter');
  await expect(close).toBeHidden();
  await expect(opener).toBeFocused();
});
