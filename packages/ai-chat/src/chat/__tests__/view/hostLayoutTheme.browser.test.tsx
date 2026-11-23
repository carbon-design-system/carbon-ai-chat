/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Real message geometry and painted theme transitions in a React host. The
 * width of a preview card and the color a theme paints come from the
 * browser's layout and cascade, which only a real browser computes.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { page, type Locator } from 'vitest/browser';

import { ChatContainer } from '../../../react/ChatContainer';
import type { ChatContainerProps } from '../../../types/component/ChatContainer';
import type { ChatInstance } from '../../../types/instance/ChatInstance';
import { CarbonTheme } from '../../../types/config/CarbonTheme';
import {
  ButtonItemType,
  MessageResponseTypes,
  type MessageResponse,
} from '../../../types/messaging/Messages';
import { PageObjectId } from '../../../testing/PageObjectId';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../helpers/chat';
import { untilCalled } from '../helpers/waits';

const THEME_ACTION = 'Inspect the host theme';
const FIRST_COLOR = 'rgb(18, 52, 86)';
const SECOND_COLOR = 'rgb(101, 67, 33)';
const HOST_TOKENS = ['--cds-background', '--cds-button-primary'];

// The card shows the source's host name, so the long URL carries a long,
// unbroken host name as well as a long path. A browser breaks neither.
const LONG_SOURCE = `https://${Array.from({ length: 8 }, () =>
  'unbroken'.repeat(7)
).join('.')}.example/${'unbroken'.repeat(160)}`;

interface Host {
  instance: ChatInstance;
  before: ReturnType<typeof vi.fn>;
  /** Merges `next` into the props, as the demo's `setChatConfig` does. */
  update: (next: Partial<ChatContainerProps>) => Promise<void>;
}

/** Mounts a float `ChatContainer`, open, with no backend reply. */
async function mount(initial: Partial<ChatContainerProps>): Promise<Host> {
  let instance: ChatInstance;
  const before = vi.fn((chat: ChatInstance) => {
    instance = chat;
  });
  const after = vi.fn();
  let props: Partial<ChatContainerProps> = {
    ...createBaseConfig(),
    aiEnabled: false,
    messaging: { skipWelcome: true, customSendMessage: () => undefined },
    ...initial,
  };
  const tree = () => (
    <ChatContainer {...props} onBeforeRender={before} onAfterRender={after} />
  );
  const view = render(tree());
  await untilCalled(after);
  await expect.element(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();
  return {
    instance,
    before,
    update: async (next) => {
      props = { ...props, ...next };
      await act(async () => {
        view.rerender(tree());
      });
      await expect.poll(() => instance.getState().status).toBe('ready');
      await expect
        .element(page.getByTestId(PageObjectId.MAIN_PANEL))
        .toBeVisible();
    },
  };
}

/** A box that has stopped moving for two frames. */
async function measuredBox(locator: Locator) {
  await expect.element(locator).toBeVisible();
  const element = locator.element();
  await document.fonts.ready;
  let box: DOMRect;
  await expect
    .poll(async () => {
      const first = element.getBoundingClientRect();
      for (let frame = 0; frame < 2; frame++) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve())
        );
      }
      const second = element.getBoundingClientRect();
      const stable =
        second.width > 0 &&
        second.height > 0 &&
        (['left', 'right', 'top', 'width', 'height'] as const).every(
          (key) => Math.abs(second[key] - first[key]) < 0.5
        );
      if (stable) {
        box = second;
      }
      return stable;
    })
    .toBe(true);
  return box;
}

function paintedBackground(locator: Locator): string {
  return getComputedStyle(locator.element()).backgroundColor;
}

/** Adds a URL button, whose fill is Carbon's `button-primary`. */
async function themeAction(instance: ChatInstance): Promise<Locator> {
  const response: MessageResponse = {
    id: 'host-theme-action',
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.BUTTON,
          button_type: ButtonItemType.URL,
          label: THEME_ACTION,
          url: `${location.origin}/owned-theme-action`,
        },
      ],
    },
  };
  await act(() => instance.messaging.addMessage(response));
  const action = page.getByRole('button', { name: THEME_ACTION });
  await expect.element(action).toBeVisible();
  await expect
    .poll(() => paintedBackground(action))
    .not.toBe('rgba(0, 0, 0, 0)');
  return action;
}

/** Sets the host page's own Carbon tokens on the document root. */
function hostColors(background: string, button: string) {
  document.documentElement.style.setProperty('--cds-background', background);
  document.documentElement.style.setProperty('--cds-button-primary', button);
}

beforeEach(async () => {
  setupBeforeEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
  await page.viewport(1280, 900);
});

