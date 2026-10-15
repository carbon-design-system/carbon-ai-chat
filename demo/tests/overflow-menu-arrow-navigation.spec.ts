/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { test, expect } from './fixtures';
import { PageObjectId, PanelType } from '@carbon/ai-chat/server';
import type { Locator, Page } from '@playwright/test';
import {
  prepareDemoPage,
  destroyChatSession,
  expectNoCspViolations,
  openChatWindow,
  waitForChatReady,
  waitForSetChatConfigApplied,
} from './utils';
import { focusedTag, inspectUpgrades } from './carbon-registration/inspect';
import type {} from '../types/window';

test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

async function exerciseMenu(page: Page, trigger: Locator) {
  await expect(trigger).toBeVisible();
  await trigger.click();
  const menu = trigger.locator(':scope > cds-menu');
  await expect(menu.getByRole('menu')).toBeVisible();
  const items = menu.locator('cds-menu-item:not([disabled])');
  const first = await items.first().getAttribute('label');
  const last = await items.last().getAttribute('label');
  await items.first().focus();
  await expect.poll(() => focusedTag(page)).toBe(first);
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => focusedTag(page)).toBe(last);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => focusedTag(page)).toBe(first);
  await page.keyboard.press('ArrowDown');
  await expect
    .poll(() => focusedTag(page))
    .toBe(await items.nth(1).getAttribute('label'));
  await page.keyboard.press('Escape');
  await expect(menu.getByRole('menu')).not.toBeVisible();
  await expect
    .poll(() =>
      trigger.evaluate((element) => {
        let active = document.activeElement;
        while (active?.shadowRoot?.activeElement) {
          active = active.shadowRoot.activeElement;
        }
        return active === element || element.shadowRoot?.contains(active);
      })
    )
    .toBe(true);
}

for (const framework of ['react', 'web-component'] as const) {
  for (const appearance of [
    { theme: 'white', direction: 'ltr' },
    { theme: 'g100', direction: 'rtl' },
  ] as const) {
    test(`${framework} ${appearance.theme} ${appearance.direction}: header, history and forced toolbar overflow menus`, async ({
      page,
    }) => {
      const menuWarnings: string[] = [];
      page.on('console', (message) => {
        if (
          /overflow.?menu|menu structure/i.test(message.text()) &&
          message.type() === 'warning'
        ) {
          menuWarnings.push(message.text());
        }
      });
      await page.setViewportSize({ width: 1600, height: 900 });
      await prepareDemoPage(page, {
        setChatConfig: true,
        settings: { framework },
      });
      await page.evaluate(async ({ theme, direction }) => {
        const increment = () => {
          const data = document.documentElement.dataset;
          data.menuActions = String(Number(data.menuActions || 0) + 1);
        };
        document.documentElement.dir = direction;
        await window.setChatConfig!({
          header: {
            title: 'Menu test',
            menuOptions: [
              { text: 'First', handler: increment },
              { text: 'Middle', handler: increment },
              { text: 'Last', handler: increment },
            ],
          },
          homescreen: { isOn: false },
          history: { isOn: true },
          injectCarbonTheme: theme,
          launcher: { isOn: false },
          openChatByDefault: true,
        });
      }, appearance);
      await waitForSetChatConfigApplied(page);
      await openChatWindow(page);
      await waitForChatReady(page, { panelTestId: PageObjectId.MAIN_PANEL });

      const header = page.locator('cds-aichat-chat-header').first();
      const navigation = header.locator('cds-overflow-menu').first();
      await exerciseMenu(page, navigation);
      for (const key of ['Enter', 'Space']) {
        await navigation.click();
        await expect(navigation.getByRole('menu')).toBeVisible();
        await navigation.locator('cds-menu-item[label="First"]').focus();
        await expect.poll(() => focusedTag(page)).toBe('First');
        await page.keyboard.press(key);
        await expect(navigation.getByRole('menu')).not.toBeVisible();
      }
      await expect(page.locator('html')).toHaveAttribute(
        'data-menu-actions',
        '2'
      );

      await page.evaluate(async (panelType) => {
        await window.chatInstance!.customPanels.getPanel(panelType).open();
      }, PanelType.HISTORY);
      const historyItem = page.locator('cds-aichat-history-panel-item').first();
      await historyItem.hover();
      const historyTrigger = historyItem.locator('cds-overflow-menu');
      await exerciseMenu(page, historyTrigger);
      await page.evaluate(() => {
        document.addEventListener('history-item-menu-action', () => {
          const data = document.documentElement.dataset;
          data.historyActions = String(Number(data.historyActions || 0) + 1);
        });
      });
      for (const key of ['Enter', 'Space']) {
        await historyItem.hover();
        await historyTrigger.click();
        await expect(historyTrigger.getByRole('menu')).toBeVisible();
        await historyTrigger.locator('cds-menu-item').first().focus();
        await page.keyboard.press(key);
      }
      await expect(page.locator('html')).toHaveAttribute(
        'data-history-actions',
        '2'
      );

      const toolbar = header.locator('cds-aichat-toolbar').first();
      await toolbar.evaluate((element) => {
        const instance = element as HTMLElement & {
          actions: Record<string, unknown>[];
          overflow: boolean;
        };
        const icon = instance.actions.find((action) => action.icon)?.icon;
        if (!icon) {
          throw new Error('Header toolbar has no action icon');
        }
        const onClick = () => {
          const data = document.documentElement.dataset;
          data.toolbarActions = String(Number(data.toolbarActions || 0) + 1);
        };
        instance.actions = [
          { text: 'First', icon, onClick },
          { text: 'Disabled', icon, disabled: true, onClick },
          { text: 'Last', icon, danger: true, divider: true, onClick },
        ];
        instance.overflow = true;
        instance.style.width = '64px';
      });
      const toolbarTrigger = toolbar.locator('cds-overflow-menu').last();
      await exerciseMenu(page, toolbarTrigger);
      await toolbarTrigger.click();
      await toolbarTrigger.locator('cds-menu-item[label="First"]').focus();
      await expect.poll(() => focusedTag(page)).toBe('First');
      await expect(
        toolbarTrigger.locator('cds-menu-item[kind="danger"]')
      ).toHaveAttribute('label', 'Last');
      await expect(
        toolbarTrigger.locator('cds-menu-item-divider')
      ).toBeVisible();
      const disabled = toolbarTrigger.locator('cds-menu-item[disabled]');
      await disabled.click({ force: true });
      await expect(page.locator('html')).not.toHaveAttribute(
        'data-toolbar-actions'
      );
      await expect(toolbarTrigger.getByRole('menu')).toBeVisible();
      for (const key of ['Enter', 'Space']) {
        await toolbarTrigger.locator('cds-menu-item[label="First"]').focus();
        await expect.poll(() => focusedTag(page)).toBe('First');
        await page.keyboard.press(key);
        await expect(toolbarTrigger.getByRole('menu')).not.toBeVisible();
        if (key === 'Enter') {
          await toolbarTrigger.click();
          await expect(toolbarTrigger.getByRole('menu')).toBeVisible();
        }
      }
      await expect(page.locator('html')).toHaveAttribute(
        'data-toolbar-actions',
        '2'
      );
      expect((await inspectUpgrades(page)).failures).toEqual([]);
      expect(menuWarnings).toEqual([]);
    });
  }
}
