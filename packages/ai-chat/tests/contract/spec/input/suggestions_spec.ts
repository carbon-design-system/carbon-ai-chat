/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import React from 'react';
import type { Editor, JSONContent } from '@tiptap/core';

import {
  ChatInstance,
  PageObjectId,
  PublicConfig,
  SuggestionItem,
  TriggerSuggestionConfig,
} from '../../../../src/aiChatEntry';
import {
  FakeBackend,
  allByRole,
  byRole,
  click,
  contractSetup,
  getByTestId,
  isShownWithin,
  mainPanelText,
  openChat,
  pause,
} from '../../helpers';

/** Opens a chat (see `openChat`), then loads and focuses its rich editor. */
async function openEditor(config: Partial<PublicConfig>): Promise<{
  instance: ChatInstance;
  backend: FakeBackend;
  editor: Editor;
}> {
  const { instance, backend } = await openChat(config);
  const editor = await act(async () => instance.input.getEditor());
  await act(async () => {
    editor.commands.focus();
  });
  return { instance, backend, editor };
}

/**
 * Inserts text at the caret through the public editor handle. jsdom can't
 * type real keystrokes into the rich editor, so this stands in for typing.
 */
async function insert(editor: Editor, text: string): Promise<void> {
  await act(async () => {
    editor.commands.insertContent(text);
  });
}

/** The visible suggestion options with this name. */
function options(name: string): HTMLElement[] {
  return allByRole('option', name);
}

/** Waits for the suggestion option with this name, then clicks it. */
async function choose(name: string): Promise<void> {
  await waitFor(() => expect(options(name)).toHaveLength(1));
  await click(byRole('option', name));
}

/** The inline nodes of the input's first paragraph, without attributes. */
function nodeTypes(content: JSONContent): string[] {
  return (content.content?.[0]?.content ?? []).map((node) => node.type);
}

const ALICE: SuggestionItem = { id: 'alice', label: 'Alice', value: '@alice' };
const BOB: SuggestionItem = { id: 'bob', label: 'Bob', value: '@bob' };

// @covers config.input config.input.mention state.input.content
describe('input.mention', () => {
  contractSetup();

  it('asks items for the text typed after the trigger', async () => {
    const queries: string[] = [];
    const { editor } = await openEditor({
      input: {
        mention: {
          trigger: '@',
          items: (query) => {
            queries.push(query);
            return [ALICE];
          },
        },
      },
    });
    await insert(editor, '@al');
    await waitFor(() => expect(options('Alice')).toHaveLength(1));
    expect(queries).toContain('al');
  });

  it('filters an item list by the typed text', async () => {
    const { editor } = await openEditor({
      input: { mention: { trigger: '@', items: [ALICE, BOB] } },
    });
    await insert(editor, '@bo');
    await waitFor(() => expect(options('Bob')).toHaveLength(1));
    expect(options('Alice')).toHaveLength(0);
  });

  it('inserts a mention node for the chosen item and calls onSelect', async () => {
    const onSelect = jest.fn();
    const { instance, editor, backend } = await openEditor({
      input: { mention: { trigger: '@', items: [ALICE], onSelect } },
    });
    await insert(editor, '@al');
    await choose('Alice');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'alice' });
    const { content } = instance.state.get().input;
    expect(nodeTypes(content)).toEqual(['mention', 'text']);
    expect(content.content[0].content[0].attrs).toMatchObject({
      id: 'alice',
      label: 'Alice',
      value: '@alice',
    });
    expect(instance.state.get().input.rawValue).toBe('@Alice ');
    // Choosing a mention never sends.
    expect(backend.requests).toHaveLength(0);
  });

  // The chip goes through renderInLightDom's handshake, so its content
  // reaches page DOM only when that works end to end inside the chat.
  // @covers export.aiChatEntry.renderInLightDom
  it('shows renderCustomToken content for a chosen mention in the input, in page DOM', async () => {
    const chip = document.createElement('span');
    chip.textContent = 'Custom Alice';
    const { editor } = await openEditor({
      input: {
        mention: {
          trigger: '@',
          items: [ALICE],
          renderCustomToken: () => chip,
        },
      },
    });
    await insert(editor, '@al');
    await choose('Alice');
    await waitFor(() =>
      expect(isShownWithin(chip, getByTestId(PageObjectId.INPUT))).toBe(true)
    );
    expect(chip.getRootNode()).toBe(document);
  });

  it('offers nothing without the trigger', async () => {
    const { editor } = await openEditor({
      input: { mention: { trigger: '@', items: [ALICE] } },
    });
    await insert(editor, 'al');
    // A short wait proves no list opens.
    await pause();
    expect(options('Alice')).toHaveLength(0);
  });
});