afterEach(async () => {
  setupAfterEach();
  [...HOST_TOKENS, '--cds-text-primary'].forEach((token) =>
    document.documentElement.style.removeProperty(token)
  );
  window.sessionStorage.clear();
  window.localStorage.clear();
  await page.viewport(800, 600);
});

describe('host layout and theme', () => {
  it('a long iframe preview URL stays as contained as a short preview', async () => {
    const { instance } = await mount({
      openChatByDefault: true,
      layout: { customProperties: { width: '600px' } },
    });
    await act(() =>
      instance.messaging.addMessage({
        id: 'host-frame-contrast',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.IFRAME,
              title: 'Layout short frame',
              source: `${location.origin}/owned-frame`,
            },
            {
              response_type: MessageResponseTypes.IFRAME,
              title: 'Layout long frame',
              source: LONG_SOURCE,
            },
          ],
        },
      })
    );
    const short = await measuredBox(
      page.getByRole('button', { name: /Layout short frame/ })
    );
    const long = await measuredBox(
      page.getByRole('button', { name: /Layout long frame/ })
    );
    const panelLocator = page.getByTestId(PageObjectId.MAIN_PANEL);
    const panel = await measuredBox(panelLocator);
    expect(Math.abs(long.width - short.width)).toBeLessThanOrEqual(1);
    expect(long.left).toBeGreaterThanOrEqual(panel.left - 1);
    expect(long.right).toBeLessThanOrEqual(panel.right + 1);
    const panelElement = panelLocator.element();
    expect(panelElement.scrollWidth <= panelElement.clientWidth + 1).toBe(true);
  });

  it('a configured Carbon token override paints the action while its theme stays forced', async () => {
    hostColors('#ffffff', '#654321');
    document.documentElement.style.setProperty('--cds-text-primary', '#765432');
    const config: Partial<ChatContainerProps> = {
      namespace: 'host-forced-override',
      openChatByDefault: true,
      injectCarbonTheme: CarbonTheme.G100,
      layout: { customProperties: { width: '600px' } },
    };
    const host = await mount(config);
    const action = await themeAction(host.instance);
    const text = 'Forced theme foreground witness';
    await act(() =>
      host.instance.messaging.addMessage({
        id: 'host-forced-text',
        output: {
          generic: [{ response_type: MessageResponseTypes.TEXT, text }],
        },
      })
    );
    const foreground = page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText(text, { exact: true });
    await expect.element(foreground).toBeVisible();
    const textColor = () => getComputedStyle(foreground.element()).color;

    const before = paintedBackground(action);
    const forcedText = textColor();
    // The forced theme, not the host's own token, paints the text.
    expect(forcedText).not.toBe('rgb(118, 84, 50)');
    expect(forcedText).not.toBe('rgba(0, 0, 0, 0)');
    expect(before).not.toBe(SECOND_COLOR);
    expect(before).not.toBe(FIRST_COLOR);

    await host.update({
      ...config,
      layout: {
        customProperties: { width: '600px', '$button-primary': '#123456' },
      },
    });
    await expect.poll(() => paintedBackground(action)).toBe(FIRST_COLOR);
    await expect.poll(textColor).toBe(forcedText);
    // The same chat took the update; it did not remount.
    expect(host.before).toHaveBeenCalledTimes(1);
    expect(host.before.mock.calls[0][0]).toBe(host.instance);
    expect(paintedBackground(action)).not.toBe(before);
  });

  it('an explicit-to-null update inherits two host colors on the same chat', async () => {
    hostColors('#ffffff', '#123456');
    const config: Partial<ChatContainerProps> = {
      namespace: 'host-theme-inherit',
      openChatByDefault: true,
      injectCarbonTheme: CarbonTheme.G90,
      layout: { customProperties: { width: '600px' } },
    };
    const host = await mount(config);
    const action = await themeAction(host.instance);
    expect(paintedBackground(action)).not.toBe(FIRST_COLOR);

    // An explicit null at the public JS boundary, which the type leaves out.
    await host.update({
      ...config,
      injectCarbonTheme: null as unknown as CarbonTheme,
    });
    await expect.poll(() => paintedBackground(action)).toBe(FIRST_COLOR);
    expect(host.before).toHaveBeenCalledTimes(1);

    hostColors('#161616', '#654321');
    await expect.poll(() => paintedBackground(action)).toBe(SECOND_COLOR);

    await host.update({ header: { title: 'Inherited theme remains live' } });
    await expect
      .element(
        page
          .getByTestId(PageObjectId.CHAT_HEADER)
          .getByTestId(PageObjectId.HEADER_TITLE)
      )
      .toHaveTextContent(/^\s*Inherited theme remains live\s*$/);
    await expect.poll(() => paintedBackground(action)).toBe(SECOND_COLOR);
    expect(host.before).toHaveBeenCalledTimes(1);
    expect(host.before.mock.calls[0][0]).toBe(host.instance);
  });
});
