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
  getChatShadowRoot,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from './helpers/chat';

import { fireEvent } from '@testing-library/react';

import { MessageResponseTypes } from '../../types/messaging/Messages';

import type { KeyboardShortcuts } from '../../types/config/ShortcutConfig';

import type { AppStore } from '../../sdk/store/appStore';

import type { AppState } from '../../types/state/AppState';

import type { ServiceManager } from '../../sdk/services/ServiceManager';

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

  const root = getChatShadowRoot();
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
  return chat.store.getState().view.announceMessage;
}

describe('Keyboard Shortcuts', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  describe('isOn', () => {
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
  });

  // `matchesShortcut` itself is unit-tested exhaustively in
  // tests/utils/spec/keyboardUtils_spec.ts. These cases only prove the *resolved* config
  // reaches it, so one positive and one negative are enough.

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
  });
});
