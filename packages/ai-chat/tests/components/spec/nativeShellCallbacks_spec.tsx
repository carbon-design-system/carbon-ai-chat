/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * PLAN-11 O2: shell callbacks reach the existing send and human-agent owners
 * once, in order, across a view change, through both public wrappers.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type ChatInput from '../../../src/chat/components/input/ChatInput';
import type ChatShell from '../../../src/chat/components/shell/ChatShell';
import type { ChatViewState } from '../../../src/chat/services/chatViewState';
import actions from '../../../src/chat/store/actions';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import type { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import { MessageSendSource } from '../../../src/types/events/eventBusTypes';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const wrappers = [
  ['ChatContainer', ChatContainer],
  ['ChatCustomElement', ChatCustomElement],
] as const;

async function boot(
  Wrapper: (typeof wrappers)[number][1],
  props: Partial<ChatContainerProps>
) {
  const after = jest.fn();
  render(
    React.createElement(Wrapper, {
      ...createBaseConfig(),
      className: '',
      openChatByDefault: true,
      shouldTakeFocusIfOpensAutomatically: false,
      ...props,
      onAfterRender: after,
    })
  );
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
    timeout: 5000,
  });
  const root = document.querySelector('cds-aichat-container').shadowRoot;
  const view = root.querySelector<ChatShell>('cds-aichat-chat-shell');
  await view.whenReady();
  const manager = (view as unknown as { viewState: ChatViewState }).viewState
    .serviceManager;
  return { root, view, manager };
}

/** The live built-in input and its prompt line, re-read after each render. */
async function currentInput(root: ShadowRoot) {
  const input = await waitFor(() => {
    const found = root.querySelector<ChatInput>('cds-aichat-chat-input');
    expect(found).not.toBeNull();
    return found;
  });
  await input.ready;
  const prompt = input.querySelector<PromptLineElement>(
    'cds-aichat-prompt-line'
  );
  return { input, prompt };
}

async function sendThroughInput(root: ShadowRoot, text: string) {
  const { input, prompt } = await currentInput(root);
  await act(async () => {
    prompt.setContent(text);
    prompt.dispatchEvent(
      new CustomEvent('cds-aichat-prompt-change', {
        bubbles: true,
        composed: true,
        detail: { rawValue: text },
      })
    );
    await input.updateComplete;
    prompt.dispatchEvent(
      new CustomEvent('cds-aichat-prompt-send-intent', {
        bubbles: true,
        composed: true,
      })
    );
    await input.updateComplete;
  });
}

beforeEach(() => {
  setupBeforeEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
});
afterEach(() => {
  setupAfterEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
  jest.restoreAllMocks();
});

describe.each(wrappers)('shell callbacks through %s', (_name, Wrapper) => {
  it('sends from home, then from messages, once each and in order', async () => {
    const { root, view, manager } = await boot(Wrapper, {
      homescreen: { isOn: true, greeting: 'Welcome' },
    });
    expect(view.querySelector('cds-aichat-home-screen')).not.toBeNull();
    const send = jest
      .spyOn(manager.actions, 'sendWithCatch')
      .mockResolvedValue(undefined);

    await sendThroughInput(root, 'From home');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1]).toBe(MessageSendSource.HOME_SCREEN_INPUT);

    // Leave the home screen; the same input now sends from messages.
    act(() => {
      manager.store.dispatch(actions.setHomeScreenIsOpen(false));
    });
    await waitFor(() =>
      expect(view.querySelector('cds-aichat-home-screen')).toBeNull()
    );
    await sendThroughInput(root, 'From messages');

    expect(send.mock.calls.map((call) => call[1])).toEqual([
      MessageSendSource.HOME_SCREEN_INPUT,
      MessageSendSource.MESSAGE_INPUT,
    ]);
  });

  it('routes agent typing and file selection to the human-agent owner once', async () => {
    const { root, manager } = await boot(Wrapper, {
      homescreen: { isOn: false },
    });
    const service = {
      userTyping: jest.fn(),
      filesSelectedForUpload: jest.fn(),
    };
    (manager as unknown as { humanAgentService: unknown }).humanAgentService =
      service;
    act(() => {
      manager.store.dispatch(
        actions.changeState({
          persistedToBrowserStorage: {
            humanAgentState: { isConnected: true },
          },
        } as never)
      );
      manager.store.dispatch(
        actions.updateInputState(
          { allowFileUploads: true, allowMultipleFileUploads: true },
          true
        )
      );
    });
    const { input, prompt } = await currentInput(root);
    await waitFor(() =>
      expect(input.querySelector('input[type="file"]')).not.toBeNull()
    );

    act(() => {
      prompt.dispatchEvent(
        new CustomEvent('cds-aichat-prompt-typing', {
          bubbles: true,
          composed: true,
          detail: { isTyping: true },
        })
      );
    });
    const fileInput =
      input.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [file],
    });
    act(() => {
      fileInput.dispatchEvent(new Event('change'));
    });

    expect(service.userTyping).toHaveBeenCalledTimes(1);
    expect(service.userTyping).toHaveBeenCalledWith(true);
    expect(service.filesSelectedForUpload).toHaveBeenCalledTimes(1);
    expect(service.filesSelectedForUpload.mock.calls[0][0]).toEqual([
      expect.objectContaining({ file }),
    ]);
    expect(service.userTyping.mock.invocationCallOrder[0]).toBeLessThan(
      service.filesSelectedForUpload.mock.invocationCallOrder[0]
    );
  });
});
