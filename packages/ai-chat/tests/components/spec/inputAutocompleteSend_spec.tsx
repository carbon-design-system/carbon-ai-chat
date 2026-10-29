/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import type { JSONContent } from '@tiptap/core';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type ChatInput from '../../../src/chat/components/input/ChatInput';
import { ChatContainer } from '../../../src/react/ChatContainer';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type { CustomListProps } from '../../../src/types/config/InputConfig';
import { MessageSendSource } from '../../../src/types/events/eventBusTypes';
import {
  applyConfigChange,
  createBaseConfig,
  getChatHost,
  getChatShadowRoot,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const ConsumerContext = createContext('missing consumer context');

async function renderWithContext(config: PublicConfig, contextValue: string) {
  let instance: ChatInstance;
  let rendered = false;
  render(
    <ConsumerContext.Provider value={contextValue}>
      <ChatContainer
        {...config}
        onBeforeRender={(chat) => {
          instance = chat;
        }}
        onAfterRender={() => {
          rendered = true;
        }}
      />
    </ConsumerContext.Provider>
  );
  await waitFor(
    () => {
      expect(instance).toBeDefined();
      expect(rendered).toBe(true);
    },
    { timeout: 5000 }
  );
  return {
    instance,
    serviceManager: instance.serviceManager,
    store: instance.serviceManager.store,
  };
}

function StatefulList({
  onSend,
  selectedText,
  onMount,
}: {
  onSend: CustomListProps['onSend'];
  selectedText: string;
  onMount: () => void;
}) {
  const context = useContext(ConsumerContext);
  const [count, setCount] = useState(0);
  useEffect(onMount, [onMount]);
  return (
    <div data-testid="stateful-autocomplete-list">
      <button
        type="button"
        data-testid="autocomplete-consumer-count"
        onClick={() => setCount((value) => value + 1)}>
        {context}:{count}
      </button>
      <button
        type="button"
        data-testid="custom-autocomplete-send"
        onClick={() => onSend(selectedText)}>
        {selectedText}
      </button>
    </div>
  );
}

async function renderInput(
  selectedText: string,
  renderList?: (props: CustomListProps) => React.ReactNode,
  contextValue?: string
) {
  const renderCustomList = jest.fn(
    renderList ??
      (({ onSend }: CustomListProps) => (
        <div role="listbox" aria-label="Custom autocomplete">
          <button
            type="button"
            role="option"
            aria-selected={false}
            data-testid="custom-autocomplete-send"
            onClick={() => onSend(selectedText)}>
            {selectedText}
          </button>
        </div>
      ))
  );
  const config: PublicConfig = {
    ...createBaseConfig(),
    openChatByDefault: true,
    homescreen: { isOn: false },
    input: {
      autocomplete: {
        items: [{ id: 'selected', label: selectedText }],
        minQueryLength: 0,
        renderCustomList,
      },
    },
  };
  const { instance, serviceManager, store } =
    contextValue === undefined
      ? await renderChatAndGetInstanceWithStore(config)
      : await renderWithContext(config, contextValue);
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
  await act(async () => {
    await instance.input.getEditor();
  });
  const send = jest.spyOn(serviceManager.actions, 'sendWithCatch');
  const clear = jest.spyOn(prompt, 'clearContent');
  const resetHistory = jest.spyOn(prompt, 'resetHistory');
  const showList = async () => {
    await act(async () => {
      prompt.dispatchEvent(
        new CustomEvent('cds-aichat-trigger-change', {
          bubbles: true,
          composed: true,
          detail: { type: 'autocomplete', query: '', triggerOffset: 0 },
        })
      );
    });
    const button = await waitFor(() => {
      const target = getChatHost().querySelector<HTMLButtonElement>(
        '[data-testid="custom-autocomplete-send"]'
      );
      expect(target).not.toBeNull();
      return target;
    });
    expect(renderCustomList).toHaveBeenCalled();
    expect(button.textContent).toBe(selectedText);
    return button;
  };
  return { instance, store, view, prompt, send, clear, resetHistory, showList };
}

beforeEach(setupBeforeEach);
afterEach(() => {
  setupAfterEach();
  jest.restoreAllMocks();
});

describe('the mounted input custom-list send regression', () => {
  it('routes a real custom-list click through send and clears the input and history', async () => {
    const selectedText = 'hello from autocomplete';
    const { instance, view, prompt, send, clear, resetHistory, showList } =
      await renderInput(selectedText);
    const button = await showList();

    await act(async () => {
      fireEvent.click(button);
      await view.updateComplete;
      await prompt.updateComplete;
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        input: expect.objectContaining({ text: selectedText }),
      })
    );
    expect(send.mock.calls[0][1]).toBe(MessageSendSource.MESSAGE_INPUT);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(resetHistory).toHaveBeenCalledTimes(1);
    expect(send.mock.invocationCallOrder[0]).toBeLessThan(
      clear.mock.invocationCallOrder[0]
    );
    expect(prompt.getValue()).toBe('');
    expect(instance.getState().input.rawValue).toBe('');
  });

  it('sends only the selected text instead of the previous editor document', async () => {
    const selectedText = 'selected autocomplete item';
    const { instance, view, prompt, send, clear, resetHistory, showList } =
      await renderInput(selectedText);
    const staleDoc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'some typed text' }],
        },
      ],
    };
    await act(async () => {
      prompt.setContent(staleDoc);
      prompt.dispatchEvent(
        new CustomEvent('cds-aichat-prompt-change', {
          bubbles: true,
          composed: true,
          detail: { rawValue: 'some typed text', content: staleDoc },
        })
      );
      await view.updateComplete;
    });
    expect(instance.getState().input.content).toEqual(staleDoc);
    expect(prompt.getValue()).toBe('some typed text');
    const button = await showList();

    await act(async () => {
      fireEvent.click(button);
      await view.updateComplete;
      await prompt.updateComplete;
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        input: expect.objectContaining({ text: selectedText }),
      })
    );
    expect(send.mock.calls[0][0]).not.toHaveProperty('input.display_content');
    expect(clear).toHaveBeenCalledTimes(1);
    expect(resetHistory).toHaveBeenCalledTimes(1);
    expect(prompt.getValue()).toBe('');
    expect(instance.getState().input.rawValue).toBe('');
  });

  it('keeps consumer context, state and DOM across an unrelated header update before sending', async () => {
    const selectedText = 'send from the retained custom list';
    const mounted = jest.fn();
    const {
      instance,
      store,
      view,
      prompt,
      send,
      clear,
      resetHistory,
      showList,
    } = await renderInput(
      selectedText,
      ({ onSend }) => (
        <StatefulList
          onSend={onSend}
          selectedText={selectedText}
          onMount={mounted}
        />
      ),
      'host context'
    );
    const sendButton = await showList();
    const host = getChatHost();
    const list = host.querySelector(
      '[data-testid="stateful-autocomplete-list"]'
    );
    const counter = host.querySelector<HTMLButtonElement>(
      '[data-testid="autocomplete-consumer-count"]'
    );
    expect(list).not.toBeNull();
    expect(counter.textContent).toBe('host context:0');
    expect(mounted).toHaveBeenCalledTimes(1);
    act(() => {
      fireEvent.click(counter);
    });
    expect(counter.textContent).toBe('host context:1');

    const config = store.getState().config.public;
    applyConfigChange(store, {
      ...config,
      header: { ...config.header, title: 'Unrelated header update' },
    });
    await waitFor(() => {
      expect(
        deepQuerySelector(getChatShadowRoot(), '[data-testid="header_title"]')
          ?.textContent
      ).toBe('Unrelated header update');
    });
    await act(async () => {
      await view.updateComplete;
    });
    expect(
      host.querySelector('[data-testid="stateful-autocomplete-list"]')
    ).toBe(list);
    expect(
      host.querySelector('[data-testid="autocomplete-consumer-count"]')
    ).toBe(counter);
    expect(host.querySelector('[data-testid="custom-autocomplete-send"]')).toBe(
      sendButton
    );
    expect(counter.textContent).toBe('host context:1');
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(sendButton);
      await view.updateComplete;
      await prompt.updateComplete;
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        input: expect.objectContaining({ text: selectedText }),
      })
    );
    expect(send.mock.calls[0][1]).toBe(MessageSendSource.MESSAGE_INPUT);
    expect(send.mock.calls[0][0]).not.toHaveProperty('input.display_content');
    expect(clear).toHaveBeenCalledTimes(1);
    expect(resetHistory).toHaveBeenCalledTimes(1);
    expect(prompt.getValue()).toBe('');
    expect(instance.getState().input.rawValue).toBe('');
  });
});
