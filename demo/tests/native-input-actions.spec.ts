/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import Add16 from '@carbon/icons/es/add--large/16.js';
import { PageObjectId } from '@carbon/ai-chat/server';
import type { InputConfig } from '@carbon/ai-chat';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  destroyChatSession,
  expectNoCspViolations,
  openChatWindow,
  prepareDemoPage,
  waitForChatReady,
} from './utils';
import type {} from '../types/window';

interface ActionsProbe {
  calls: string[];
  links: { url: string; target: string }[];
  borrowed?: HTMLButtonElement;
  wrapper?: HTMLElement;
  consumer?: HTMLElement;
  input?: InputConfig;
}

type ProbeWindow = Window & { inputActionsProbe: ActionsProbe };

async function prepare(
  page: Page,
  framework: string,
  mode: 'config' | 'controls' = 'config'
) {
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepareDemoPage(page, {
    settings: {
      framework,
      layout: 'fullscreen',
      direction: framework === 'react' ? 'ltr' : 'rtl',
      writeableElements: 'false',
    },
  });
  const initialConfig = {
    openChatByDefault: true,
    homescreen: { isOn: false },
    header: { isOn: true },
    upload: { isOn: false },
    input: { expanded: false, isDisabled: false },
  };
  if (mode === 'controls') {
    const url = new URL(page.url());
    url.searchParams.set('config', JSON.stringify(initialConfig));
    await page.goto(url.toString());
  }
  await page.waitForFunction(
    () =>
      window.chatInstance?.serviceManager?.store.getState()
        .initialViewChangeComplete
  );
  if (mode === 'config') {
    await page.evaluate(
      (config) => window.setChatConfig(config),
      initialConfig
    );
  }
  await openChatWindow(page);
  await waitForChatReady(page);
  await expect(page.locator('html')).toHaveAttribute(
    'dir',
    framework === 'react' ? 'ltr' : 'rtl'
  );
  await expect(page.locator('cds-aichat-custom-element')).toHaveCount(
    framework === 'react' ? 0 : 1
  );
}

async function configureActions(page: Page, expanded: boolean) {
  await page.evaluate(
    async ({ expanded, icon }) => {
      const probe: ActionsProbe = ((window as ProbeWindow).inputActionsProbe = {
        calls: [],
        links: [],
      });
      window.open = (url, target) => {
        probe.links.push({ url: String(url), target });
        return null;
      };
      const actions = expanded
        ? [
            ...Array.from({ length: 12 }, (_, index) => ({
              id: `action-${index}`,
              text: `Action ${index + 1}`,
              testId: `input-action-${index}`,
              icon,
              ...(index === 0
                ? { href: 'https://example.com/inline' }
                : index === 11
                  ? { href: 'https://example.com/overflow', target: '_blank' }
                  : { onClick: () => probe.calls.push(`action-${index}`) }),
            })),
            {
              id: 'fixed',
              text: 'Fixed action',
              testId: 'input-action-fixed',
              icon,
              fixed: true,
              onClick: () => probe.calls.push('fixed'),
            },
          ]
        : [
            {
              id: 'callback',
              text: 'Run action',
              testId: 'input-action-callback',
              icon,
              onClick: () => probe.calls.push('callback'),
            },
            {
              id: 'disabled',
              text: 'Disabled action',
              testId: 'input-action-disabled',
              icon,
              disabled: true,
              onClick: () => probe.calls.push('disabled'),
            },
            {
              id: 'link',
              text: 'Open link',
              testId: 'input-action-link',
              icon,
              href: 'https://example.com/compact',
            },
          ];
      probe.input = { expanded, actions };
      await window.setChatConfig({ input: probe.input });
    },
    { expanded, icon: Add16 }
  );
  await expect(page.locator('cds-aichat-input-actions')).toBeVisible();
}

async function updateInput(page: Page, patch: Partial<InputConfig>) {
  await page.evaluate(async (next) => {
    const probe = (window as ProbeWindow).inputActionsProbe;
    probe.input = { ...probe.input, ...next };
    await window.setChatConfig({ input: probe.input });
  }, patch);
}

async function openConfigurationSection(page: Page, title: string) {
  const item = page.locator(`cds-accordion-item[title="${title}"]`);
  if ((await item.getAttribute('open')) === null) {
    await item.getByRole('button', { name: title, exact: true }).click();
  }
}

function slotWrapper(page: Page, name: string) {
  return page.locator('cds-aichat-prompt-line-slot').filter({
    has: page.locator(`slot[name="${name}"]`),
  });
}

test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

