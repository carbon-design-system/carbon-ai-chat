/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Locator, Page } from '@playwright/test';
import { PageObjectId } from '@carbon/ai-chat/server';
import { test, expect } from './fixtures';
import {
  prepareDemoPage,
  destroyChatSession,
  expectNoCspViolations,
  openChatWindow,
  waitForChatReady,
  waitForSetChatConfigApplied,
} from './utils';
import type {} from '../types/window';

async function expectWithinViewport(page: Page, surface: Locator) {
  await expect(surface).toBeVisible();
  await expect
    .poll(async () => {
      const box = await surface.boundingBox();
      const viewport = page.viewportSize()!;
      return {
        box,
        inside: Boolean(
          box &&
          box.width > 0 &&
          box.height > 0 &&
          box.x >= -1 &&
          box.y >= -1 &&
          box.x + box.width <= viewport.width + 1 &&
          box.y + box.height <= viewport.height + 1
        ),
      };
    })
    .toMatchObject({ inside: true });
}

async function expectNoVisibleCaret(host: Locator) {
  const carets = host.locator('.cds--popover-caret');
  for (let index = 0; index < (await carets.count()); index++) {
    await expect(carets.nth(index)).not.toBeVisible();
  }
}

async function prepareSurfacePage(
  page: Page,
  framework: string,
  theme: 'white' | 'g100',
  direction: 'ltr' | 'rtl'
) {
  await page.setViewportSize({ width: 1600, height: 900 });
  await prepareDemoPage(page, {
    setChatConfig: true,
    settings: { framework, writeableElements: 'false' },
  });
  await page.evaluate(
    async ({ theme, direction }) => {
      document.documentElement.dir = direction;
      await window.setChatConfig!({
        header: {
          title: 'Carbon surface test',
          showAiLabel: true,
          showRestartButton: true,
        },
        homescreen: { isOn: false },
        injectCarbonTheme: theme,
        launcher: { isOn: false },
        openChatByDefault: true,
      });
    },
    { theme, direction }
  );
  await waitForSetChatConfigApplied(page);
  await openChatWindow(page);
  await waitForChatReady(page, { panelTestId: PageObjectId.MAIN_PANEL });
}

test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

for (const framework of ['react', 'web-component'] as const) {
  for (const appearance of [
    { theme: 'white', direction: 'ltr' },
    { theme: 'g100', direction: 'rtl' },
  ] as const) {
    test(`${framework} ${appearance.theme} ${appearance.direction}: header AI label and icon tooltip have no caret and preserve focus`, async ({
      page,
    }) => {
      await prepareSurfacePage(
        page,
        framework,
        appearance.theme,
        appearance.direction
      );
      const header = page.locator('cds-aichat-chat-header').first();
      const aiLabel = header.locator('cds-ai-label');
      const aiTrigger = aiLabel.locator('button').first();
      const aiContent = aiLabel.locator('.cds--popover-content');
      const restart = header
        .locator('cds-icon-button')
        .filter({ hasText: 'Restart conversation' });
      const restartTrigger = restart.getByRole('button', {
        name: 'Restart conversation',
      });
      const tooltip = restart.locator('cds-tooltip');
      const tooltipContent = tooltip.locator('cds-tooltip-content');

      for (const width of [1600, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        await aiTrigger.focus();
        await expect(aiTrigger).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(
          page.getByRole('heading', { name: 'Name of feature', exact: true })
        ).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'How it works', exact: true })
        ).toBeVisible();
        await expectWithinViewport(page, aiContent);
        await expectNoVisibleCaret(aiLabel);
        await page.keyboard.press('Escape');
        await expect(aiContent).not.toBeVisible();
        await expect(aiTrigger).toBeFocused();
        await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();

        await restartTrigger.focus();
        await expect(restartTrigger).toBeFocused();
        await expect(
          restart.getByText('Restart conversation', { exact: true })
        ).toBeVisible();
        await expectWithinViewport(
          page,
          tooltipContent.locator('[part="content"]')
        );
        await expectNoVisibleCaret(tooltip);
        await page.keyboard.press('Escape');
        await expect(
          tooltipContent.locator('[part="content"]')
        ).not.toBeVisible();
        await expect(restartTrigger).toBeFocused();
        await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();
      }
    });

    test(`${framework} ${appearance.theme} ${appearance.direction}: desktop message scroll tiles show the default arrow and activate with Enter and Space`, async ({
      page,
    }) => {
      await prepareSurfacePage(
        page,
        framework,
        appearance.theme,
        appearance.direction
      );
      await page.evaluate(async () => {
        await window.chatInstance!.messaging.addMessage({
          id: 'carbon-v12-long-response',
          output: {
            generic: [
              {
                response_type: 'text',
                text: Array.from(
                  { length: 80 },
                  (_, index) => `Long response paragraph ${index + 1}.`
                ).join('\n\n'),
              },
            ],
          },
        });
      });
      const messages = page.locator('.cds-aichat--messages');
      await expect(messages).toContainText('Long response paragraph 80.');
      await expect
        .poll(() =>
          messages.evaluate((element) => {
            const scroller = element.parentElement!;
            return scroller.scrollHeight > scroller.clientHeight;
          })
        )
        .toBe(true);
      const tiles = page.locator(
        'cds-clickable-tile.cds-aichat--messages--scroll-handle-desktop'
      );
      await expect(tiles).toHaveCount(2);
      const handles = messages.locator('.cds-aichat--message--focus-handle');

      for (let index = 0; index < 2; index++) {
        const tile = tiles.nth(index);
        const target = index === 0 ? handles.first() : handles.last();
        for (const key of ['Enter', 'Space']) {
          await tile.focus();
          await expect(tile).toBeVisible();
          await expect(tile).toContainText(
            index === 0 ? 'Chat history begin.' : 'Chat history end.'
          );
          await expect(tile.locator('svg.cds--tile--icon')).toBeVisible();
          await expect(tile.locator('[slot="icon"]')).toHaveCount(0);
          expect(
            await tile.evaluate(
              (element) => getComputedStyle(element).direction
            )
          ).toBe(appearance.direction);
          await page.keyboard.press(key);
          await expect(target).toBeFocused();
        }
        await tile.focus();
        await expect(tile).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(tile).not.toBeVisible();
        await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();
      }
    });
  }
}
