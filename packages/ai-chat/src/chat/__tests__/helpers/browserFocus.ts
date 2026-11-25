/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mounts and focus reads for browser tests of where the chat moves focus.
 * Each case runs on a React host and an element host, as a page would use
 * them, in a real browser with real layout and focus.
 */

import { page } from 'vitest/browser';

import { ChatInstance, PageObjectId, PublicConfig } from '../../../aiChatEntry';
import {
  byTestId,
  contractChat,
  contractElement,
  contractSetup,
  fakeBackend,
} from './contract';
import { isVisible } from './browserPanels';

export { isVisible };

/** The two hosts each case runs on. */
export const HOSTS = ['react', 'web-component'] as const;

/** The two document directions each case runs in. */
export const DIRECTIONS = ['ltr', 'rtl'] as const;

type Host = (typeof HOSTS)[number];
type Direction = (typeof DIRECTIONS)[number];

/**
 * Every element on the focus path: the document's active element, then each
 * open shadow root's active element below it. An element has focus, as a
 * user sees it, when it is on this path.
 */
export function focusPath(): Element[] {
  const path: Element[] = [];
  for (
    let active: Element | null = document.activeElement;
    active;
    active = active.shadowRoot?.activeElement ?? null
  ) {
    path.push(active);
  }
  return path;
}

/** Whether `element` is on the focus path. */
export function hasFocus(element: Element | null): boolean {
  return element !== null && focusPath().includes(element);
}

/**
 * How long a focus wait may take: the 5 seconds the demo's waits allowed. An
 * animated close and the overflow row's measure can outlast the 1 second
 * default under a loaded machine.
 */
export const FOCUS_WAIT = { timeout: 5000 };

/**
 * Mounts the chat open on `host`: `ChatContainer` for `react`, and a sized
 * `cds-aichat-custom-element` for `web-component`, with a backend that answers
 * each send at once unless `config.messaging` names one. It sets the document
 * direction first, then waits until the opening panel shows and, on the main
 * panel, until the chat's own open focus has landed in the input, so a test's
 * own focus can't race it.
 */
export async function openChat(
  host: Host,
  direction: Direction,
  config: PublicConfig & Record<string, unknown> = {}
): Promise<ChatInstance> {
  document.documentElement.dir = direction;
  const merged = {
    launcher: { isOn: false },
    openChatByDefault: true,
    ...config,
    messaging: {
      skipWelcome: true,
      customSendMessage: fakeBackend({ autoResolve: true }).customSendMessage,
      ...config.messaging,
    },
  };
  const { instance } =
    host === 'react'
      ? await contractChat(merged)
      : await contractElement('cds-aichat-custom-element', {
          properties: merged,
          // A page sizes this host with its own CSS, as a sidebar would.
          attributes: { style: 'display: block; width: 360px; height: 600px' },
        });
  const homescreen = (config.homescreen as { isOn?: boolean })?.isOn;
  await expect
    .poll(
      () =>
        isVisible(
          byTestId(
            homescreen
              ? PageObjectId.HOME_SCREEN_PANEL
              : PageObjectId.MAIN_PANEL
          )
        ),
      FOCUS_WAIT
    )
    .toBe(true);
  if (!homescreen) {
    await expect
      .poll(() => hasFocus(byTestId(PageObjectId.INPUT)), FOCUS_WAIT)
      .toBe(true);
  }
  return instance;
}

/**
 * Setup for a focus file. It mounts and unmounts the chat once before the
 * first case, so the first case's focus waits don't also wait out the chat's
 * cold load. After each case it unmounts, empties the document and storage,
 * and puts back the direction and page size a case may have changed.
 */
export function focusSetup(): void {
  contractSetup();
  afterEach(async () => {
    document.documentElement.removeAttribute('dir');
    await page.viewport(800, 600);
  });
}
