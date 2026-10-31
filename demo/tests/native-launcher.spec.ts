/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { test, expect } from './fixtures';
import {
  prepareDemoPage,
  destroyChatSession,
  expectNoCspViolations,
} from './utils';
import type {} from '../types/window';

test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

for (const framework of ['react', 'web-component']) {
  for (const reducedMotion of ['reduce', 'no-preference'] as const) {
    test(`${framework} launcher keyboard, live config, and ${reducedMotion}`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion });
      await prepareDemoPage(page, {
        settings: {
          framework,
          layout: 'float',
          direction: framework === 'react' ? 'ltr' : 'rtl',
          writeableElements: 'false',
        },
      });
      await page.waitForFunction(
        () =>
          window.chatInstance?.serviceManager?.store.getState()
            .initialViewChangeComplete
      );
      await page.evaluate(() =>
        window.setChatConfig({
          openChatByDefault: false,
          launcher: {
            isOn: true,
            showUnreadIndicator: true,
            desktop: {
              isOn: true,
              title: 'Launcher greeting proof',
              timeToExpand: 1000,
            },
          },
          strings: { icon_ariaUnreadMessages: 'Unread {count}' },
        })
      );
      const launcher = page.getByTestId(PageObjectId.LAUNCHER);
      await expect(launcher).toBeVisible();
      await expect(launcher).toHaveAttribute('aria-label', /Unread 1/);
      await expect(page.locator('demo-app')).toHaveCount(
        framework === 'react' ? 0 : 1
      );
      await expect(page.locator('html')).toHaveAttribute(
        'dir',
        framework === 'react' ? 'ltr' : 'rtl'
      );
      const container = page.locator('.cds-aichat-launcher');
      if (reducedMotion === 'no-preference') {
        // Suppress completion events to exercise the unchanged 600ms fallback.
        await container.evaluate((node) => {
          for (const type of ['animationend', 'animationcancel']) {
            node.addEventListener(
              type,
              (event) => event.stopPropagation(),
              true
            );
          }
        });
        await expect(container).toHaveClass(/launcher--opening/);
      }
      await expect(container).toHaveClass(/launcher--open(?:\s|$)/);
      await expect(
        page.getByText('Launcher greeting proof', { exact: true })
      ).toBeVisible();

      const dismiss = page.getByRole('button', {
        name: 'Dismiss launcher notification',
        exact: true,
      });
      await dismiss.focus();
      await page.keyboard.press('Enter');
      await expect(container).toHaveClass(/launcher--closed/);
      await expect(launcher).toHaveAttribute('aria-label', /Unread 1/);

      await page.evaluate(() =>
        window.setChatConfig({
          launcher: {
            isOn: true,
            showUnreadIndicator: false,
            desktop: {
              isOn: false,
              avatarUrlOverride:
                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24"/%3E',
            },
          },
        })
      );
      await expect(launcher).not.toHaveAttribute('aria-label', /Unread/);
      await expect(launcher.locator('img')).toHaveAttribute('alt', '');
      await launcher.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();
      const editor = page.getByTestId(PageObjectId.INPUT);
      await expect(editor).toBeFocused();
      await page.getByTestId(PageObjectId.CLOSE_CHAT).click();
      await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeHidden();
      await expect(launcher).toBeVisible();
      // After a close, focus is on the page body, as with the parent React
      // launcher (the inherited focus gap recorded for this stack). This pins
      // today's result; it doesn't set a focus policy.
      await expect(page.locator('body')).toBeFocused();
      await launcher.focus();
      await expect(launcher).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();
      // The parent launcher also leaves page focus after reopening.
      await expect(page.locator('body')).toBeFocused();
      await page.evaluate(() => window.chatInstance.requestFocus());
      await expect(editor).toBeFocused();
    });
  }
}
