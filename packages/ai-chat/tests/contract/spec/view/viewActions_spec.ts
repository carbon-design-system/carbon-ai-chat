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
  byRole,
  byTestId,
  changeView,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  finishSend,
  instanceSender,
  isShownWithin,
  pause,
  startSend,
} from '../../helpers';

/** The focused element, looking through open shadow roots. */
function deepActiveElement(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/** A focusable element of the host page, outside the chat. */
function focusHostButton(): HTMLButtonElement {
  const button = document.createElement('button');
  document.body.appendChild(button);
  button.focus();
  expect(deepActiveElement()).toBe(button);
  return button;
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
      expect(
        isShownWithin(deepActiveElement(), byTestId(PageObjectId.INPUT))
      ).toBe(true)
    );
  });

  it('returns undefined while the main window is open', async () => {
    const instance = await mountOpen();
    focusHostButton();
    let result: boolean | void;
    await act(async () => {
      result = instance.requestFocus();
    });
    // `main` differs from its JSDoc, which says it may return true or false
    // and shows true in its example (MAIN-NOTES M28).
    expect(result).toBeUndefined();
  });

  it('leaves focus where it is while the main window is closed', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
    });
    const button = focusHostButton();
    await act(async () => {
      instance.requestFocus();
    });
    await pause();
    expect(deepActiveElement()).toBe(button);
  });
});

// Copy the tests set through `strings`, so they find controls by an accessible
// name they own rather than by the chat's default text.
const STRINGS = {
  homeScreen_returnToHome: 'Contract back to home',
  homeScreen_returnToAssistant: 'Contract back to conversation',
};

// @covers state.homeScreenState.showBackToAssistant
// @covers state.homeScreenState.isHomeScreenOpen config.homescreen.isOn
describe('home screen back-to-assistant flag', () => {
  contractSetup();

  async function mountWithHomeScreen() {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      homescreen: { isOn: true, greeting: 'Hello' },
      strings: STRINGS,
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

  it('turns true when the user goes back to the home screen from a conversation, and the home screen offers the way back', async () => {
    const { instance, backend } = await mountWithHomeScreen();
    await changeView(instance, ViewType.MAIN_WINDOW);
    await finishSend(await startSend(instanceSender(instance, backend), 'hi'));
    await click(byRole('button', STRINGS.homeScreen_returnToHome));
    await waitFor(() =>
      expect(instance.getState().homeScreenState).toEqual({
        isHomeScreenOpen: true,
        showBackToAssistant: true,
      })
    );
    expect(byTestId(PageObjectId.HOME_SCREEN_PANEL)).not.toBeNull();

    await click(byRole('button', STRINGS.homeScreen_returnToAssistant));
    await waitFor(() =>
      expect(instance.getState().homeScreenState.isHomeScreenOpen).toBe(false)
    );
    expect(byTestId(PageObjectId.HOME_SCREEN_PANEL)).toBeNull();
  });
});
