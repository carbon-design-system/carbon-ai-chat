/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import {
  ChatInstance,
  PageObjectId,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  byTestId,
  contractChat,
  contractSetup,
  fakeBackend,
  instanceSender,
  startSend,
  finishSend,
} from '../../helpers';

/** The focused element, looking through open shadow roots. */
function deepActiveElement(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/** Whether `node` is `ancestor` or inside it, crossing shadow roots. */
function isWithin(ancestor: Node, node: Node | null): boolean {
  let current: Node | null = node;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parentNode ?? (current as ShadowRoot).host ?? null;
  }
  return false;
}

/** A focusable element of the host page, outside the chat. */
function focusHostButton(): HTMLButtonElement {
  const button = document.createElement('button');
  document.body.appendChild(button);
  button.focus();
  expect(deepActiveElement()).toBe(button);
  return button;
}

async function changeView(
  instance: ChatInstance,
  view: ViewType
): Promise<void> {
  await act(async () => {
    await instance.changeView(view);
  });
}

// @covers instance.requestFocus
describe('requestFocus', () => {
  contractSetup();

  async function mountOpen(): Promise<ChatInstance> {
    const backend = fakeBackend({ autoResolve: true });
    const { instance } = await contractChat({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    return instance;
  }

  it('moves focus into the input while the main window is open', async () => {
    const instance = await mountOpen();
    focusHostButton();
    await act(async () => {
      instance.requestFocus();
    });
    await waitFor(() =>
      expect(isWithin(byTestId(PageObjectId.INPUT), deepActiveElement())).toBe(
        true
      )
    );
  });

  it('returns undefined, even when it moves focus', async () => {
    const instance = await mountOpen();
    focusHostButton();
    let result: boolean | void;
    await act(async () => {
      result = instance.requestFocus();
    });
    // On `main` the JSDoc says it may return true or false (its example shows
    // true); it always returns undefined.
    expect(result).toBeUndefined();
    expect(isWithin(byTestId(PageObjectId.INPUT), deepActiveElement())).toBe(
      true
    );
  });

  it('leaves focus where it is while the main window is closed', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
    });
    const button = focusHostButton();
    await act(async () => {
      instance.requestFocus();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(deepActiveElement()).toBe(button);
  });
});

// @covers state.homeScreenState.showBackToAssistant
describe('home screen back-to-assistant flag', () => {
  contractSetup();

  async function mountWithHomeScreen() {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      homescreen: { isOn: true, greeting: 'Hello' },
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
    });
    return { instance, backend };
  }

  it('is false while the home screen shows on first open', async () => {
    const { instance } = await mountWithHomeScreen();
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(byTestId(PageObjectId.HOME_SCREEN_PANEL)).not.toBeNull();
    expect(instance.getState().homeScreenState).toEqual({
      isHomeScreenOpen: true,
      showBackToAssistant: false,
    });
  });

  it('stays false when a send closes the home screen', async () => {
    const { instance, backend } = await mountWithHomeScreen();
    await changeView(instance, ViewType.MAIN_WINDOW);
    const started = await startSend(instanceSender(instance, backend), 'hi');
    await finishSend(started);
    expect(instance.getState().homeScreenState).toEqual({
      isHomeScreenOpen: false,
      showBackToAssistant: false,
    });
    expect(byTestId(PageObjectId.HOME_SCREEN_PANEL)).toBeNull();
  });
});
