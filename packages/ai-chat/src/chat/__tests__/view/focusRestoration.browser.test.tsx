/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act } from '@testing-library/react';
import { cdp, server, userEvent } from 'vitest/browser';
import Add16 from '@carbon/icons/es/add--large/16.js';
// Types `cdp()` with Playwright's session methods.
import type {} from '@vitest/browser-playwright';

import {
  ButtonItemType,
  ChatInstance,
  MessageResponseTypes,
  PageObjectId,
} from '../../../aiChatEntry';
import {
  DANA,
  allByRole,
  byRole,
  byTestId,
  fakeDesk,
  shownText,
} from '../helpers/contract';
import {
  DIRECTIONS,
  HOSTS,
  cleanupChat,
  focusPath,
  hasFocus,
  isVisible,
  openChat,
} from '../helpers/browserFocus';

/**
 * Where focus goes when a chat surface closes. Each case runs on both hosts
 * (React `ChatContainer` and `cds-aichat-custom-element`) and in both
 * directions.
 */

const CLOSE_CHAT = 'Close the chat window';
const SHARE_TITLE = 'Share your screen with the agent?';
const SHARE_DECLINE = 'Keep the screen private';
const ACTIONS_MENU = 'Focus actions';

afterEach(cleanupChat);

/** Opens the custom panel with one button in its slotted content. */
async function openCustomPanel(
  instance: ChatInstance,
  label: string,
  disableAnimation: boolean,
  closesPanel: boolean
): Promise<HTMLButtonElement> {
  const panel = instance.customPanels.getPanel();
  const button = document.createElement('button');
  button.textContent = label;
  if (closesPanel) {
    button.addEventListener('click', () => panel.close());
  }
  instance.writeableElements.customPanelElement.replaceChildren(button);
  await act(async () => {
    panel.open({ title: 'Focus proof', disableAnimation });
  });
  await expect.poll(() => isVisible(button)).toBe(true);
  return button;
}

/** Blurs the deepest focused element, so the page body has focus. */
function blurAll() {
  const path = focusPath();
  (path[path.length - 1] as HTMLElement | undefined)?.blur();
  expect(document.activeElement).toBe(document.body);
}

/** Config for a chat whose service desk can ask to share the screen. */
function screenShareConfig() {
  const desk = fakeDesk();
  return {
    desk,
    config: {
      serviceDeskFactory: desk.factory,
      strings: {
        agent_sharingRequestTitle: SHARE_TITLE,
        agent_sharingDeclineButton: SHARE_DECLINE,
      },
    },
  };
}

/** Connects a human agent, the state a screen share request needs. */
async function joinAgent(
  instance: ChatInstance,
  desk: ReturnType<typeof fakeDesk>
) {
  await act(() => instance.serviceDesk.startConversation());
  await act(() => desk.callback().agentJoined(DANA));
}

/**
 * Has the agent ask to share the screen, which opens the consent prompt over
 * every panel, and returns its footer Decline control once it has focus.
 */
async function requestScreenShare(desk: ReturnType<typeof fakeDesk>) {
  void desk.callback().screenShareRequest();
  const shownPrompt = () =>
    allByRole('dialog', SHARE_TITLE).find(isVisible) ?? null;
  await expect.poll(shownPrompt).not.toBeNull();
  const prompt = shownPrompt();
  // The header close shares the decline name; take the visibly labeled one.
  const decline = () =>
    allByRole('button', SHARE_DECLINE).find(
      (control) =>
        isVisible(control) && shownText(control).trim() === SHARE_DECLINE
    ) ?? null;
  await expect.poll(() => hasFocus(decline())).toBe(true);
  return prompt;
}

for (const framework of HOSTS) {
  for (const direction of DIRECTIONS) {
    for (const disableAnimation of [false, true]) {
      const animation = disableAnimation ? 'animation off' : 'animation on';

      it(`${framework} ${direction} ${animation}: closing a custom panel from its content returns focus to the opener`, async () => {
        const instance = await openChat(framework, direction);
        const opener = byRole('button', CLOSE_CHAT);
        opener.focus();
        const close = await openCustomPanel(
          instance,
          'Close from content',
          disableAnimation,
          true
        );
        close.focus();
        await userEvent.keyboard('{Enter}');
        await expect.poll(() => isVisible(close)).toBe(false);
        await expect.poll(() => hasFocus(opener)).toBe(true);
      });

      it(`${framework} ${direction} ${animation}: closing a cover returns focus to the covered panel's control`, async () => {
        const { desk, config } = screenShareConfig();
        const instance = await openChat(framework, direction, config);
        await joinAgent(instance, desk);
        const counter = await openCustomPanel(
          instance,
          'Panel counter',
          disableAnimation,
          false
        );
        counter.focus();
        const prompt = await requestScreenShare(desk);
        await userEvent.keyboard('{Escape}');
        await expect.poll(() => isVisible(prompt)).toBe(false);
        await expect.poll(() => hasFocus(counter)).toBe(true);
      });
    }
  }
}