for (const framework of ['react', 'web-component']) {
  test(`${framework} compact input actions keep labels, keys, disabled states, links, and focus`, async ({
    page,
  }) => {
    await prepare(page, framework);
    await configureActions(page, false);
    const actions = page.locator('cds-aichat-input-actions');
    const trigger = actions.getByTestId('cds-aichat-input-actions-trigger');
    await expect(trigger.getByRole('button')).toHaveAccessibleName(
      'Add files and more'
    );
    await trigger.getByRole('button').focus();
    await page.keyboard.press('Enter');
    const menu = actions.locator('cds-menu');
    await expect(menu.getByRole('menu')).toBeVisible();
    const run = menu.getByTestId('input-action-callback');
    const disabled = menu.getByTestId('input-action-disabled');
    await expect(run).toHaveAccessibleName('Run action');
    await expect(disabled).toHaveAttribute('disabled', '');
    await expect(run.locator('svg')).toHaveCount(1);
    await run.focus();
    await page.keyboard.press('ArrowDown');
    await expect
      .poll(() =>
        menu
          .getByTestId('input-action-link')
          .evaluate(
            (node) => node.matches(':focus-within') || node.matches(':focus')
          )
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    // The parent also drops focus on Escape; automatic return is a known gap.
    await trigger.getByRole('button').focus();
    await trigger.click();
    await actions.getByTestId('input-action-link').click();
    await expect(actions.locator('cds-menu')).toHaveCount(0);
    expect(
      await page.evaluate(() => (window as ProbeWindow).inputActionsProbe.links)
    ).toEqual([{ url: 'https://example.com/compact', target: '_self' }]);
    await trigger.click();
    await actions.getByTestId('input-action-callback').click();
    expect(
      await page.evaluate(() => (window as ProbeWindow).inputActionsProbe.calls)
    ).toEqual(['callback']);
    await updateInput(page, { isDisabled: true });
    await expect(trigger.getByRole('button')).toBeDisabled();
    await expect(page.getByTestId(PageObjectId.INPUT)).not.toBeEditable();
    await updateInput(page, { isDisabled: false });
    await trigger.click();
    await expect(actions.locator('cds-menu').getByRole('menu')).toBeVisible();
    await updateInput(page, { isVisible: false });
    await expect(actions).toHaveCount(0);
    await updateInput(page, { isVisible: true });
    await trigger.click();
    await actions.getByTestId('input-action-callback').click();
    expect(
      await page.evaluate(() => (window as ProbeWindow).inputActionsProbe.calls)
    ).toEqual(['callback', 'callback']);
    const input = page.getByTestId(PageObjectId.INPUT);
    await input.fill('Input actions send check');
    await input.press('Enter');
    await expect(
      page
        .getByTestId(PageObjectId.MAIN_PANEL)
        .getByText('Input actions send check', { exact: true })
    ).toBeVisible();
  });

  test(`${framework} expanded actions overflow at a real narrow width while fixed actions remain`, async ({
    page,
  }) => {
    await prepare(page, framework);
    await configureActions(page, true);
    const actions = page.locator('cds-aichat-input-actions');
    const row = actions.locator('.cds-aichat-input-inline-actions');
    const overflow = actions.getByTestId(
      'cds-aichat-input-actions-overflow-trigger'
    );
    await expect(row).not.toHaveAttribute('data-measuring');
    await expect(overflow).toBeHidden();
    for (let index = 0; index < 12; index += 1) {
      await expect(row.getByTestId(`input-action-${index}`)).toBeVisible();
    }
    const wide = await row.evaluate(
      (element) => element.getBoundingClientRect().width
    );
    await row.getByTestId('input-action-0').click();
    await page.setViewportSize({ width: 700, height: 900 });
    await expect(overflow).toBeVisible();
    await expect(row.getByTestId('input-action-fixed')).toBeVisible();
    await expect(row.getByTestId('input-action-11')).toBeHidden();
    expect(
      await row.evaluate((element) => element.getBoundingClientRect().width)
    ).toBeLessThan(wide);
    await overflow.click();
    const menu = actions.locator('cds-menu');
    await expect(menu.getByRole('menu')).toBeVisible();
    await expect(menu.getByTestId('input-action-fixed')).toHaveCount(0);
    const hiddenIds = await row
      .locator('cds-icon-button[data-hidden]:not([data-input-actions-trigger])')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-testid'))
      );
    expect(hiddenIds.length).toBeGreaterThan(0);
    expect(
      await menu
        .locator('cds-menu-item')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('data-testid'))
        )
    ).toEqual(hiddenIds);
    await menu.getByTestId('input-action-11').click();
    await expect(menu).toHaveCount(0);
    expect(
      await page.evaluate(() => (window as ProbeWindow).inputActionsProbe.links)
    ).toEqual([
      { url: 'https://example.com/inline', target: '_self' },
      { url: 'https://example.com/overflow', target: '_blank' },
    ]);
    await overflow.click();
    await page.setViewportSize({ width: 1360, height: 900 });
    await expect(overflow).toBeHidden();
    await expect(actions.locator('cds-menu')).toHaveCount(0);
    await expect(row.getByTestId('input-action-11')).toBeVisible();
    await row.getByTestId('input-action-fixed').click();
    expect(
      await page.evaluate(() => (window as ProbeWindow).inputActionsProbe.calls)
    ).toEqual(['fixed']);
  });

  test(`${framework} writable prompt slots keep empty layout, late text, borrowed identity, and reconnect`, async ({
    page,
  }) => {
    await prepare(page, framework);
    await page.evaluate(() =>
      window.setChatConfig({ input: { expanded: true } })
    );
    const actionsEnd = slotWrapper(page, 'promptLineActionsEnd');
    const sendStart = slotWrapper(page, 'promptLineSendButtonStart');
    await expect(actionsEnd).toHaveAttribute('hidden', '');
    await expect(sendStart).toHaveAttribute('hidden', '');
    await page.evaluate(() => {
      const probe: ActionsProbe = ((window as ProbeWindow).inputActionsProbe = {
        calls: [],
        links: [],
      });
      probe.wrapper =
        window.chatInstance.writeableElements.promptLineActionsEnd;
    });
    await expect(actionsEnd).toHaveAttribute('hidden', '');
    await page.evaluate(() => {
      (window as ProbeWindow).inputActionsProbe.wrapper.textContent =
        'Late slot text';
    });
    await expect(actionsEnd).not.toHaveAttribute('hidden');
    expect(
      await actionsEnd.evaluate(
        (element) => element.getBoundingClientRect().height
      )
    ).toBe(32);
    expect(
      await actionsEnd.evaluate((element) => element.parentElement?.localName)
    ).toBe('cds-aichat-prompt-line-shell');
    await page.evaluate(() => {
      const probe = (window as ProbeWindow).inputActionsProbe;
      probe.wrapper.textContent = '';
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.testid = 'borrowed-input-action';
      button.textContent = 'Borrowed action';
      button.addEventListener('click', () => probe.calls.push('borrowed'));
      probe.borrowed = button;
      probe.wrapper.appendChild(button);
    });
    const borrowed = page.getByTestId('borrowed-input-action');
    await borrowed.click();
    await actionsEnd.evaluate((element) =>
      element.parentElement.appendChild(element)
    );
    await expect(actionsEnd).toBeVisible();
    await expect(borrowed).toBeVisible();
    expect(
      await borrowed.evaluate(
        (element) =>
          element === (window as ProbeWindow).inputActionsProbe.borrowed
      )
    ).toBe(true);
    await page.evaluate(() =>
      window.setChatConfig({ input: { expanded: false } })
    );
    await expect(actionsEnd).toHaveCount(0);
    expect(
      await page.evaluate(
        () =>
          (window as ProbeWindow).inputActionsProbe.borrowed.parentElement ===
          (window as ProbeWindow).inputActionsProbe.wrapper
      )
    ).toBe(true);
    await page.evaluate(() =>
      window.setChatConfig({ input: { expanded: true } })
    );
    await expect(borrowed).toBeVisible();
    await borrowed.click();
    expect(
      await page.evaluate(() => (window as ProbeWindow).inputActionsProbe.calls)
    ).toEqual(['borrowed', 'borrowed']);
    await page.evaluate(() => {
      (window as ProbeWindow).inputActionsProbe.wrapper.replaceChildren();
    });
    await expect(actionsEnd).toHaveAttribute('hidden', '');
    await page.evaluate(() => {
      const host =
        window.chatInstance.writeableElements.promptLineSendButtonStart;
      host.appendChild(document.createTextNode('Send slot text'));
    });
    await expect(sendStart).not.toHaveAttribute('hidden');
    expect(
      await sendStart.evaluate(
        (element) => element.getBoundingClientRect().height
      )
    ).toBe(32);
    await page.evaluate(() =>
      window.chatInstance.writeableElements.promptLineSendButtonStart.replaceChildren()
    );
    await expect(sendStart).toHaveAttribute('hidden', '');
  });

  test(`${framework} late host-rendered prompt slots retain their consumer nodes on unrelated config`, async ({
    page,
  }) => {
    if (framework === 'web-component') {
      await prepare(page, framework);
      await page.evaluate(() =>
        window.setChatConfig({ input: { expanded: true } })
      );
      const actionsEnd = slotWrapper(page, 'promptLineActionsEnd');
      await expect(actionsEnd).toHaveAttribute('hidden', '');
      // The demo's Show slots toggle replaces the whole native prompt line.
      // Supply just this public slot so this case keeps exercising the input.
      await page.locator('cds-aichat-custom-element').evaluate((host) => {
        const wrapper = document.createElement('div');
        wrapper.slot = 'promptLineActionsEnd';
        const content = document.createElement('writeable-element-example');
        content.setAttribute('location', 'promptLineActionsEnd');
        content.setAttribute('valueFromParent', 'First value');
        wrapper.appendChild(content);
        host.appendChild(wrapper);
        (window as ProbeWindow).inputActionsProbe = {
          calls: [],
          links: [],
          wrapper,
        };
      });
      const consumer = page
        .locator('[slot="promptLineActionsEnd"] button.external--swatch')
        .last();
      await expect(consumer).toBeVisible();
      await consumer.evaluate((element) => {
        (window as ProbeWindow).inputActionsProbe.consumer =
          element as HTMLElement;
      });
      await page.evaluate(async () => {
        await window.setChatConfig({
          header: { title: 'Unrelated slot update' },
        });
        (
          window as ProbeWindow
        ).inputActionsProbe.wrapper.firstElementChild.setAttribute(
          'valueFromParent',
          'Second value'
        );
      });
      await expect(
        page.locator('cds-aichat-header-view').getByTestId('header_title')
      ).toHaveText('Unrelated slot update');
      await expect(consumer).toBeVisible();
      expect(
        await consumer.evaluate(
          (element) =>
            element === (window as ProbeWindow).inputActionsProbe.consumer
        )
      ).toBe(true);
      expect(
        await actionsEnd.evaluate(
          (element) => element.getBoundingClientRect().height
        )
      ).toBe(32);
      await consumer.focus();
      await expect(consumer).toBeFocused();
      await page.evaluate(() =>
        (window as ProbeWindow).inputActionsProbe.wrapper.remove()
      );
      await expect(actionsEnd).toHaveAttribute('hidden', '');
      return;
    }
    await prepare(page, framework, 'controls');
    await openConfigurationSection(page, 'Chat Configuration');
    const expanded = page.locator(
      'demo-input-config-switcher cds-dropdown[title-text="Expanded layout"]'
    );
    await expanded.getByRole('combobox').click();
    await expanded.getByText('Enable expanded layout', { exact: true }).click();
    const actionsEnd = slotWrapper(page, 'promptLineActionsEnd');
    await expect(actionsEnd).toHaveAttribute('hidden', '');
    await openConfigurationSection(page, 'Page Settings');
    const switcher = page.locator('demo-writeable-elements-switcher');
    await switcher.getByRole('combobox').click();
    await switcher.getByText('Show slots', { exact: true }).click();
    await expect(actionsEnd).not.toHaveAttribute('hidden');
    const consumer = page
      .locator('[slot="promptLineActionsEnd"]')
      .locator(
        framework === 'react'
          ? 'button.writeable-element-external--swatch'
          : 'button.external--swatch'
      )
      .last();
    await expect(consumer).toBeVisible();
    await consumer.evaluate((element) => {
      (window as ProbeWindow).inputActionsProbe = {
        calls: [],
        links: [],
        consumer: element as HTMLElement,
      };
    });
    await openConfigurationSection(page, 'Chat Configuration');
    await page
      .locator('demo-header-switcher')
      .getByRole('textbox', { name: 'Header title', exact: true })
      .fill('Unrelated slot update');
    await expect(
      page.locator('cds-aichat-header-view').getByTestId('header_title')
    ).toHaveText('Unrelated slot update');
    await expect(consumer).toBeVisible();
    expect(
      await consumer.evaluate(
        (element) =>
          element === (window as ProbeWindow).inputActionsProbe.consumer
      )
    ).toBe(true);
    expect(
      await actionsEnd.evaluate(
        (element) => element.getBoundingClientRect().height
      )
    ).toBe(32);
    await consumer.focus();
    await expect(consumer).toBeFocused();
    await openConfigurationSection(page, 'Page Settings');
    await switcher.getByRole('combobox').click();
    await switcher.getByText('Hide slots', { exact: true }).click();
    await expect(actionsEnd).toHaveAttribute('hidden', '');
  });
}
