/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import Add16 from '@carbon/icons/es/add--large/16.js';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  ButtonItemType,
  MessageResponseTypes,
  PageObjectId,
} from '@carbon/ai-chat/server';
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
  direction: (typeof directions)[number],
  config: Record<string, unknown> = {}
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
  await page.evaluate(async (config) => {
    await window.setChatConfig!({
      launcher: { isOn: false },
      openChatByDefault: true,
      ...config,
    });
  }, config);
  await waitForSetChatConfigApplied(page);
  await openChatWindow(page);
  await waitForChatReady(page, {
    panelTestId: config.homescreen
      ? PageObjectId.HOME_SCREEN_PANEL
      : PageObjectId.MAIN_PANEL,
  });
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

    for (const expanded of [false, true]) {
      const trigger = expanded ? 'expanded overflow' : 'compact';

      test(`${framework} ${direction}: Escape in the ${trigger} input-actions menu returns focus to its trigger`, async ({
        page,
      }) => {
        await openChat(page, framework, direction);
        await page.evaluate(
          async ({ expanded, icon }) => {
            const actions = Array.from(
              { length: expanded ? 12 : 2 },
              (_, index) => ({
                id: `focus-action-${index}`,
                text: `Action ${index + 1}`,
                testId: `focus-action-${index}`,
                icon,
                onClick: () => {},
              })
            );
            await window.setChatConfig!({
              launcher: { isOn: false },
              openChatByDefault: true,
              input: { expanded, actions },
            });
          },
          { expanded, icon: Add16 }
        );
        await waitForSetChatConfigApplied(page);
        const actions = page.locator('cds-aichat-input-actions');
        const button = actions
          .getByTestId(
            expanded
              ? 'cds-aichat-input-actions-overflow-trigger'
              : 'cds-aichat-input-actions-trigger'
          )
          .getByRole('button');
        await expect(button).toBeVisible();
        await button.focus();
        await page.keyboard.press('Enter');
        const menu = actions.locator('cds-menu');
        await expect(menu.getByRole('menu')).toBeVisible();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Escape');
        await expect(menu).toHaveCount(0);
        await expect(button).toBeFocused();
      });
    }

    for (const keyboard of [false, true]) {
      test(`${framework} ${direction}: Return to conversation by ${keyboard ? 'keyboard' : 'mouse'} focuses the input`, async ({
        page,
      }) => {
        await openChat(page, framework, direction, {
          homescreen: {
            isOn: true,
            greeting: 'Choose a topic',
            starters: {
              isOn: true,
              buttons: [{ label: 'Start conversation' }],
            },
          },
        });
        const homePanel = page.getByTestId(PageObjectId.HOME_SCREEN_PANEL);
        await expect(homePanel).toBeVisible();
        await page
          .getByRole('button', { name: 'Start conversation', exact: true })
          .click();
        await expect(homePanel).toBeHidden();
        await page
          .getByRole('button', {
            name: 'Return to the home screen',
            exact: true,
          })
          .click();
        await expect(homePanel).toBeVisible();
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
        await expect(homePanel).toBeHidden();
        await expect(page.getByTestId(PageObjectId.INPUT)).toBeFocused();
      });
    }

    test(`${framework} ${direction}: requestFocus reports whether it found a place to focus`, async ({
      page,
    }) => {
      await openChat(page, framework, direction);
      await page.evaluate(() => {
        const button = document.createElement('button');
        button.textContent = 'Page control';
        document.body.prepend(button);
      });
      const pageControl = page.getByRole('button', {
        name: 'Page control',
        exact: true,
      });
      await pageControl.focus();
      expect(
        await page.evaluate(() => window.chatInstance.requestFocus())
      ).toBe(true);
      await expect(page.getByTestId(PageObjectId.INPUT)).toBeFocused();

      await page.evaluate(() =>
        window.chatInstance.changeView({ mainWindow: false, launcher: true })
      );
      await expect
        .poll(() =>
          page.evaluate(
            () => window.chatInstance.getState().viewState.mainWindow
          )
        )
        .toBe(false);
      await pageControl.focus();
      expect(
        await page.evaluate(() => window.chatInstance.requestFocus())
      ).toBe(false);
      await expect(pageControl).toBeFocused();
    });

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

for (const framework of hosts) {
  test(`${framework}: closing a cover returns focus to a control in user-defined response panel content`, async ({
    page,
  }) => {
    await openChat(page, framework, 'ltr');
    await page.evaluate(
      async ({ ButtonItemType, MessageResponseTypes }) => {
        await window.chatInstance.messaging.addMessage({
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.BUTTON,
                button_type: ButtonItemType.SHOW_PANEL,
                label: 'Open the user-defined panel',
                panel: {
                  title: 'User-defined panel',
                  body: [
                    {
                      response_type: MessageResponseTypes.USER_DEFINED,
                      user_defined: {
                        user_defined_type: 'green',
                        text: 'panel content',
                      },
                    },
                  ],
                },
              },
            ],
          },
        } as never);
      },
      { ButtonItemType, MessageResponseTypes }
    );
    await page
      .getByRole('button', { name: 'Open the user-defined panel', exact: true })
      .click();
    const response = page.locator(
      'cds-aichat-native-panels [data-panel-name="response"]'
    );
    await expect(response).toBeVisible();
    const content = page
      .getByText(/^This is a user_defined response type with external styles/)
      .first();
    await expect(content).toBeVisible();
    // The example content has no control, so add one to its slotted host. The
    // web component example renders its text in its own shadow root.
    await content.evaluate((node) => {
      const root = node.getRootNode();
      const example = root instanceof ShadowRoot ? root.host : node;
      const button = document.createElement('button');
      button.textContent = 'Panel content control';
      example.parentElement!.append(button);
    });
    const control = page.getByRole('button', {
      name: 'Panel content control',
      exact: true,
    });
    await expect(control).toBeVisible();
    await control.focus();
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
    await expect(control).toBeFocused();
  });
}