// @covers config.input config.input.command state.input.content state.input.rawValue
describe('input.command', () => {
  contractSetup();

  const SUMMARIZE: SuggestionItem = { id: 'sum', label: 'Summarize' };
  const TRANSLATE: SuggestionItem = { id: 'tr', label: 'Translate' };

  it('inserts a command node for the chosen item and calls onSelect', async () => {
    const onSelect = jest.fn();
    const { instance, editor } = await openEditor({
      input: {
        command: { trigger: '/', items: [SUMMARIZE, TRANSLATE], onSelect },
      },
    });
    await insert(editor, '/su');
    await waitFor(() => expect(options('Summarize')).toHaveLength(1));
    expect(options('Translate')).toHaveLength(0);
    await choose('Summarize');
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'sum' });
    const { input } = instance.state.get();
    expect(nodeTypes(input.content)).toEqual(['command', 'text']);
    expect(input.content.content[0].content[0].attrs).toMatchObject({
      id: 'sum',
      label: 'Summarize',
    });
    expect(input.rawValue).toBe('/Summarize ');
  });

  it('calls onRemove when the command is deleted', async () => {
    const onRemove = jest.fn();
    const { instance, editor } = await openEditor({
      input: { command: { trigger: '/', items: [SUMMARIZE], onRemove } },
    });
    await insert(editor, '/su');
    await choose('Summarize');
    await act(async () => {
      editor.commands.clearContent(true);
    });
    expect(instance.state.get().input.rawValue).toBe('');
    await waitFor(() => expect(onRemove).toHaveBeenCalledTimes(1));
    expect(onRemove.mock.calls[0][0]).toMatchObject({ id: 'sum' });
  });
});

/** Clicks the send button, found by its public test ID. */
async function clickSend(): Promise<void> {
  await act(async () => {
    getByTestId(PageObjectId.INPUT_SEND).click();
  });
}

/** The visible elements with this role and name that show in the main panel. */
function shownInMainPanel(role: string, name: string): HTMLElement[] {
  const panel = getByTestId(PageObjectId.MAIN_PANEL);
  return allByRole(role, name).filter((element) =>
    isShownWithin(element, panel)
  );
}

// @covers config.input.mention
describe('input token chips in a sent message', () => {
  contractSetup();

  const renderers: [string, TriggerSuggestionConfig['renderCustomToken']][] = [
    [
      'an element',
      (item) => {
        const chip = document.createElement('span');
        chip.setAttribute('role', 'img');
        chip.setAttribute('aria-label', `Person ${item.label}`);
        return chip;
      },
    ],
    [
      'a React node',
      (item) =>
        React.createElement('span', {
          role: 'img',
          'aria-label': `Person ${item.label}`,
        }),
    ],
  ];

  for (const [kind, renderCustomToken] of renderers) {
    it(`draws a chip with the renderCustomToken the input used, which returns ${kind}`, async () => {
      const { instance, editor, backend } = await openEditor({
        input: {
          mention: { trigger: '@', items: [ALICE], renderCustomToken },
        },
      });
      await insert(editor, '@al');
      await choose('Alice');
      // The input draws the custom chip; the main panel shows no message yet.
      await waitFor(() =>
        expect(allByRole('img', 'Person Alice')).toHaveLength(1)
      );
      expect(shownInMainPanel('img', 'Person Alice')).toHaveLength(0);
      await clickSend();
      await waitFor(() => expect(backend.requests).toHaveLength(1));
      expect(instance.state.get().input.rawValue).toBe('');
      await waitFor(() =>
        expect(shownInMainPanel('img', 'Person Alice')).toHaveLength(1)
      );
    });
  }

  it('draws the default chip without a renderCustomToken', async () => {
    const { instance, editor, backend } = await openEditor({
      input: { mention: { trigger: '@', items: [ALICE] } },
    });
    await insert(editor, '@al');
    await choose('Alice');
    await clickSend();
    await waitFor(() => expect(backend.requests).toHaveLength(1));
    expect(instance.state.get().input.rawValue).toBe('');
    await waitFor(() => expect(mainPanelText()).toContain('Alice'));
  });
});

