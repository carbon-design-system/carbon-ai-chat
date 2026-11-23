/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { page, userEvent } from 'vitest/browser';

import { MessageResponseTypes } from '../../../types/messaging/Messages';
import type { ChatInstance } from '../../../types/instance/ChatInstance';
import { PageObjectId } from '../../../testing/PageObjectId';
import { contractSetup, getByTestId } from '../helpers/contract';
import {
  deep,
  deepActive,
  deepAll,
  isVisible,
  mountPanelHost,
  type HostFramework,
} from '../helpers/browserPanels';

// The chat detects a phone once, from the user agent and screen size, when
// it loads. A browser test can't set the user agent, so the chat's own
// detection reports a phone here; the page itself is phone sized, and the
// layout, viewport and focus stay real. The components package's prebundled
// copy of the detection can't be mocked; it only adds a phone class to the
// textarea.
vi.mock('../../../sdk/utils/browserUtils', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  IS_MOBILE: true,
  IS_PHONE: true,
  IS_PHONE_IN_PORTRAIT_MODE: true,
}));

/** Whether the shell and the input sit inside the visual viewport. */
function withinViewport(): boolean {
  const viewport = window.visualViewport;
  const top = viewport.offsetTop;
  const shell = deep('cds-aichat-shell').getBoundingClientRect();
  const input = getByTestId(PageObjectId.INPUT).getBoundingClientRect();
  return (
    shell.height > 200 &&
    shell.width > 300 &&
    shell.top >= top - 2 &&
    shell.bottom <= top + viewport.height + 2 &&
    shell.left >= -2 &&
    shell.right <= viewport.width + 2 &&
    input.height > 0 &&
    input.top >= top - 2 &&
    input.bottom <= top + viewport.height + 2
  );
}

function shellHeight(): number {
  return deep('cds-aichat-shell').getBoundingClientRect().height;
}

function input(): HTMLElement {
  return getByTestId(PageObjectId.INPUT);
}

function inputFocused(): boolean {
  return deepActive() === input();
}

/** Blurs the input, asks the chat for focus, then clicks the input. */
async function expectFocusOnlyByClick(instance: ChatInstance) {
  input().blur();
  await act(async () => {
    instance.requestFocus();
  });
  // A phone keeps its keyboard closed: requestFocus leaves the input alone.
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(inputFocused()).toBe(false);
  await userEvent.click(input());
  await waitFor(() => expect(inputFocused()).toBe(true));
}

describe('native shell lifecycle', () => {
  contractSetup();
  beforeEach(async () => {
    await page.viewport(390, 844);
  });
  afterEach(async () => {
    await page.viewport(800, 600);
  });

  for (const framework of ['react', 'web-component'] as HostFramework[]) {
    it(`${framework} mobile shell resizes, retains its DOM through a move, and reopens with usable focus`, async () => {
      const host = await mountPanelHost(framework, 'float', {
        openChatByDefault: false,
        homescreen: { isOn: false },
        shouldTakeFocusIfOpensAutomatically: true,
        disableCustomElementMobileEnhancements: false,
        messaging: {
          skipWelcome: true,
          customSendMessage: async (_request, _options, chat) => {
            await chat.messaging.addMessage({
              id: 'mobile-reply',
              output: {
                generic: [
                  {
                    response_type: MessageResponseTypes.TEXT,
                    text: 'Mobile reply',
                  },
                ],
              },
            });
          },
        },
      });
      const { instance, root } = host;
      await act(async () => {
        await instance.changeView({ mainWindow: true, launcher: false });
      });
      const native = root.querySelector<
        HTMLElement & {
          whenReady(): Promise<boolean>;
        }
      >('cds-aichat-chat-shell');
      await act(async () => {
        await native.whenReady();
      });
      const widget = deep('cds-aichat-shell');
      expect(
        deep('.cds-aichat--container--render').classList.contains(
          'cds-aichat--is-phone'
        )
      ).toBe(true);
      expect(widget.classList.contains('cds-aichat-float--mobile')).toBe(true);
      await waitFor(() => expect(withinViewport()).toBe(true));
      const initialHeight = shellHeight();
      await act(async () => {
        await instance.send('text');
      });
      await waitFor(() =>
        expect(isVisible(deep('.cds-aichat--message'))).toBe(true)
      );

      await page.viewport(390, 480);
      await waitFor(() => expect(withinViewport()).toBe(true));
      await waitFor(() =>
        expect(shellHeight()).toBeLessThan(initialHeight - 200)
      );
      await expectFocusOnlyByClick(instance);
      await userEvent.keyboard('Mobile draft');
      await waitFor(() =>
        expect(instance.getState().input.rawValue).toBe('Mobile draft')
      );

      const liveRegions = deepAll('[aria-live]').length;
      const shellRoot = native.getRootNode() as ShadowRoot;
      const probe = {
        widget: native.querySelector('cds-aichat-shell'),
        messages: native.querySelector('.cds-aichat--messages'),
        input: native.querySelector('cds-aichat-chat-input'),
        liveRegions: Array.from(shellRoot.querySelectorAll('[aria-live]')),
      };
      expect(probe.widget).toBe(widget);
      expect(probe.messages).not.toBeNull();
      expect(probe.input).not.toBeNull();
      await act(async () => {
        native.parentNode.appendChild(native);
      });
      await waitFor(() => {
        const regions = Array.from(shellRoot.querySelectorAll('[aria-live]'));
        expect(native.querySelector('cds-aichat-shell')).toBe(probe.widget);
        expect(native.querySelector('.cds-aichat--messages')).toBe(
          probe.messages
        );
        expect(native.querySelector('cds-aichat-chat-input')).toBe(probe.input);
        expect(regions).toEqual(probe.liveRegions);
        regions.forEach((region, index) =>
          expect(region).toBe(probe.liveRegions[index])
        );
      });
      expect(deepAll('[aria-live]')).toHaveLength(liveRegions);
      await expectFocusOnlyByClick(instance);
      await waitFor(() => expect(withinViewport()).toBe(true));
      // Clear focus while visible, so any focus after the reopen is the
      // shell's own.
      input().blur();
      expect(inputFocused()).toBe(false);

      await act(async () => {
        await instance.changeView({ mainWindow: false, launcher: true });
      });
      await waitFor(() => expect(isVisible(widget)).toBe(false));
      await act(async () => {
        await instance.changeView({ mainWindow: true, launcher: false });
      });
      await waitFor(() => expect(isVisible(widget)).toBe(true));
      // The reopen's focus request waits for readiness; let it settle first.
      await act(async () => {
        await native.whenReady();
      });
      expect(inputFocused()).toBe(false);
      await expectFocusOnlyByClick(instance);
      expect(instance.getState().input.rawValue).toBe('Mobile draft');

      await page.viewport(390, 844);
      await waitFor(() => expect(withinViewport()).toBe(true));
      await waitFor(() =>
        expect(shellHeight()).toBeGreaterThan(initialHeight - 5)
      );
      expect(deepAll('[aria-live]')).toHaveLength(liveRegions);
      await host.unmount();
    });
  }
});
