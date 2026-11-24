/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { CarbonTheme, PageObjectId } from '@carbon/ai-chat/server';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  destroyChatSession,
  expectNoCspViolations,
  openChatWindow,
  prepareDemoPage,
} from './utils';
import type {} from '../types/window';

async function prepareHost(page: Page, framework: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepareDemoPage(page, {
    settings: {
      framework,
      layout: 'sidebar',
      direction: framework === 'react' ? 'ltr' : 'rtl',
      writeableElements: 'false',
    },
  });
  await page.waitForFunction(
    () =>
      window.chatInstance?.serviceManager?.store.getState()
        .initialViewChangeComplete
  );
  await expect(page.locator('cds-aichat-custom-element')).toHaveCount(
    framework === 'react' ? 0 : 1
  );
  await expect(page.locator('html')).toHaveAttribute(
    'dir',
    framework === 'react' ? 'ltr' : 'rtl'
  );
}

test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

for (const framework of ['react', 'web-component']) {
  test(`${framework} disclaimer keeps its body slot and enables Accept after reading`, async ({
    page,
  }) => {
    await prepareHost(page, framework);
    await page.evaluate(
      (theme) =>
        window.setChatConfig({
          openChatByDefault: true,
          injectCarbonTheme: theme,
          disclaimer: {
            isOn: true,
            disclaimerHTML: Array.from(
              { length: 60 },
              (_, index) => `<p>Disclaimer paragraph ${index} must be read.</p>`
            ).join(''),
          },
        }),
      CarbonTheme.G100
    );
    await openChatWindow(page);
    const panel = page.getByTestId(PageObjectId.DISCLAIMER_PANEL);
    await expect(panel).toBeVisible();
    const body = panel.locator('cds-aichat-disclaimer-body');
    await expect(body.locator('p')).toHaveCount(60);
    expect(
      await body.evaluate((node) => ({
        shadow: Boolean(node.shadowRoot),
        slot: node.parentElement.assignedSlot?.name,
        display: getComputedStyle(node).display,
        svgParent: node.querySelector('svg')?.parentElement.className,
      }))
    ).toEqual({
      shadow: false,
      slot: 'body',
      display: 'contents',
      svgParent: 'cds-aichat--disclaimer__icon',
    });
    const accept = page
      .getByTestId(PageObjectId.DISCLAIMER_ACCEPT_BUTTON)
      .locator('button');
    await expect(accept).toBeDisabled();
    await panel.locator('.panel-body').evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });
    await expect(accept).toBeEnabled();
    await accept.focus();
    await expect(accept).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel).toBeHidden();
    await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();
    await expect(page.locator('.cds-aichat--aria-announcer')).toHaveCount(1);
  });

  test(`${framework} native confirmation keeps direct slots, keyboard actions, and rank`, async ({
    page,
  }) => {
    await prepareHost(page, framework);
    await openChatWindow(page);
    await page.evaluate(() => {
      const { store } = window.chatInstance.serviceManager;
      store.dispatch({
        type: 'HA_SET_HUMAN_AGENT_JOINED',
        responseUserProfile: { id: 'panel-proof', nickname: 'Agent' },
      });
      store.dispatch({
        type: 'HA_SET_SHOW_SCREEN_SHARE_REQUEST',
        showRequest: true,
      });
    });
    const body = page
      .locator('cds-aichat-confirmation-body')
      .filter({ has: page.getByRole('heading', { name: 'Screen sharing' }) });
    await expect(body).toBeVisible();
    expect(
      await body.evaluate((node) => ({
        shadow: Boolean(node.shadowRoot),
        slot: node.assignedSlot?.name,
        parent: node.parentElement.localName,
        display: getComputedStyle(node).display,
        padding: getComputedStyle(node.firstElementChild).paddingBlockStart,
      }))
    ).toEqual({
      shadow: false,
      slot: 'body',
      parent: 'cds-aichat-panel',
      display: 'contents',
      padding: '32px',
    });
    const footer = body.locator('..').locator('[slot="footer"]');
    const decline = footer.getByRole('button', {
      name: 'Decline',
      exact: true,
    });
    await expect(decline).toBeFocused();
    await expect(page.locator('.cds-aichat--aria-announcer')).toContainText(
      /share your screen/i
    );
    await page.evaluate(() =>
      window.chatInstance.updateCatastrophicErrorPanel({
        isOpen: true,
        title: 'Higher priority error',
        bodyText: 'Retained **markdown** body.',
      })
    );
    await expect(
      page.getByText('Higher priority error', { exact: true })
    ).toBeVisible();
    await expect(body).toBeHidden();
    await page.evaluate(() =>
      window.chatInstance.updateCatastrophicErrorPanel({ isOpen: false })
    );
    await expect(body).toBeVisible();
    await decline.focus();
    await page.keyboard.press('Escape');
    await expect(body).toBeHidden();
    await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();

    await page.evaluate(() =>
      window.chatInstance.serviceManager.store.dispatch({
        type: 'HA_SET_SHOW_SCREEN_SHARE_REQUEST',
        showRequest: true,
      })
    );
    await expect(body).toBeVisible();
    const accept = footer.getByRole('button', {
      name: 'Share screen',
      exact: true,
    });
    await accept.focus();
    await page.keyboard.press('Enter');
    await expect(body).toBeHidden();
    expect(
      await page.evaluate(
        () =>
          window.chatInstance.serviceManager.store.getState().humanAgentState
            .isScreenSharing
      )
    ).toBe(true);
  });

  test(`${framework} iframe keeps its node for title changes and replaces it for a new source`, async ({
    page,
  }) => {
    await prepareHost(page, framework);
    await openChatWindow(page);
    const origin = 'https://web-chat.assistant.test.watson.cloud.ibm.com';
    await page.route(`${origin}/panel-body-*`, async (route) => {
      await route.fulfill({
        contentType: 'text/html',
        body: `<p>${route.request().url().endsWith('-a') ? 'Frame A' : 'Frame B'}</p>`,
      });
    });
    await page.evaluate((source) => {
      window.chatInstance.serviceManager.store.dispatch({
        type: 'OPEN_IFRAME_CONTENT',
        messageItem: {
          response_type: 'iframe',
          source,
          title: 'Panel frame A',
        },
      });
    }, `${origin}/panel-body-a`);
    const body = page.locator('cds-aichat-iframe-body');
    const frame = body.locator('iframe');
    await expect(frame).toHaveAttribute('title', 'Panel frame A');
    await expect(
      body.frameLocator('iframe').getByText('Frame A')
    ).toBeVisible();
    const first = await frame.elementHandle();
    await page.evaluate((source) => {
      window.chatInstance.serviceManager.store.dispatch({
        type: 'OPEN_IFRAME_CONTENT',
        messageItem: {
          response_type: 'iframe',
          source,
          title: 'Updated frame A',
        },
      });
    }, `${origin}/panel-body-a`);
    await expect(frame).toHaveAttribute('title', 'Updated frame A');
    expect(
      await frame.evaluate((node, original) => node === original, first)
    ).toBe(true);
    await expect(frame).toHaveAttribute('sandbox', /allow-scripts/);
    expect(await body.evaluate((node) => node.shadowRoot)).toBeNull();
    expect(
      await body.evaluate(
        (node) => node.closest<HTMLElement>('[slot="body"]').assignedSlot?.name
      )
    ).toBe('body');
    await page.evaluate((source) => {
      window.chatInstance.serviceManager.store.dispatch({
        type: 'OPEN_IFRAME_CONTENT',
        messageItem: {
          response_type: 'iframe',
          source,
          title: 'Panel frame B',
        },
      });
    }, `${origin}/panel-body-b`);
    await expect(
      body.frameLocator('iframe').getByText('Frame B')
    ).toBeVisible();
    expect(await first.evaluate((node) => node.isConnected)).toBe(false);
    await first.dispose();
  });
}
