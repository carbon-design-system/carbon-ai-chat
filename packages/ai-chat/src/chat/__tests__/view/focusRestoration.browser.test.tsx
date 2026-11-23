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
import { userEvent } from 'vitest/browser';
import Add16 from '@carbon/icons/es/add--large/16.js';

import {
  ButtonItemType,
  ChatInstance,
  MessageResponseTypes,
  PageObjectId,
} from '../../../aiChatEntry';
import {
  DANA,
  accessibleName,
  allByRole,
  byRole,
  byTestId,
  fakeDesk,
  flatParent,
  focusHostButton,
  roleOf,
  shownText,
} from '../helpers/contract';
import { deep, deepAll } from '../helpers/browserPanels';
import { emulateReducedMotion } from '../helpers/browserMedia';
import {
  DIRECTIONS,
  HOSTS,
  FOCUS_WAIT,
  focusSetup,
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

focusSetup();

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
  await expect.poll(() => isVisible(button), FOCUS_WAIT).toBe(true);
  return button;
}

/** Blurs the deepest focused element, so the page body has focus. */
function blurAll() {
  const path = focusPath();
  (path[path.length - 1] as HTMLElement | undefined)?.blur();
  expect(document.activeElement).toBe(document.body);
}

/**
 * Whether `node` shows inside the element `ancestor` slots into its `footer`
 * slot: some element between them in the flat tree is `slot="footer"`.
 */
function inFooterOf(node: Node, ancestor: Element): boolean {
  let footer = false;
  for (let current = node; current; current = flatParent(current)) {
    if (current === ancestor) {
      return footer;
    }
    footer ||=
      current instanceof Element && current.getAttribute('slot') === 'footer';
  }
  return false;
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
  await expect.poll(shownPrompt, FOCUS_WAIT).not.toBeNull();
  const prompt = shownPrompt();
  // The header close shares the decline name; take the visibly labeled one
  // in the prompt's footer.
  const decline = () =>
    allByRole('button', SHARE_DECLINE).find(
      (control) =>
        isVisible(control) &&
        shownText(control).trim() === SHARE_DECLINE &&
        inFooterOf(control, prompt)
    ) ?? null;
  await expect.poll(() => hasFocus(decline()), FOCUS_WAIT).toBe(true);
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
        await expect.poll(() => isVisible(close), FOCUS_WAIT).toBe(false);
        await expect.poll(() => hasFocus(opener), FOCUS_WAIT).toBe(true);
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
        await expect.poll(() => isVisible(prompt), FOCUS_WAIT).toBe(false);
        await expect.poll(() => hasFocus(counter), FOCUS_WAIT).toBe(true);
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
        await expect.poll(() => isVisible(host()), FOCUS_WAIT).toBe(true);
        const button = host().shadowRoot.querySelector('button');
        button.focus();
        await userEvent.keyboard('{Enter}');
        const menu = () =>
          allByRole('menu', ACTIONS_MENU).find(isVisible) ?? null;
        // Every menu with this name in the document, shown or not.
        const menusInDocument = () =>
          deepAll('[role]').filter(
            (element) =>
              roleOf(element) === 'menu' &&
              accessibleName(element) === ACTIONS_MENU
          ).length;
        await expect.poll(menu, FOCUS_WAIT).not.toBeNull();
        await userEvent.keyboard('{ArrowDown}');
        await userEvent.keyboard('{Escape}');
        // Escape removes the menu, not only hides it.
        await expect.poll(menusInDocument, FOCUS_WAIT).toBe(0);
        await expect.poll(() => hasFocus(button), FOCUS_WAIT).toBe(true);
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
        await expect.poll(() => isVisible(homePanel()), FOCUS_WAIT).toBe(false);
        await userEvent.click(byRole('button', 'Return to the home screen'));
        await expect.poll(() => isVisible(homePanel()), FOCUS_WAIT).toBe(true);
        const back = byRole('button', 'Return to conversation');
        if (keyboard) {
          back.focus();
          await userEvent.keyboard('[Space]');
        } else {
          await userEvent.click(back);
        }
        await expect.poll(() => isVisible(homePanel()), FOCUS_WAIT).toBe(false);
        await expect
          .poll(() => hasFocus(byTestId(PageObjectId.INPUT)), FOCUS_WAIT)
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
      await expect.poll(() => isVisible(close), FOCUS_WAIT).toBe(false);
      await expect
        .poll(() => hasFocus(byTestId(PageObjectId.INPUT)), FOCUS_WAIT)
        .toBe(true);
    });

    it(`${framework} ${direction}: requestFocus reports whether it found a place to focus`, async () => {
      const instance = await openChat(framework, direction);
      const pageControl = focusHostButton();
      let found: boolean | void;
      await act(async () => {
        found = instance.requestFocus();
      });
      expect(found).toBe(true);
      await expect
        .poll(() => hasFocus(byTestId(PageObjectId.INPUT)), FOCUS_WAIT)
        .toBe(true);

      // Close the window it just focused: nothing in it can take focus now.
      await act(() =>
        instance.changeView({ mainWindow: false, launcher: true })
      );
      await expect
        .poll(() => instance.getState().viewState.mainWindow, FOCUS_WAIT)
        .toBe(false);
      pageControl.focus();
      await act(async () => {
        found = instance.requestFocus();
      });
      expect(found).toBe(false);
      expect(hasFocus(pageControl)).toBe(true);
    });
  }
}

// Reduced motion is a media feature, so the page itself reports it.
it('reduced motion: closing a custom panel from its content returns focus to the opener', async () => {
  await emulateReducedMotion('reduce');
  try {
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
    await expect.poll(() => isVisible(close), FOCUS_WAIT).toBe(false);
    await expect.poll(() => hasFocus(opener), FOCUS_WAIT).toBe(true);
  } finally {
    await emulateReducedMotion(null);
  }
});

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
    // The response panel shows, named by its title.
    await expect
      .poll(
        () => allByRole('dialog', 'User-defined panel').find(isVisible) ?? null,
        FOCUS_WAIT
      )
      .not.toBeNull();
    const panelControl = () =>
      allByRole('button', 'Panel content control').find(isVisible) ?? null;
    await expect.poll(panelControl, FOCUS_WAIT).not.toBeNull();
    const shown = panelControl();
    shown.focus();
    expect(hasFocus(shown)).toBe(true);
    // The cover makes the response panel inert, which plays its slide-out.
    // Keep the cover up until that slide-out ends, so the panel is hidden but
    // still open when the cover closes.
    const responsePanel = deep('cds-aichat-panel[data-panel-name="response"]');
    let slidOut = false;
    responsePanel.addEventListener('closeend', (event) => {
      slidOut ||= event.target === responsePanel;
    });
    const prompt = await requestScreenShare(desk);
    await expect.poll(() => slidOut, FOCUS_WAIT).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => isVisible(prompt), FOCUS_WAIT).toBe(false);
    // The panel shows its content again, with focus back on its control.
    await expect.poll(() => isVisible(shown), FOCUS_WAIT).toBe(true);
    expect(shownText(responsePanel)).toContain('panel content');
    await expect.poll(() => hasFocus(shown), FOCUS_WAIT).toBe(true);
  });
}
