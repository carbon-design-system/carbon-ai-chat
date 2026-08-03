/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';
import { fireEvent } from '@testing-library/react';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';
import type { KeyboardShortcuts } from '../../../src/types/config/ShortcutConfig';
import type { AppStore } from '../../../src/chat/store/appStore';
import type { AppState } from '../../../src/types/state/AppState';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { getDeepActiveElement } from '../../../src/chat/utils/domUtils';
import actions from '../../../src/chat/store/actions';

const ANNOUNCEMENT_ID = 'input_keyboardShortcutAnnouncement';

/**
 * The clause the detailed scroll-handle labels gain only while the shortcut is enabled.
 * Its presence is how we assert that what a screen reader is told matches what the
 * keydown handler actually does.
 */
const SHORTCUT_CLAUSE =
  'to toggle between the message list and the input field';

const createTestMessage = (text: string) => ({
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.TEXT,
        text,
      },
    ],
  },
});

interface BootedChat {
  store: AppStore<AppState>;
  serviceManager: ServiceManager;
  root: ShadowRoot;
  /** Carries `containerRef` in `AppShell`, which is where the keydown listener lives. */
  widget: HTMLElement;
  input: HTMLElement;
}

/**
 * Renders an open chat with one message and returns the handles a shortcut test needs.
 *
 * `openChatByDefault` matters: the keydown listener is only attached while the main
 * window is open, so a closed chat can never exercise a shortcut.
 */
async function bootChat(
  messageID?: string,
  keyboardShortcuts?: KeyboardShortcuts
): Promise<BootedChat> {
  const config = createBaseConfig();
  config.openChatByDefault = true;
  if (keyboardShortcuts) {
    config.keyboardShortcuts = keyboardShortcuts;
  }

  const { instance, store, serviceManager } =
    await renderChatAndGetInstanceWithStore(config);
  if (messageID) {
    await instance.messaging.addMessage({
      id: messageID,
      ...createTestMessage('Test message'),
    });
  }

  const root = document.querySelector('cds-aichat-react').shadowRoot;
  const widget = root.querySelector<HTMLElement>('.cds-aichat--widget');
  const input = root.querySelector<HTMLElement>('[data-testid="input_field"]');

  expect(widget).toBeTruthy();
  expect(input).toBeTruthy();

  return { store, serviceManager, root, widget, input };
}

/**
 * Fires a keydown and reports whether a handler claimed it via `preventDefault()`, which
 * `fireEvent` signals by returning `false`.
 *
 * Only sound when fired on `widget` or `input`: the scroll handles run their own
 * `preventDefault` for Enter/Space/Escape, so firing there conflates producers.
 */
function pressKey(
  target: HTMLElement,
  init: Record<string, unknown>
): { handled: boolean } {
  const notPrevented = fireEvent.keyDown(target, { bubbles: true, ...init });
  return { handled: !notPrevented };
}

/**
 * Text of both detailed scroll handles. Asserts the arity so a rendering regression fails
 * loudly instead of turning every `forEach` assertion into a no-op.
 */
function scrollHandleText(root: ShadowRoot): string[] {
  const texts = Array.from(
    root.querySelectorAll('.cds-aichat--messages--scroll-handle-desktop')
  ).map((handle) => handle.textContent ?? '');
  expect(texts).toHaveLength(2);
  return texts;
}

/** Triggers the one-shot first-focus announcement and returns whatever was announced. */
function announceOnInputFocus(chat: BootedChat) {
  fireEvent.focus(chat.input);
  return chat.store.getState().announceMessage;
}

