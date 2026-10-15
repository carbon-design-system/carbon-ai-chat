/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { test, expect, type Page } from '@playwright/test';
import { elementEntries, wrapperEntries } from './carbon-registration/entries';
import { inspectUpgrades } from './carbon-registration/inspect';

async function openEntry(page: Page, entry: string) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(
    `/carbon-registration.html?entry=${encodeURIComponent(entry)}`
  );
  await expect(page.locator('#root')).toHaveAttribute('data-loaded', 'true');
  return errors;
}

for (const entry of Object.keys(elementEntries)) {
  test(`isolated ${entry} upgrades its rendered tags`, async ({ page }) => {
    const errors = await openEntry(page, entry);
    const report = await inspectUpgrades(page);
    expect(report.tags.length).toBeGreaterThan(0);
    expect(report.failures).toEqual([]);
    const custom = entry.startsWith('es-custom/');
    const prefix = custom ? 'cds-custom' : 'cds';
    const host = page.locator('#root > *').first();
    await expect(host).toBeVisible();
    if (custom) {
      expect(report.tags.every((tag) => tag.startsWith('cds-custom-'))).toBe(
        true
      );
    }
    const name = entry.split('/')[1];
    if (name === 'card-footer' || name === 'workspace-shell-footer') {
      await host.locator(`${prefix}-button`).click();
      await expect(page.locator('#actions')).toHaveText('1');
      if (name === 'card-footer') {
        await host.dispatchEvent('fixture-icon-variant');
        await expect(host.locator(`${prefix}-icon-button`)).toBeVisible();
        expect((await inspectUpgrades(page)).failures).toEqual([]);
        await host.locator(`${prefix}-icon-button`).click();
        await expect(page.locator('#actions')).toHaveText('2');
      }
    } else if (name === 'history-toolbar') {
      await host.locator('input').fill('Conversation');
      await expect(host.locator('input')).toHaveValue('Conversation');
    } else if (name === 'history-panel-item-input') {
      await host.locator('input').fill('Renamed');
      await expect(host.locator('input')).toHaveValue('Renamed');
    } else if (name === 'conversational-search-shell') {
      await host.getByRole('button', { name: 'Toggle citations' }).click();
      await expect(page.locator('#actions')).toHaveText('1');
    } else if (name === 'chat-button') {
      await host.click();
      await expect(page.locator('#actions')).toHaveText('1');
    } else if (
      ['chat-header', 'history-panel-item', 'toolbar'].includes(name)
    ) {
      const trigger = host.locator(`${prefix}-overflow-menu`).first();
      await expect(trigger).toBeVisible();
      await trigger.click();
      await expect(
        trigger.locator(`:scope > ${prefix}-menu`).getByRole('menu')
      ).toBeVisible();
      if (name === 'chat-header' || name === 'toolbar') {
        const iconWidth = await trigger
          .locator(`${prefix}-menu-item[label="First"]`)
          .evaluate((element) => {
            const icon = element.shadowRoot!.querySelector(
              '[class*="menu-item__icon"]'
            )!;
            return icon.getBoundingClientRect().width;
          });
        expect(iconWidth).toBe(0);
      }
      await trigger.locator(`${prefix}-menu-item[label="First"]`).click();
      await expect(page.locator('#actions')).toHaveText('1');
    } else if (name === 'card-steps') {
      await expect(host.getByText('Complete')).toBeVisible();
      await expect(host.getByText('Pending')).toBeVisible();
      await expect(host.locator(`${prefix}-icon-indicator`)).toBeVisible();
      await expect(host.locator(`${prefix}-loading`)).toBeVisible();
    } else if (name === 'carousel') {
      await expect(host.getByText('Carousel content')).toBeVisible();
      await expect(host.locator(`${prefix}-icon-button`).first()).toBeVisible();
    } else if (name === 'history-loading') {
      await expect(
        host.locator(`${prefix}-skeleton-text`).first()
      ).toBeVisible();
    } else if (name === 'table') {
      await expect(host.locator(`${prefix}-table-skeleton`)).toBeVisible();
      await expect(host.locator('table')).toBeVisible();
    } else if (name === 'code-snippet') {
      const expand = host.locator(`${prefix}-button`);
      await expect(expand).toBeVisible();
      await expand.click();
      await expect(expand).toHaveText('Show less');
      expect((await inspectUpgrades(page)).failures).toEqual([]);
    } else if (name === 'history-panel-menu') {
      await expect(host.getByRole('button')).toBeVisible();
      await expect(host.getByText('Conversations')).toBeVisible();
    } else if (name === 'chat-button-skeleton') {
      await expect(host.locator('button').first()).toBeVisible();
    } else {
      await expect(host.getByText('Slotted content')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

for (const entry of Object.keys(wrapperEntries)) {
  test(`isolated Carbon React ${entry} wrapper upgrades without another wrapper`, async ({
    page,
  }) => {
    const errors = await openEntry(page, entry);
    const host = page.locator('#root > *').first();
    if (entry === 'Menu') {
      await expect(host.getByRole('menu')).toBeVisible();
    } else {
      await expect(host).toBeVisible();
    }
    const report = await inspectUpgrades(page);
    expect(report.tags.length).toBeGreaterThan(0);
    expect(report.failures).toEqual([]);
    if (entry === 'DatePicker') {
      await host.locator('input').fill('10/14/2026');
      await expect(host.locator('input')).toHaveValue('10/14/2026');
    } else if (entry === 'Dropdown') {
      await host.getByRole('combobox').click();
      await expect(host.locator('cds-dropdown-item')).toBeVisible();
      await host.locator('cds-dropdown-item').click();
      await expect(host).toHaveAttribute('value', 'one');
    } else if (entry === 'Loading') {
      await expect(host.locator('svg')).toBeVisible();
    } else if (entry === 'AISlug') {
      await host.click();
      await expect(host.getByText('AI details')).toBeVisible();
    } else if (entry === 'Menu') {
      await host.locator('cds-menu-item').click();
      await expect(page.locator('#actions')).toHaveText('1');
    } else if (entry === 'Layer') {
      await host.getByRole('button').click();
      await expect(page.locator('#actions')).toHaveText('1');
    } else {
      await host.click();
      await expect(page.locator('#actions')).toHaveText('1');
    }
    expect(errors).toEqual([]);
  });
}

test('the upgrade check detects a class-only import without its owning barrel', async ({
  page,
}) => {
  await openEntry(page, 'missing');
  const report = await inspectUpgrades(page);
  expect(report.failures).toEqual(['cds-button']);
});

test('isolated conversational search upgrades its lazy citation skeleton', async ({
  page,
}) => {
  let release: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    /\/assets\/ConversationalSearchCitations-[^/]+\.js$/,
    async (route) => {
      await released;
      await route.continue();
    }
  );
  const errors = await openEntry(page, 'ConversationalSearch');
  try {
    const shell = page.locator('cds-aichat-conversational-search-shell');
    await expect(shell.getByText('An answer with a citation.')).toBeVisible();
    await shell
      .getByRole('button', { name: 'Open or close the list of sources' })
      .click();
    await expect(shell.locator('cds-skeleton-placeholder')).toBeVisible();
    expect((await inspectUpgrades(page)).failures).toEqual([]);
  } finally {
    release!();
  }
  await expect(page.getByText('Source', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const variant of ['es', 'es-custom']) {
  test(`${variant} header menu opens a new tab without an opener`, async ({
    page,
    context,
  }) => {
    const errors = await openEntry(page, `${variant}/chat-header`);
    const prefix = variant === 'es-custom' ? 'cds-custom' : 'cds';
    const trigger = page.locator(`${prefix}-overflow-menu`).first();
    await trigger.click();
    await expect(trigger.getByRole('menu')).toBeVisible();
    const popupOpened = context.waitForEvent('page');
    await trigger.locator(`${prefix}-menu-item[label="Link"]`).click();
    const popup = await popupOpened;
    await popup.waitForLoadState();
    expect(await popup.evaluate(() => window.opener)).toBeNull();
    await popup.close();
    expect(errors).toEqual([]);
  });
}

for (const name of ['chat-header', 'history-panel-item', 'toolbar']) {
  for (const direction of ['ltr', 'rtl']) {
    test(`${name} remains actionable at the bottom/right viewport edge in ${direction}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 600, height: 320 });
      const errors = await openEntry(page, `es/${name}`);
      const host = page.locator('#root > *').first();
      await host.evaluate((element, direction) => {
        document.documentElement.dir = direction;
        const host = element as HTMLElement;
        host.style.position = 'fixed';
        host.style.bottom = '8px';
        host.style.right = '8px';
      }, direction);
      const trigger = host.locator('cds-overflow-menu').first();
      await expect(trigger).toBeVisible();
      await trigger.click();
      const menu = trigger.locator(':scope > cds-menu');
      await expect(menu.getByRole('menu')).toBeVisible();
      const bounds = await menu.getByRole('menu').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: innerWidth,
          height: innerHeight,
        };
      });
      expect(bounds.top, JSON.stringify(bounds)).toBeGreaterThanOrEqual(0);
      expect(bounds.left, JSON.stringify(bounds)).toBeGreaterThanOrEqual(0);
      expect(bounds.bottom, JSON.stringify(bounds)).toBeLessThanOrEqual(
        bounds.height
      );
      expect(bounds.right, JSON.stringify(bounds)).toBeLessThanOrEqual(
        bounds.width
      );
      for (const label of ['First', 'Last']) {
        const item = menu.locator(`cds-menu-item[label="${label}"]`);
        await expect(item).toBeVisible();
        await item.click();
        if (label === 'First') {
          await trigger.click();
        }
      }
      await expect(page.locator('#actions')).toHaveText('2');
      expect(errors).toEqual([]);
    });
  }
}
