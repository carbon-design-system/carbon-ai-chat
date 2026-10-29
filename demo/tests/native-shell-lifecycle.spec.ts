/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  destroyChatSession,
  expectNoCspViolations,
  prepareDemoPage,
  sendChatMessage,
  waitForChatReady,
} from './utils';
import type {} from '../types/window';

type ShellProbeWindow = Window & {
  nativeShellLifecycleProbe: {
    widget: Element;
    messages: Element;
    input: Element;
    liveRegions: Element[];
  };
};

test.use({
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  viewport: { width: 390, height: 844 },
  screen: { width: 390, height: 844 },
});

async function expectWithinViewport(page: Page) {
  await expect
    .poll(async () =>
      page.locator('cds-aichat-shell').evaluate((shell) => {
        const bounds = shell.getBoundingClientRect();
        const viewport = window.visualViewport;
        const top = viewport.offsetTop;
        return (
          bounds.height > 200 &&
          bounds.width > 300 &&
          bounds.top >= top - 2 &&
          bounds.bottom <= top + viewport.height + 2 &&
          bounds.left >= -2 &&
          bounds.right <= viewport.width + 2
        );
      })
    )
    .toBe(true);
  await expect
    .poll(async () =>
      page.getByTestId(PageObjectId.INPUT).evaluate((input) => {
        const bounds = input.getBoundingClientRect();
        const viewport = window.visualViewport;
        return (
          bounds.height > 0 &&
          bounds.top >= viewport.offsetTop - 2 &&
          bounds.bottom <= viewport.offsetTop + viewport.height + 2
        );
      })
    )
    .toBe(true);
}

test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

for (const framework of ['react', 'web-component']) {
  test(`${framework} mobile shell resizes, retains its DOM through a move, and reopens with usable focus`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepareDemoPage(page, {
      settings: { framework, layout: 'float', writeableElements: 'false' },
    });
    await page.waitForFunction(
      () =>
        window.chatInstance?.serviceManager?.store.getState()
          .initialViewChangeComplete
    );
    await page.evaluate(() =>
      window.setChatConfig({
        homescreen: { isOn: false },
        shouldTakeFocusIfOpensAutomatically: true,
        disableCustomElementMobileEnhancements: false,
      })
    );
    await page.evaluate(() =>
      window.chatInstance.changeView({ mainWindow: true, launcher: false })
    );
    await waitForChatReady(page);
    const native = page.locator('cds-aichat-chat-shell');
    const widget = page.locator('cds-aichat-shell');
    const input = page.getByTestId(PageObjectId.INPUT);
    await expect(page.locator('.cds-aichat--container--render')).toHaveClass(
      /cds-aichat--is-phone(?:\s|$)/
    );
    await expect(widget).toHaveClass(/cds-aichat-float--mobile/);
    await expectWithinViewport(page);
    const initialHeight = (await widget.boundingBox()).height;
    await sendChatMessage(page, 'text');
    await expect(page.locator('.cds-aichat--message').first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 480 });
    await expectWithinViewport(page);
    await expect
      .poll(async () => (await widget.boundingBox()).height)
      .toBeLessThan(initialHeight - 200);
    await input.blur();
    await page.evaluate(() => window.chatInstance.requestFocus());
    await expect(input).not.toBeFocused();
    await input.click();
    await expect(input).toBeFocused();
    await page.keyboard.type('Mobile draft');
    await expect
      .poll(() =>
        page.evaluate(() => window.chatInstance.getState().input.rawValue)
      )
      .toBe('Mobile draft');

    const liveRegions = await page.locator('[aria-live]').count();
    await native.evaluate((element) => {
      const root = element.getRootNode() as ShadowRoot;
      (window as ShellProbeWindow).nativeShellLifecycleProbe = {
        widget: element.querySelector('cds-aichat-shell'),
        messages: element.querySelector('.cds-aichat--messages'),
        input: element.querySelector('cds-aichat-chat-input'),
        liveRegions: Array.from(root.querySelectorAll('[aria-live]')),
      };
      element.parentNode.appendChild(element);
    });
    await expect
      .poll(() =>
        native.evaluate((element) => {
          const probe = (window as ShellProbeWindow).nativeShellLifecycleProbe;
          const root = element.getRootNode() as ShadowRoot;
          const regions = Array.from(root.querySelectorAll('[aria-live]'));
          return (
            element.querySelector('cds-aichat-shell') === probe.widget &&
            element.querySelector('.cds-aichat--messages') === probe.messages &&
            element.querySelector('cds-aichat-chat-input') === probe.input &&
            regions.length === probe.liveRegions.length &&
            regions.every(
              (region, index) => region === probe.liveRegions[index]
            )
          );
        })
      )
      .toBe(true);
    await expect(page.locator('[aria-live]')).toHaveCount(liveRegions);
    await input.blur();
    await page.evaluate(() => window.chatInstance.requestFocus());
    await expect(input).not.toBeFocused();
    await input.click();
    await expect(input).toBeFocused();
    await expectWithinViewport(page);

    await page.evaluate(() =>
      window.chatInstance.changeView({ mainWindow: false, launcher: true })
    );
    await expect(widget).not.toBeVisible();
    await page.evaluate(() =>
      window.chatInstance.changeView({ mainWindow: true, launcher: false })
    );
    await expect(widget).toBeVisible();
    await page.evaluate(() => window.chatInstance.requestFocus());
    await expect(input).not.toBeFocused();
    await input.click();
    await expect(input).toBeFocused();
    await expect
      .poll(() =>
        page.evaluate(() => window.chatInstance.getState().input.rawValue)
      )
      .toBe('Mobile draft');
    await page.setViewportSize({ width: 390, height: 844 });
    await expectWithinViewport(page);
    await expect
      .poll(async () => (await widget.boundingBox()).height)
      .toBeGreaterThan(initialHeight - 5);
    await expect(page.locator('[aria-live]')).toHaveCount(liveRegions);
  });
}
