/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import {
  BusEventType,
  MessageSendSource,
  PageObjectId,
} from '@carbon/ai-chat/server';
import { test, expect } from './fixtures';
import {
  destroyChatSession,
  expectNoCspViolations,
  openChatWindow,
  waitForChatReady,
  prepareDemoPage,
  waitForSetChatConfigApplied,
  setupAccessibilityChecker,
  checkAccessibility,
} from './utils';

// Import types for window.setChatConfig without emitting runtime code
import type {} from '../types/window';

// Setup accessibility checker before all tests
test.beforeAll(() => {
  setupAccessibilityChecker();
});

// Setup common to all tests
test.beforeEach(async ({ page }) => {
  await prepareDemoPage(page, { setChatConfig: true });
});

// Clear session between all tests to ensure clean state, and assert that the
// page rendered without tripping the test-time strict CSP. Run the CSP check
// before destroyChatSession so the assertion fires against the test's own
// interactions, not the cleanup tear-down.
test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

test('homescreen from disabled to enabled', async ({ page }) => {
  // Phase 1: Enable homescreen
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        homescreen: {
          isOn: true,
          greeting: 'Homescreen Now Enabled!',
        },
        header: { title: 'With Homescreen' },
        openChatByDefault: true,
      });
    }
  });

  await waitForSetChatConfigApplied(page);
  await openChatWindow(page);
  await waitForChatReady(page, {
    panelTestId: PageObjectId.HOME_SCREEN_PANEL,
  });

  // Key verification: homescreen should be visible with the greeting
  await expect(page.getByTestId(PageObjectId.HOME_SCREEN_PANEL)).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText('Homescreen Now Enabled!')).toBeVisible();

  // Run accessibility check on the chat widget
  const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);
  await checkAccessibility(chatWidget, 'Homescreen - Enabled State');
});

test('homescreen greeting updates', async ({ page }) => {
  // Phase 1: Set initial homescreen with greeting
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        homescreen: {
          isOn: true,
          greeting: 'Initial Greeting',
        },
        header: { title: 'Test Chat' },
        openChatByDefault: true,
      });
    }
  });

  await waitForSetChatConfigApplied(page);

  // Phase 2: Update homescreen greeting
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        homescreen: {
          isOn: true,
          greeting: 'Updated Greeting Message',
        },
        header: { title: 'Test Chat' },
        openChatByDefault: true,
      });
    }
  });

  await waitForSetChatConfigApplied(page);
  await openChatWindow(page);
  await waitForChatReady(page, {
    panelTestId: PageObjectId.HOME_SCREEN_PANEL,
  });

  // Key verification: homescreen should be visible with updated greeting
  await expect(page.getByTestId(PageObjectId.HOME_SCREEN_PANEL)).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText('Updated Greeting Message')).toBeVisible();

  // Run accessibility check on the chat widget
  const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);
  await checkAccessibility(chatWidget, 'Homescreen - Updated Greeting');
});

for (const framework of ['react', 'web-component']) {
  for (const keyboard of [false, true]) {
    test(`${framework} home starters and back navigation with ${keyboard ? 'keyboard' : 'mouse'}`, async ({
      page,
    }) => {
      await prepareDemoPage(page, {
        settings: {
          framework,
          layout: framework === 'react' ? 'float' : 'sidebar',
          direction: framework === 'react' ? 'ltr' : 'rtl',
          writeableElements: 'false',
        },
      });
      if (framework === 'web-component') {
        await page.setViewportSize({ width: 672, height: 800 });
      }
      await page.waitForFunction(
        () =>
          window.chatInstance?.serviceManager?.store.getState()
            .initialViewChangeComplete
      );
      await page.evaluate(async () => {
        await window.setChatConfig({
          homescreen: {
            isOn: true,
            greeting: 'Choose a topic',
            starters: {
              isOn: true,
              buttons: [{ label: 'Start conversation' }],
            },
          },
          openChatByDefault: true,
        });
      });
      await openChatWindow(page);
      await waitForChatReady(page, {
        panelTestId: PageObjectId.HOME_SCREEN_PANEL,
      });
      await expect(page.locator('html')).toHaveAttribute(
        'dir',
        framework === 'react' ? 'ltr' : 'rtl'
      );
      await expect(page.locator('cds-aichat-custom-element')).toHaveCount(
        framework === 'react' ? 0 : 1
      );

      const sends: { text: string; source: MessageSendSource }[] = [];
      await page.exposeFunction('recordHomeSend', (value) => sends.push(value));
      await page.evaluate((type) => {
        const probe = window as typeof window & {
          recordHomeSend: (value: { text: string; source: string }) => void;
        };
        window.chatInstance.on({
          type,
          handler: (event) =>
            probe.recordHomeSend({
              text: event.data.input.text,
              source: event.source,
            }),
        });
      }, BusEventType.SEND);

      const starter = page.getByRole('button', {
        name: 'Start conversation',
        exact: true,
      });
      if (keyboard) {
        await starter.focus();
        await page.keyboard.press('Enter');
      } else {
        await starter.click();
      }
      await expect
        .poll(() => sends)
        .toEqual([
          {
            text: 'Start conversation',
            source: MessageSendSource.HOME_SCREEN_STARTER,
          },
        ]);
      await expect(
        page.getByTestId(PageObjectId.HOME_SCREEN_PANEL)
      ).toBeHidden();
      await expect(page.getByTestId(PageObjectId.INPUT)).toBeFocused();

      const home = page.getByRole('button', {
        name: 'Return to the home screen',
        exact: true,
      });
      await home.click();
      await expect(
        page.getByTestId(PageObjectId.HOME_SCREEN_PANEL)
      ).toBeVisible();
      const back = page.getByRole('button', {
        name: 'Return to conversation',
        exact: true,
      });
      if (keyboard) {
        await back.focus();
        await page.keyboard.press('Space');
      } else {
        await back.click();
      }
      await expect(
        page.getByTestId(PageObjectId.HOME_SCREEN_PANEL)
      ).toBeHidden();
      // Removing the focused return button currently leaves focus on the page.
      await expect(page.locator('body')).toBeFocused();
      await page.evaluate(() => window.chatInstance.requestFocus());
      await expect(page.getByTestId(PageObjectId.INPUT)).toBeFocused();
      expect(sends).toHaveLength(1);
    });
  }
}
