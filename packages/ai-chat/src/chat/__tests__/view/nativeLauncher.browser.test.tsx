/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { userEvent } from 'vitest/browser';

import { PageObjectId } from '../../../testing/PageObjectId';
import {
  allByRole,
  byTestId,
  contractSetup,
  getByTestId,
  isShownWithin,
} from '../helpers/contract';
import {
  deep,
  deepActive,
  isVisible,
  mountPanelHost,
  type HostFramework,
} from '../helpers/browserPanels';
import { emulateReducedMotion } from '../helpers/browserMedia';

const AVATAR =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24"/%3E';

/**
 * The greeting expands after the configured 1000 ms, and its open settles up
 * to 600 ms later without an animation event: longer than waitFor's default.
 */
const EXPAND_WAIT = { timeout: 3000 };

function launcher(): HTMLElement {
  return getByTestId(PageObjectId.LAUNCHER);
}

function launcherButton(): HTMLElement {
  const element = launcher();
  return element.shadowRoot?.querySelector('button') ?? element;
}

function editorFocused(): boolean {
  return deepActive() === byTestId(PageObjectId.INPUT);
}

function mainPanelShown(): boolean {
  return isVisible(byTestId(PageObjectId.MAIN_PANEL));
}

describe('native launcher', () => {
  contractSetup();
  afterEach(async () => {
    document.documentElement.dir = '';
    await emulateReducedMotion(null);
  });

  for (const framework of ['react', 'web-component'] as HostFramework[]) {
    for (const reducedMotion of ['reduce', 'no-preference'] as const) {
      it(`${framework} launcher keyboard, live config, and ${reducedMotion}`, async () => {
        // The page itself reports the preference, as a user's system would.
        await emulateReducedMotion(reducedMotion);
        document.documentElement.dir = framework === 'react' ? 'ltr' : 'rtl';
        const host = await mountPanelHost(framework, 'float', {
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
        });
        await waitFor(() => expect(isVisible(launcher())).toBe(true));
        expect(launcher().getAttribute('aria-label')).toMatch(/Unread 1/);
        // The launcher's one RTL path picks the tooltip side.
        expect(
          (launcher() as unknown as { tooltipPosition: string }).tooltipPosition
        ).toBe(framework === 'react' ? 'left' : 'right');
        const container = deep('.cds-aichat-launcher', host.root);
        // Record each CSS animation and transition the greeting's expand
        // starts, so the stylesheet's reduced-motion rules show.
        const motion: string[] = [];
        for (const type of ['animationstart', 'transitionrun']) {
          container.addEventListener(type, () => motion.push(type), true);
        }
        if (reducedMotion === 'no-preference') {
          // Suppress completion events to exercise the 600ms fallback.
          for (const type of ['animationend', 'animationcancel']) {
            container.addEventListener(
              type,
              (event) => event.stopPropagation(),
              true
            );
          }
          await waitFor(
            () => expect(container.className).toMatch(/launcher--opening/),
            EXPAND_WAIT
          );
        }
        await waitFor(
          () => expect(container.className).toMatch(/launcher--open(?:\s|$)/),
          EXPAND_WAIT
        );
        await waitFor(() =>
          expect(
            isVisible(
              Array.from(container.querySelectorAll<HTMLElement>('*')).find(
                (node) =>
                  node.children.length === 0 &&
                  node.textContent === 'Launcher greeting proof'
              ) ?? null
            )
          ).toBe(true)
        );

        if (reducedMotion === 'reduce') {
          expect(motion).toEqual([]);
        } else {
          expect(motion.length).toBeGreaterThan(0);
        }

        const dismiss = allByRole(
          'button',
          'Dismiss launcher notification',
          host.root
        );
        expect(dismiss).toHaveLength(1);
        dismiss[0].focus();
        expect(deepActive()).toBe(dismiss[0]);
        await userEvent.keyboard('{Enter}');
        await waitFor(() =>
          expect(container.className).toMatch(/launcher--closed/)
        );
        expect(launcher().getAttribute('aria-label')).toMatch(/Unread 1/);

        await host.update({
          launcher: {
            isOn: true,
            showUnreadIndicator: false,
            desktop: { isOn: false, avatarUrlOverride: AVATAR },
          },
        });
        await waitFor(() =>
          expect(launcher().getAttribute('aria-label')).toBe(
            'Open the chat window'
          )
        );
        expect(launcher().querySelector('img')?.getAttribute('alt')).toBe('');
        launcherButton().focus();
        await userEvent.keyboard('{Enter}');
        await waitFor(() => expect(mainPanelShown()).toBe(true));
        await waitFor(() => expect(editorFocused()).toBe(true));
        await userEvent.click(getByTestId(PageObjectId.CLOSE_CHAT));
        await waitFor(() => expect(mainPanelShown()).toBe(false));
        await waitFor(() => expect(isVisible(launcher())).toBe(true));
        // After a close, focus has left the window: no control a user can see
        // in it keeps focus. Browsers differ on where focus lands when the
        // focused element is hidden: Chromium moves it to the page body, while
        // Firefox and WebKit leave it on the now hidden control. This pins
        // only that focus left the window; it doesn't set a focus policy.
        const chatWindow = byTestId(PageObjectId.CHAT_WIDGET);
        expect(chatWindow).not.toBeNull();
        expect(isVisible(chatWindow)).toBe(false);
        const active = deepActive();
        expect(
          active === document.body ||
            active === host.root.host ||
            (isShownWithin(active, chatWindow) && !isVisible(active))
        ).toBe(true);
        const button = launcherButton();
        button.focus();
        expect(deepActive()).toBe(button);
        await userEvent.keyboard('{Enter}');
        await waitFor(() => expect(mainPanelShown()).toBe(true));
        // Reopening moves automatic focus to the editor once the shell is
        // ready.
        await waitFor(() => expect(editorFocused()).toBe(true));
        await act(async () => {
          host.instance.requestFocus();
        });
        expect(editorFocused()).toBe(true);
        await host.unmount();
      });
    }
  }
});
