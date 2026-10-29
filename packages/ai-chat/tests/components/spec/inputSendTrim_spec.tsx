/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import type { JSONContent } from '@tiptap/core';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type ChatInput from '../../../src/chat/components/input/ChatInput';
import { MessageSendSource } from '../../../src/types/events/eventBusTypes';
import {
  createBaseConfig,
  getChatShadowRoot,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

async function renderInput() {
  const { instance, serviceManager } = await renderChatAndGetInstanceWithStore({
    ...createBaseConfig(),
    openChatByDefault: true,
    homescreen: { isOn: false },
  });
  const root = getChatShadowRoot();
  const view = await waitFor(() => {
    const input = root.querySelector<ChatInput>('cds-aichat-chat-input');
    expect(input).not.toBeNull();
    return input;
  });
  await view.ready;
  const prompt = view.querySelector<PromptLineElement>(
    'cds-aichat-prompt-line'
  );
  expect(prompt).not.toBeNull();
  const send = jest.spyOn(serviceManager.actions, 'sendWithCatch');
  const clear = jest.spyOn(prompt, 'clearContent');
  const resetHistory = jest.spyOn(prompt, 'resetHistory');
  return { instance, view, prompt, send, clear, resetHistory };
}

async function change(
  view: ChatInput,
  prompt: PromptLineElement,
  rawValue: string,
  content?: JSONContent
) {
  await act(async () => {
    prompt.setContent(rawValue);
    prompt.dispatchEvent(
      new CustomEvent('cds-aichat-prompt-change', {
        bubbles: true,
        composed: true,
        detail: { rawValue, content },
      })
    );
    await view.updateComplete;
  });
}

async function sendIntent(view: ChatInput, prompt: PromptLineElement) {
  await act(async () => {
    prompt.dispatchEvent(
      new CustomEvent('cds-aichat-prompt-send-intent', {
        bubbles: true,
        composed: true,
      })
    );
    await view.updateComplete;
    await prompt.updateComplete;
  });
}

beforeEach(setupBeforeEach);
afterEach(() => {
  setupAfterEach();
  jest.restoreAllMocks();
});

describe('the mounted input trims sends before clearing its surface', () => {
  it('trims surrounding spaces before sending and clears content and history once', async () => {
    const { instance, view, prompt, send, clear, resetHistory } =
      await renderInput();
    await change(view, prompt, '   padded message   ');
    expect(prompt.getValue()).toBe('   padded message   ');

    await sendIntent(view, prompt);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        input: expect.objectContaining({ text: 'padded message' }),
      })
    );
    expect(send.mock.calls[0][0]).not.toHaveProperty('input.display_content');
    expect(send.mock.calls[0][1]).toBe(MessageSendSource.MESSAGE_INPUT);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(resetHistory).toHaveBeenCalledTimes(1);
    expect(send.mock.invocationCallOrder[0]).toBeLessThan(
      clear.mock.invocationCallOrder[0]
    );
    expect(clear.mock.invocationCallOrder[0]).toBeLessThan(
      resetHistory.mock.invocationCallOrder[0]
    );
    expect(prompt.getValue()).toBe('');
    expect(instance.getState().input.rawValue).toBe('');
  });

  it('strips a trailing newline left by Shift+Enter', async () => {
    const { view, prompt, send, clear, resetHistory } = await renderInput();
    await change(view, prompt, 'hello\n');

    await sendIntent(view, prompt);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        input: expect.objectContaining({ text: 'hello' }),
      })
    );
    expect(send.mock.calls[0][0]).not.toHaveProperty('input.display_content');
    expect(clear).toHaveBeenCalledTimes(1);
    expect(resetHistory).toHaveBeenCalledTimes(1);
    expect(prompt.getValue()).toBe('');
  });

  it('forwards the current document by identity before clearing it', async () => {
    const { view, prompt, send, clear, resetHistory } = await renderInput();
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'current document' }],
        },
      ],
    };
    await change(view, prompt, '  current document  ', content);

    await sendIntent(view, prompt);

    expect(send).toHaveBeenCalledTimes(1);
    const request = send.mock.calls[0][0];
    expect(request).toEqual(
      expect.objectContaining({
        input: expect.objectContaining({ text: 'current document' }),
      })
    );
    expect(typeof request).not.toBe('string');
    if (typeof request === 'string') {
      throw new Error('Input sent a string instead of a message request.');
    }
    expect(request.input.display_content).toBe(content);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(resetHistory).toHaveBeenCalledTimes(1);
    expect(send.mock.invocationCallOrder[0]).toBeLessThan(
      clear.mock.invocationCallOrder[0]
    );
    expect(prompt.getValue()).toBe('');
  });
});