// @covers config.input config.input.autocomplete
describe('input.autocomplete', () => {
  contractSetup();

  const HELLO: SuggestionItem = { id: 'hello', label: 'hello world' };

  it('asks items for the typed text and sends a chosen item', async () => {
    const queries: string[] = [];
    const { instance, editor, backend } = await openEditor({
      input: {
        autocomplete: {
          items: (query) => {
            queries.push(query);
            return [HELLO];
          },
        },
      },
    });
    await insert(editor, 'hel');
    await choose('hello world');
    expect(queries).toContain('hel');
    await waitFor(() => expect(backend.texts()).toEqual(['hello world']));
    expect(instance.state.get().input.rawValue).toBe('');
  });

  it('inserts a chosen item instead with disableDirectSend', async () => {
    const { instance, editor, backend } = await openEditor({
      input: { autocomplete: { disableDirectSend: true, items: [HELLO] } },
    });
    await insert(editor, 'hel');
    await choose('hello world');
    // A short wait proves no send follows.
    await pause();
    expect(backend.requests).toHaveLength(0);
    expect(instance.state.get().input.rawValue).toBe('hello world');
  });

  it('calls onSelect for a chosen item that sends', async () => {
    const onSelect = jest.fn();
    const sent = await openEditor({
      input: { autocomplete: { items: [HELLO], onSelect } },
    });
    await insert(sent.editor, 'hel');
    await choose('hello world');
    await waitFor(() => expect(sent.backend.texts()).toEqual(['hello world']));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'hello' });
  });

  it('sends a chosen item and logs the error when onSelect throws', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    try {
      const sent = await openEditor({
        input: {
          autocomplete: {
            items: [HELLO],
            onSelect: () => {
              throw new Error('host onSelect failed');
            },
          },
        },
      });
      await insert(sent.editor, 'hel');
      await choose('hello world');
      await waitFor(() =>
        expect(sent.backend.texts()).toEqual(['hello world'])
      );
      expect(consoleError).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ message: 'host onSelect failed' })
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it('calls onSelect for an item inserted with disableDirectSend', async () => {
    const onSelect = jest.fn();
    const { editor } = await openEditor({
      input: {
        autocomplete: { disableDirectSend: true, items: [HELLO], onSelect },
      },
    });
    await insert(editor, 'hel');
    await choose('hello world');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'hello' });
  });

  it('waits for minQueryLength characters', async () => {
    const { editor } = await openEditor({
      input: { autocomplete: { minQueryLength: 2, items: [HELLO] } },
    });
    await insert(editor, 'h');
    // A short wait proves no list opens.
    await pause();
    expect(options('hello world')).toHaveLength(0);
    await insert(editor, 'e');
    await waitFor(() => expect(options('hello world')).toHaveLength(1));
  });
});

// @covers config.input config.input.starters
describe('input.starters', () => {
  contractSetup();

  const STARTER: SuggestionItem = {
    id: 'start',
    label: 'Contract starter',
    value: 'starter value',
  };

  it('shows while the input is empty and focused, and sends the value of a chosen one', async () => {
    const { instance, backend } = await openEditor({
      input: { starters: { items: [STARTER] } },
    });
    await choose('Contract starter');
    await waitFor(() => expect(backend.texts()).toEqual(['starter value']));
    expect(instance.state.get().input.rawValue).toBe('');
  });

  it('sends the label when an item has no value', async () => {
    const { backend } = await openEditor({
      input: { starters: { items: [{ id: 'start', label: 'Label only' }] } },
    });
    await choose('Label only');
    await waitFor(() => expect(backend.texts()).toEqual(['Label only']));
  });

  it('hides once the input has text', async () => {
    const { editor } = await openEditor({
      input: { starters: { items: [STARTER] } },
    });
    await waitFor(() => expect(options('Contract starter')).toHaveLength(1));
    await insert(editor, 'typed');
    await waitFor(() => expect(options('Contract starter')).toHaveLength(0));
  });

  it('shows nothing with isOn false', async () => {
    await openEditor({
      input: { starters: { isOn: false, items: [STARTER] } },
    });
    // A short wait proves no list opens.
    await pause();
    expect(options('Contract starter')).toHaveLength(0);
  });

  it('sends nothing, and inserts nothing, with isSendDisabled', async () => {
    const { instance, backend } = await openEditor({
      input: { isSendDisabled: true, starters: { items: [STARTER] } },
    });
    await choose('Contract starter');
    // A short wait proves no send follows.
    await pause();
    expect(backend.requests).toHaveLength(0);
    expect(instance.state.get().input.rawValue).toBe('');
  });

  it('inserts a clicked starter instead of sending it with disableDirectSend', async () => {
    const { instance, backend } = await openEditor({
      input: { starters: { disableDirectSend: true, items: [STARTER] } },
    });
    await choose('Contract starter');
    // A short wait proves no send follows.
    await pause();
    expect(backend.requests).toHaveLength(0);
    expect(instance.state.get().input.rawValue).toBe('starter value');
  });
});
