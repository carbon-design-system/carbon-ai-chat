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
  BusEventType,
  ChatInstance,
  KeyboardShortcuts,
  PageObjectId,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  byRole,
  byTestId,
  changeView,
  contractChat,
  contractSetup,
  deepActiveElement,
  focusHostButton,
  isShownWithin,
  pause,
  textResponse,
} from '../../helpers';

/** Whether focus is in the chat's input field. */
function focusIsInInput(): boolean {
  const input = byTestId(PageObjectId.INPUT);
  return input !== null && isShownWithin(deepActiveElement(), input);
}

// @covers config.shouldTakeFocusIfOpensAutomatically config.openChatByDefault
describe('shouldTakeFocusIfOpensAutomatically', () => {
  contractSetup();

  it('moves focus into the input when the chat opens by default', async () => {
    await contractChat({
      messaging: { skipWelcome: true },
      openChatByDefault: true,
    });
    await waitFor(() => expect(focusIsInInput()).toBe(true));
  });

  it('leaves focus outside the chat when false and the chat opens by default', async () => {
    const button = focusHostButton();
    await contractChat({
      messaging: { skipWelcome: true },
      openChatByDefault: true,
      shouldTakeFocusIfOpensAutomatically: false,
    });
    await pause(100);
    expect(deepActiveElement()).toBe(button);
  });

  it('leaves focus outside the chat when false and a view:pre:change handler delays the default open', async () => {
    const button = focusHostButton();
    await contractChat({
      messaging: { skipWelcome: true },
      openChatByDefault: true,
      shouldTakeFocusIfOpensAutomatically: false,
      onBeforeRender: (instance) => {
        instance.on({
          type: BusEventType.VIEW_PRE_CHANGE,
          handler: () => pause(50),
        });
      },
    });
    await pause(150);
    expect(deepActiveElement()).toBe(button);
  });

  it('moves focus into the input on a changeView open by default', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
    });
    focusHostButton();
    await changeView(instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(focusIsInInput()).toBe(true));
  });

  // MAIN-NOTES M55 (2.0.0): false blocks the shared focus manager in 1.x.
  it('leaves focus outside on a changeView open when false', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
      shouldTakeFocusIfOpensAutomatically: false,
    });
    const button = focusHostButton();
    await changeView(instance, ViewType.MAIN_WINDOW);
    await pause(100);
    expect(deepActiveElement()).toBe(button);
    expect(focusIsInInput()).toBe(false);
  });

  it('returns false and leaves focus outside on requestFocus when false', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
      shouldTakeFocusIfOpensAutomatically: false,
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    const button = focusHostButton();
    let result: boolean | void;
    await act(async () => {
      result = instance.requestFocus();
    });
    expect(result).toBe(false);
    await pause(100);
    expect(deepActiveElement()).toBe(button);
    expect(focusIsInInput()).toBe(false);
  });

  it('keeps requestFocus blocked after the chat opens by default when false', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
      openChatByDefault: true,
      shouldTakeFocusIfOpensAutomatically: false,
    });
    const button = focusHostButton();
    await pause(100);
    expect(deepActiveElement()).toBe(button);
    let result: boolean | void;
    await act(async () => {
      result = instance.requestFocus();
    });
    expect(result).toBe(false);
    await pause(100);
    expect(deepActiveElement()).toBe(button);
    expect(focusIsInInput()).toBe(false);
  });

  it('leaves outside focus in place when a custom panel closes with the flag false', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
      openChatByDefault: true,
      shouldTakeFocusIfOpensAutomatically: false,
    });
    const panel = instance.customPanels.getPanel();
    await act(async () => panel.open());
    expect(instance.state.get().customPanels.default.isOpen).toBe(true);
    const button = focusHostButton();
    await act(async () => panel.close());
    expect(instance.state.get().customPanels.default.isOpen).toBe(false);
    await pause(100);
    expect(deepActiveElement()).toBe(button);
    expect(focusIsInInput()).toBe(false);
  });
});

// Names the tests set through `strings` and `assistantName`, so the message
// a shortcut moves focus to is found by a name they own.
const STRINGS = { messages_assistantSaid: 'Reply from {assistantName}' };
const REPLY_NAME = 'Reply from Contract bot Hi';

/**
 * Mounts an open chat with one reply and these shortcuts, with focus in the
 * input.
 */
async function openWithReply(
  keyboardShortcuts?: KeyboardShortcuts
): Promise<ChatInstance> {
  const { instance } = await contractChat({
    messaging: { skipWelcome: true },
    assistantName: 'Contract bot',
    strings: STRINGS,
    keyboardShortcuts,
  });
  await changeView(instance, ViewType.MAIN_WINDOW);
  await act(() => instance.messaging.addMessage(textResponse('Hi', 'r1')));
  await act(async () => {
    instance.requestFocus();
  });
  await waitFor(() => expect(focusIsInInput()).toBe(true));
  return instance;
}

/** Presses a key on the focused element, the way a user would. */
async function press(init: KeyboardEventInit): Promise<void> {
  await act(async () => {
    deepActiveElement().dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, ...init })
    );
  });
}

const F6 = { key: 'F6', code: 'F6' };

// @covers config.keyboardShortcuts config.keyboardShortcuts.messageFocusToggle
describe('keyboardShortcuts.messageFocusToggle', () => {
  contractSetup();

  it('does nothing by default', async () => {
    await openWithReply();
    await press(F6);
    await pause(100);
    expect(focusIsInInput()).toBe(true);
  });

  it('moves focus from the input to the last message with isOn, and back', async () => {
    await openWithReply({ messageFocusToggle: { isOn: true } });
    await press(F6);
    await waitFor(() =>
      expect(deepActiveElement()).toBe(byRole('button', REPLY_NAME))
    );
    expect(
      isShownWithin(deepActiveElement(), byTestId(PageObjectId.MAIN_PANEL))
    ).toBe(true);
    await press(F6);
    await waitFor(() => expect(focusIsInInput()).toBe(true));
  });

  it('does nothing with key or modifiers set but isOn unset', async () => {
    await openWithReply({
      messageFocusToggle: { key: 'm', modifiers: { ctrl: true } },
    });
    await press({ key: 'm', code: 'KeyM', ctrlKey: true });
    await pause(100);
    expect(focusIsInInput()).toBe(true);
  });

  it('uses the configured key and modifiers in place of F6', async () => {
    await openWithReply({
      messageFocusToggle: { isOn: true, key: 'm', modifiers: { ctrl: true } },
    });
    await press(F6);
    await pause(100);
    expect(focusIsInInput()).toBe(true);
    await press({ key: 'm', code: 'KeyM', ctrlKey: true });
    await waitFor(() =>
      expect(deepActiveElement()).toBe(byRole('button', REPLY_NAME))
    );
  });

  it('does not match when an unset modifier is held', async () => {
    await openWithReply({
      messageFocusToggle: { isOn: true, key: 'm', modifiers: { ctrl: true } },
    });
    await press({ key: 'm', code: 'KeyM', ctrlKey: true, shiftKey: true });
    await pause(100);
    expect(focusIsInInput()).toBe(true);
  });

  it('matches the key case-insensitively', async () => {
    await openWithReply({ messageFocusToggle: { isOn: true, key: 'f6' } });
    await press(F6);
    await waitFor(() =>
      expect(deepActiveElement()).toBe(byRole('button', REPLY_NAME))
    );
  });
});