for (const framework of HOSTS) {
  for (const direction of DIRECTIONS) {
    for (const expanded of [false, true]) {
      const trigger = expanded ? 'expanded overflow' : 'compact';

      it(`${framework} ${direction}: Escape in the ${trigger} input-actions menu returns focus to its trigger`, async () => {
        const actions = Array.from(
          { length: expanded ? 12 : 2 },
          (_, index) => ({
            id: `focus-action-${index}`,
            text: `Action ${index + 1}`,
            testId: `focus-action-${index}`,
            icon: Add16,
            onClick: () => {},
          })
        );
        await openChat(framework, direction, {
          input: { expanded, actions },
          strings: {
            input_actionsMenuLabel: ACTIONS_MENU,
            input_actionsOverflowLabel: ACTIONS_MENU,
          },
        });
        const host = () =>
          byTestId(
            expanded
              ? 'cds-aichat-input-actions-overflow-trigger'
              : 'cds-aichat-input-actions-trigger'
          );
        // The expanded row measures its actions before the overflow trigger
        // shows, so wait for real layout to show it.
        await expect.poll(() => isVisible(host())).toBe(true);
        const button = host().shadowRoot.querySelector('button');
        button.focus();
        await userEvent.keyboard('{Enter}');
        const menu = () =>
          allByRole('menu', ACTIONS_MENU).find(isVisible) ?? null;
        await expect.poll(menu).not.toBeNull();
        await userEvent.keyboard('{ArrowDown}');
        await userEvent.keyboard('{Escape}');
        await expect.poll(menu).toBeNull();
        await expect.poll(() => hasFocus(button)).toBe(true);
      });
    }

    for (const keyboard of [false, true]) {
      it(`${framework} ${direction}: Return to conversation by ${keyboard ? 'keyboard' : 'mouse'} focuses the input`, async () => {
        await openChat(framework, direction, {
          homescreen: {
            isOn: true,
            greeting: 'Choose a topic',
            starters: {
              isOn: true,
              buttons: [{ label: 'Start conversation' }],
            },
          },
        });
        const homePanel = () => byTestId(PageObjectId.HOME_SCREEN_PANEL);
        await userEvent.click(byRole('button', 'Start conversation'));
        await expect.poll(() => isVisible(homePanel())).toBe(false);
        await userEvent.click(byRole('button', 'Return to the home screen'));
        await expect.poll(() => isVisible(homePanel())).toBe(true);
        const back = byRole('button', 'Return to conversation');
        if (keyboard) {
          back.focus();
          await userEvent.keyboard('[Space]');
        } else {
          await userEvent.click(back);
        }
        await expect.poll(() => isVisible(homePanel())).toBe(false);
        await expect
          .poll(() => hasFocus(byTestId(PageObjectId.INPUT)))
          .toBe(true);
      });
    }

    it(`${framework} ${direction}: closing a panel opened with nothing focused focuses the input`, async () => {
      const instance = await openChat(framework, direction);
      blurAll();
      const close = await openCustomPanel(
        instance,
        'Close from content',
        true,
        true
      );
      close.focus();
      await userEvent.keyboard('{Enter}');
      await expect.poll(() => isVisible(close)).toBe(false);
      await expect
        .poll(() => hasFocus(byTestId(PageObjectId.INPUT)))
        .toBe(true);
    });
  }
}

// Reduced motion is a media feature, so the page itself must report it. Only
// Chromium exposes the protocol call that emulates it.
it.runIf(server.browser === 'chromium')(
  'reduced motion: closing a custom panel from its content returns focus to the opener',
  async () => {
    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    try {
      expect(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ).toBe(true);
      const instance = await openChat('react', 'ltr');
      const opener = byRole('button', CLOSE_CHAT);
      opener.focus();
      const close = await openCustomPanel(
        instance,
        'Close from content',
        false,
        true
      );
      close.focus();
      await userEvent.keyboard('{Enter}');
      await expect.poll(() => isVisible(close)).toBe(false);
      await expect.poll(() => hasFocus(opener)).toBe(true);
    } finally {
      await cdp().send('Emulation.setEmulatedMedia', { features: [] });
    }
  }
);

for (const framework of HOSTS) {
  it(`${framework}: closing a cover returns focus to a control in user-defined response panel content`, async () => {
    const { desk, config } = screenShareConfig();
    // Each host's own user-defined renderer: React nodes for the React host,
    // an element for the element host. The content carries one control.
    const renderUserDefinedResponse =
      framework === 'react'
        ? () => (
            <div>
              panel content
              <button type="button">Panel content control</button>
            </div>
          )
        : () => {
            const content = document.createElement('div');
            const control = document.createElement('button');
            control.textContent = 'Panel content control';
            content.append('panel content', control);
            return content;
          };
    const instance = await openChat(framework, 'ltr', {
      ...config,
      renderUserDefinedResponse,
    });
    await joinAgent(instance, desk);
    await act(() =>
      instance.messaging.addMessage({
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
      } as never)
    );
    await userEvent.click(byRole('button', 'Open the user-defined panel'));
    const panelControl = () =>
      allByRole('button', 'Panel content control').find(isVisible) ?? null;
    await expect.poll(panelControl).not.toBeNull();
    const shown = panelControl();
    shown.focus();
    expect(hasFocus(shown)).toBe(true);
    const prompt = await requestScreenShare(desk);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => isVisible(prompt)).toBe(false);
    await expect.poll(() => hasFocus(shown)).toBe(true);
  });
}