describe('Keyboard Shortcuts', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  describe('Default resolution', () => {
    it('resolves the documented defaults when no config is supplied', async () => {
      const { store } = await bootChat('resolve-1');

      expect(
        store.getState().config.derived.keyboardShortcuts.messageFocusToggle
      ).toEqual({ key: 'F6', modifiers: {}, isOn: false });
    });

    it('fills in missing fields rather than replacing the whole object', async () => {
      const { store } = await bootChat('resolve-2', {
        messageFocusToggle: { key: 'F7', modifiers: {}, isOn: true },
      });

      expect(
        store.getState().config.derived.keyboardShortcuts.messageFocusToggle
      ).toEqual({ key: 'F7', modifiers: {}, isOn: true });
    });

    it('keeps an explicit isOn: false rather than treating it as unset', async () => {
      const { store } = await bootChat('resolve-3', {
        messageFocusToggle: { key: 'F6', modifiers: {}, isOn: false },
      });

      expect(
        store.getState().config.derived.keyboardShortcuts.messageFocusToggle
          .isOn
      ).toBe(false);
    });
  });

  describe('isOn', () => {
    it('is disabled out of the box, and says so consistently', async () => {
      const chat = await bootChat('is-on-1');

      expect(pressKey(chat.widget, { key: 'F6' }).handled).toBe(false);
      scrollHandleText(chat.root).forEach((text) => {
        expect(text).not.toContain(SHORTCUT_CLAUSE);
      });
      expect(announceOnInputFocus(chat)?.messageID).not.toBe(ANNOUNCEMENT_ID);
    });

    it('stays disabled for a partial config that omits isOn', async () => {
      // Regression test: this config used to enable the scroll-handle announcement while
      // leaving the keydown handler switched off, so a screen reader was told to press a
      // key that did nothing.
      const chat = await bootChat('is-on-2', {
        messageFocusToggle: { key: 'F6', modifiers: {} },
      });

      expect(pressKey(chat.widget, { key: 'F6' }).handled).toBe(false);
      scrollHandleText(chat.root).forEach((text) => {
        expect(text).not.toContain(SHORTCUT_CLAUSE);
      });
      expect(announceOnInputFocus(chat)?.messageID).not.toBe(ANNOUNCEMENT_ID);
    });

    it('enables the shortcut, the labels, and the announcement together', async () => {
      const chat = await bootChat('is-on-3', {
        messageFocusToggle: { key: 'F6', modifiers: {}, isOn: true },
      });

      expect(pressKey(chat.widget, { key: 'F6' }).handled).toBe(true);
      scrollHandleText(chat.root).forEach((text) => {
        expect(text).toContain(`Press F6 ${SHORTCUT_CLAUSE}`);
      });
      expect(announceOnInputFocus(chat)).toEqual({
        messageID: ANNOUNCEMENT_ID,
        messageValues: { key: 'F6' },
      });
    });

    it('suppresses the shortcut, the labels, and the announcement together', async () => {
      const chat = await bootChat('is-on-4', {
        messageFocusToggle: { key: 'F6', modifiers: {}, isOn: false },
      });

      expect(pressKey(chat.widget, { key: 'F6' }).handled).toBe(false);
      scrollHandleText(chat.root).forEach((text) => {
        expect(text).not.toContain(SHORTCUT_CLAUSE);
      });
      expect(announceOnInputFocus(chat)?.messageID).not.toBe(ANNOUNCEMENT_ID);
    });
  });

  // `matchesShortcut` itself is unit-tested exhaustively in
  // tests/utils/spec/keyboardUtils_spec.ts. These cases only prove the *resolved* config
  // reaches it, so one positive and one negative are enough.
  describe('Key and modifier matching', () => {
    it('matches a custom key and ignores the default one', async () => {
      const chat = await bootChat('match-1', {
        messageFocusToggle: { key: 'f', modifiers: { ctrl: true }, isOn: true },
      });

      expect(pressKey(chat.widget, { key: 'F6' }).handled).toBe(false);
      expect(pressKey(chat.widget, { key: 'f', ctrlKey: true }).handled).toBe(
        true
      );
    });

    it('does not match when an unconfigured modifier is held', async () => {
      const chat = await bootChat('match-2', {
        messageFocusToggle: { key: 'F6', modifiers: {}, isOn: true },
      });

      expect(pressKey(chat.widget, { key: 'F6', ctrlKey: true }).handled).toBe(
        false
      );
    });
  });

  describe('Focus toggle behavior', () => {
    it('returns focus to the input when focus is elsewhere', async () => {
      const chat = await bootChat('toggle-1', {
        messageFocusToggle: { key: 'F6', modifiers: {}, isOn: true },
      });

      // The input autofocuses at boot, so move focus off it first — otherwise the toggle
      // would run its other branch and this would assert nothing.
      chat.input.blur();
      expect(getDeepActiveElement()).not.toBe(chat.input);

      expect(pressKey(chat.widget, { key: 'F6' }).handled).toBe(true);

      // `handleFocusToggle` swallows its own throws, so asserting on focus rather than on
      // `preventDefault` is what makes this test able to fail.
      expect(getDeepActiveElement()).toBe(chat.input);
    });

    it('does not move focus back to the input when the shortcut is disabled', async () => {
      const chat = await bootChat('toggle-2');

      chat.input.blur();

      expect(pressKey(chat.widget, { key: 'F6' }).handled).toBe(false);
      expect(getDeepActiveElement()).not.toBe(chat.input);
    });

    it('claims the shortcut even when it originates in the input field', async () => {
      const chat = await bootChat('toggle-3', {
        messageFocusToggle: { key: 'F6', modifiers: {}, isOn: true },
      });

      expect(pressKey(chat.input, { key: 'F6' }).handled).toBe(true);
    });

    it('does not claim the shortcut from the input when disabled', async () => {
      const chat = await bootChat('toggle-4');

      expect(pressKey(chat.input, { key: 'F6' }).handled).toBe(false);
    });
  });

  describe('Announcement parity', () => {
    it('announces the same formatted shortcut the scroll handles display', async () => {
      const chat = await bootChat('announce-1', {
        messageFocusToggle: {
          key: 'k',
          modifiers: { ctrl: true, shift: true },
          isOn: true,
        },
      });

      expect(announceOnInputFocus(chat)).toEqual({
        messageID: ANNOUNCEMENT_ID,
        messageValues: { key: 'Ctrl + Shift + K' },
      });
      scrollHandleText(chat.root).forEach((text) => {
        expect(text).toContain(`Press Ctrl + Shift + K ${SHORTCUT_CLAUSE}`);
      });
    });

    it('announces only on the first focus', async () => {
      const chat = await bootChat('announce-2', {
        messageFocusToggle: { key: 'F6', modifiers: {}, isOn: true },
      });

      fireEvent.focus(chat.input);
      expect(chat.store.getState().announceMessage?.messageID).toBe(
        ANNOUNCEMENT_ID
      );

      // The announcement is one-shot.
      chat.store.dispatch(actions.announceMessage(null));
      fireEvent.blur(chat.input);
      fireEvent.focus(chat.input);

      expect(chat.store.getState().announceMessage).toBeNull();
    });
  });

  // With the shortcut off by default, "Press escape to exit the message list" is the only
  // keyboard promise the out-of-the-box scroll-handle label still makes.
  describe('Escape key handling', () => {
    it('leaves Escape alone while focus is in the input', async () => {
      const chat = await bootChat('escape-1', {
        messageFocusToggle: { key: 'F6', modifiers: {}, isOn: true },
      });

      // Real focus, not a synthetic focus event — the handler reads document.activeElement.
      chat.input.focus();

      expect(pressKey(chat.widget, { key: 'Escape' }).handled).toBe(false);
    });

    it('leaves Escape alone while the shortcut is disabled', async () => {
      const chat = await bootChat('escape-2');

      chat.input.focus();

      expect(pressKey(chat.widget, { key: 'Escape' }).handled).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('handles the shortcut when the conversation is empty', async () => {
      const chat = await bootChat(undefined, {
        messageFocusToggle: { key: 'F6', modifiers: {}, isOn: true },
      });

      expect(pressKey(chat.widget, { key: 'F6' }).handled).toBe(true);
    });

    it('keeps working across repeated presses', async () => {
      const chat = await bootChat('edge-2', {
        messageFocusToggle: { key: 'F6', modifiers: {}, isOn: true },
      });

      for (let i = 0; i < 5; i++) {
        expect(pressKey(chat.widget, { key: 'F6' }).handled).toBe(true);
      }
    });
  });
});
