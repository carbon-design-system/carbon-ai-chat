/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { Node } from '@tiptap/core';
import type { Extension, JSONContent } from '@tiptap/core';

import {
  BusEventStateChange,
  BusEventType,
  ChatInstance,
  PageObjectId,
  PublicConfig,
  ViewType,
  WriteableElementName,
} from '../../../../src/aiChatEntry';
import {
  allByTestId,
  changeView,
  contractChat,
  contractSetup,
  getByTestId,
  inputField,
  openChat,
  pause,
  typeText,
} from '../../helpers';

/** A one-paragraph doc holding this text. */
function textDoc(text: string): JSONContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

/** The doc the chat publishes for an empty input. */
const EMPTY_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

/** A host node, installed through `input.tiptap.extensions`. */
const TestChip = Node.create({
  name: 'testChip',
  group: 'inline',
  inline: true,
  atom: true,
  parseHTML() {
    return [{ tag: 'span[data-test-chip]' }];
  },
  renderHTML() {
    return ['span', { 'data-test-chip': '' }];
  },
});

const CHIP_CONFIG: Partial<PublicConfig> = {
  input: { tiptap: { extensions: [TestChip as unknown as Extension] } },
};

function chipDoc(text: string): JSONContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }, { type: 'testChip' }],
      },
    ],
  };
}

/** One paragraph holding "one", a line break, then "two". */
const LINE_BREAK_DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'one' },
        { type: 'hardBreak' },
        { type: 'text', text: 'two' },
      ],
    },
  ],
};

/** {@link LINE_BREAK_DOC}'s paragraph, then a second one holding "three". */
const BREAKS_DOC: JSONContent = {
  type: 'doc',
  content: [...LINE_BREAK_DOC.content, textDoc('three').content[0]],
};

async function updateContent(
  instance: ChatInstance,
  updater: (previous: JSONContent) => JSONContent
): Promise<void> {
  await act(async () => {
    await instance.input.updateContent(updater);
  });
}

async function updateRawValue(
  instance: ChatInstance,
  updater: (previous: string) => string
): Promise<void> {
  await act(async () => {
    instance.input.updateRawValue(updater);
  });
}

/** The text `updateRawValue` hands its updater, which leaves the draft as is. */
async function previousRawValue(instance: ChatInstance): Promise<string> {
  let seen: string;
  await updateRawValue(instance, (previous) => {
    seen = previous;
    return previous;
  });
  return seen;
}

/** Each `state:change` from now on, as the input's text and doc. */
function recordInputChanges(instance: ChatInstance) {
  const changes: { rawValue: string; content: JSONContent }[] = [];
  instance.on({
    type: BusEventType.STATE_CHANGE,
    handler: (event: BusEventStateChange) => {
      const { input } = event.newState;
      if (JSON.stringify(input) !== JSON.stringify(event.previousState.input)) {
        changes.push({ rawValue: input.rawValue, content: input.content });
      }
    },
  });
  return changes;
}

// @covers state.input state.input.rawValue state.input.content state.input.structuredData
describe('state.input', () => {
  contractSetup();

  it('starts with an empty draft and no structured data', async () => {
    const { instance } = await openChat();
    const { input } = instance.state.get();
    expect(input.rawValue).toBe('');
    expect(input.content).toEqual(EMPTY_DOC);
    expect(input.structuredData).toBeUndefined();
  });

  it('follows what the user types', async () => {
    const { instance } = await openChat();
    await typeText('typed by hand');
    expect(instance.state.get().input.rawValue).toBe('typed by hand');
    expect(instance.state.get().input.content).toEqual(
      textDoc('typed by hand')
    );
  });

  it('publishes the doc as a frozen snapshot', async () => {
    const { instance } = await openChat();
    await updateContent(instance, () => textDoc('draft'));
    expect(Object.isFrozen(instance.state.get().input.content)).toBe(true);
  });

  it('keeps a typed newline in the plain field, as a line break', async () => {
    const { instance } = await openChat();
    await typeText('one\ntwo');
    expect(instance.state.get().input.rawValue).toBe('one\ntwo');
    expect(instance.state.get().input.content).toEqual(LINE_BREAK_DOC);
  });

  it('reads a paragraph break as two newlines and a line break as one in the plain field', async () => {
    const { instance } = await openChat();
    await updateContent(instance, () => BREAKS_DOC);
    expect(instance.state.get().input.rawValue).toBe('one\ntwo\n\nthree');
    expect(instance.state.get().input.content).toEqual(BREAKS_DOC);
    expect(inputField().value).toBe('one\ntwo\n\nthree');
    expect(await previousRawValue(instance)).toBe('one\ntwo\n\nthree');
  });

  it('reads a paragraph break as two newlines and a line break as one in the rich editor', async () => {
    const { instance } = await openChat();
    await act(async () => {
      await instance.input.getEditor();
    });
    await updateContent(instance, () => BREAKS_DOC);
    expect(instance.state.get().input.rawValue).toBe('one\ntwo\n\nthree');
    expect(instance.state.get().input.content).toEqual(BREAKS_DOC);
    expect(await previousRawValue(instance)).toBe('one\ntwo\n\nthree');
  });
});

// @covers instance.input instance.input.updateContent state.input.rawValue state.input.content
describe('input.updateContent', () => {
  contractSetup();

  let consoleError: jest.SpyInstance;
  let consoleWarn: jest.SpyInstance;
  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleError?.mockRestore();
    consoleWarn?.mockRestore();
  });

  it('replaces the draft, and the field shows it', async () => {
    const { instance } = await openChat();
    await updateContent(instance, () => textDoc('hello'));
    expect(instance.state.get().input.rawValue).toBe('hello');
    expect(instance.state.get().input.content).toEqual(textDoc('hello'));
    expect(inputField().value).toBe('hello');
  });

  it('gives the updater the current doc', async () => {
    const { instance } = await openChat();
    await typeText('typed');
    const seen: JSONContent[] = [];
    await updateContent(instance, (previous) => {
      seen.push(previous);
      return textDoc('next');
    });
    expect(seen).toEqual([textDoc('typed')]);
  });

  it('keeps no link to the doc the updater got or returned', async () => {
    const { instance } = await openChat();
    await updateContent(instance, () => textDoc('first'));
    const returned = textDoc('second');
    await updateContent(instance, (previous) => {
      previous.content = [];
      return returned;
    });
    returned.content[0].content[0].text = 'changed later';
    expect(instance.state.get().input.rawValue).toBe('second');
    expect(instance.state.get().input.content).toEqual(textDoc('second'));
  });

  it('publishes matching rawValue and content in every state:change', async () => {
    const { instance } = await openChat();
    const changes = recordInputChanges(instance);
    await updateContent(instance, () => textDoc('together'));
    await pause();
    expect(changes.length).toBeGreaterThan(0);
    for (const change of changes) {
      expect(change).toEqual({
        rawValue: 'together',
        content: textDoc('together'),
      });
    }
  });

  it('resolves, keeps the draft, and logs the error when the updater throws', async () => {
    const { instance } = await openChat();
    await updateContent(instance, () => textDoc('kept'));
    consoleError.mockClear();
    await expect(
      instance.input.updateContent(() => {
        throw new Error('host updater failed');
      })
    ).resolves.toBeUndefined();
    expect(instance.state.get().input.rawValue).toBe('kept');
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('updating the input content'),
      expect.objectContaining({ message: 'host updater failed' })
    );
  });

  // @covers config.input.tiptap
  it('loads the rich editor for a node a host extension adds, and keeps the node', async () => {
    const { instance } = await openChat(CHIP_CONFIG);
    await updateContent(instance, () => chipDoc('hi '));
    expect(instance.state.get().input.content).toEqual(chipDoc('hi '));
    expect(instance.state.get().input.rawValue).toBe('hi ');
    const editor = await instance.input.getEditor();
    expect(editor.getJSON()).toEqual(chipDoc('hi '));
  });

  it('keeps the draft and rejects with a TypeError naming a mark no extension supports', async () => {
    const { instance } = await openChat();
    await updateContent(instance, () => textDoc('earlier draft'));
    let result: Promise<void>;
    await act(async () => {
      result = instance.input.updateContent(() => ({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
            ],
          },
        ],
      }));
      await result.catch(() => {});
    });
    await expect(result).rejects.toThrow(TypeError);
    await expect(result).rejects.toThrow(/\bbold\b/);
    expect(instance.state.get().input.rawValue).toBe('earlier draft');
    expect(instance.state.get().input.content).toEqual(
      textDoc('earlier draft')
    );
  });

  // @covers config.input.tiptap
  it('clears a rich draft with an empty doc', async () => {
    const { instance } = await openChat(CHIP_CONFIG);
    await updateContent(instance, () => chipDoc('hi '));
    await updateContent(instance, () => ({ type: 'doc', content: [] }));
    expect(instance.state.get().input.rawValue).toBe('');
    expect(instance.state.get().input.content).toEqual(EMPTY_DOC);
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it('seeds plain text while the input is hidden, and rejects a rich doc', async () => {
    const { instance } = await openChat({ input: { isVisible: false } });
    await updateContent(instance, () => textDoc('seeded'));
    expect(instance.state.get().input.rawValue).toBe('seeded');
    expect(instance.state.get().input.content).toEqual(textDoc('seeded'));

    await expect(
      instance.input.updateContent(() => chipDoc('rich'))
    ).rejects.toThrow();
    expect(instance.state.get().input.rawValue).toBe('seeded');
  });

  it('seeds the draft from onBeforeRender, which the field shows and a send uses', async () => {
    const sent: string[] = [];
    const { instance } = await contractChat({
      messaging: {
        skipWelcome: true,
        customSendMessage: async (request) => {
          sent.push(request.input.text);
        },
      },
      onBeforeRender: (handed) => {
        handed.input.updateContent(() => textDoc('early'));
      },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    await pause();
    expect(instance.state.get().input.rawValue).toBe('early');
    await waitFor(() =>
      expect(
        allByTestId(PageObjectId.INPUT).map(
          (each) => (each as HTMLTextAreaElement).value
        )
      ).toEqual(['early'])
    );
    await act(async () => {
      getByTestId(PageObjectId.INPUT_SEND).click();
    });
    await waitFor(() => expect(sent).toEqual(['early']));
  });
});

// @covers instance.input instance.input.updateRawValue state.input.rawValue state.input.content
describe('input.updateRawValue', () => {
  contractSetup();

  let consoleError: jest.SpyInstance;
  let consoleWarn: jest.SpyInstance;
  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleError?.mockRestore();
    consoleWarn?.mockRestore();
  });

  it('replaces the draft with plain text, and the field shows it', async () => {
    const { instance } = await openChat();
    await updateRawValue(instance, () => 'hello');
    expect(instance.state.get().input.rawValue).toBe('hello');
    expect(instance.state.get().input.content).toEqual(textDoc('hello'));
    expect(inputField().value).toBe('hello');
  });

  it('keeps a newline in the plain field, as a line break', async () => {
    const { instance } = await openChat();
    await updateRawValue(instance, () => 'one\ntwo');
    expect(instance.state.get().input.rawValue).toBe('one\ntwo');
    expect(instance.state.get().input.content).toEqual(LINE_BREAK_DOC);
  });

  it('gives the updater the current text', async () => {
    const { instance } = await openChat();
    await typeText('typed');
    const seen: string[] = [];
    await updateRawValue(instance, (previous) => {
      seen.push(previous);
      return `${previous}!`;
    });
    expect(seen).toEqual(['typed']);
    expect(instance.state.get().input.rawValue).toBe('typed!');
  });

  it('turns a non-string result into text, and null into an empty draft', async () => {
    const { instance } = await openChat();
    await updateRawValue(instance, () => 42 as unknown as string);
    expect(instance.state.get().input.rawValue).toBe('42');
    await updateRawValue(instance, () => null as unknown as string);
    expect(instance.state.get().input.rawValue).toBe('');
  });

  it('keeps the draft and logs the error when the updater throws', async () => {
    const { instance } = await openChat();
    await updateRawValue(instance, () => 'kept');
    consoleError.mockClear();
    expect(() =>
      instance.input.updateRawValue(() => {
        throw new Error('host updater failed');
      })
    ).not.toThrow();
    expect(instance.state.get().input.rawValue).toBe('kept');
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('updating the input value'),
      expect.objectContaining({ message: 'host updater failed' })
    );
  });

  it('publishes the new text and the new doc in one change in the plain field', async () => {
    const { instance } = await openChat();
    const changes = recordInputChanges(instance);
    await updateRawValue(instance, () => 'next');
    await pause();
    expect(changes).toEqual([{ rawValue: 'next', content: textDoc('next') }]);
  });

  it('turns a newline into a line break in the rich editor', async () => {
    const { instance } = await openChat();
    await act(async () => {
      await instance.input.getEditor();
    });
    await updateRawValue(instance, () => 'one\ntwo');
    expect(instance.state.get().input.rawValue).toBe('one\ntwo');
    expect(instance.state.get().input.content).toEqual(LINE_BREAK_DOC);
  });

  // @covers config.input.tiptap
  it('seeds a multi-line draft from onBeforeRender, which the rich editor shows and a send uses', async () => {
    const sent: string[] = [];
    const { instance } = await contractChat({
      ...CHIP_CONFIG,
      messaging: {
        skipWelcome: true,
        customSendMessage: async (request) => {
          sent.push(request.input.text);
        },
      },
      onBeforeRender: (handed) => {
        handed.input.updateRawValue(() => 'one\ntwo');
      },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    let editor: Awaited<ReturnType<ChatInstance['input']['getEditor']>>;
    await act(async () => {
      editor = await instance.input.getEditor();
    });
    await waitFor(() => expect(editor.getJSON()).toEqual(LINE_BREAK_DOC));
    expect(instance.state.get().input.rawValue).toBe('one\ntwo');
    await act(async () => {
      getByTestId(PageObjectId.INPUT_SEND).click();
    });
    await waitFor(() => expect(sent).toEqual(['one\ntwo']));
  });

  // @covers config.input.tiptap
  it('throws without calling the updater while the doc has a non-text node', async () => {
    const { instance } = await openChat(CHIP_CONFIG);
    await updateContent(instance, () => chipDoc('hi '));
    const updater = jest.fn(() => 'plain');
    expect(() => instance.input.updateRawValue(updater)).toThrow();
    expect(updater).not.toHaveBeenCalled();
    expect(instance.state.get().input.content).toEqual(chipDoc('hi '));
  });
});

// @covers instance.input instance.input.getEditor state.input.rawValue state.input.content
describe('input.getEditor', () => {
  contractSetup();

  it('carries typed text over into the editor it loads', async () => {
    const { instance } = await openChat();
    await typeText('carried over');
    let editor: Awaited<ReturnType<ChatInstance['input']['getEditor']>>;
    await act(async () => {
      editor = await instance.input.getEditor();
    });
    expect(editor.getText()).toBe('carried over');
    expect(instance.state.get().input.rawValue).toBe('carried over');
  });

  it('resolves the same editor to concurrent and later calls', async () => {
    const { instance } = await openChat();
    let editors: unknown[];
    await act(async () => {
      editors = await Promise.all([
        instance.input.getEditor(),
        instance.input.getEditor(),
      ]);
    });
    const later = await instance.input.getEditor();
    expect(editors[0]).toBe(editors[1]);
    expect(later).toBe(editors[0]);
  });

  it('publishes the edits a host makes through the editor', async () => {
    const { instance } = await openChat();
    const editor = await act(async () => instance.input.getEditor());
    await act(async () => {
      editor.commands.setContent(textDoc('from the editor'));
    });
    expect(instance.state.get().input.rawValue).toBe('from the editor');
    expect(instance.state.get().input.content).toEqual(
      textDoc('from the editor')
    );
    await updateContent(instance, () => textDoc('from the host'));
    expect(editor.getJSON()).toEqual(textDoc('from the host'));
  });

  it('rejects while the input is hidden', async () => {
    const { instance } = await openChat({ input: { isVisible: false } });
    await expect(instance.input.getEditor()).rejects.toThrow(
      'Input is not currently rendered'
    );
  });

  it('rejects from onBeforeRender', async () => {
    let result: Promise<unknown>;
    await contractChat({
      onBeforeRender: (handed) => {
        result = handed.input.getEditor();
        result.catch(() => {});
      },
    });
    await expect(result).rejects.toThrow('Input is not currently rendered');
  });
});

// @covers instance.input instance.input.updateContent instance.input.updateRawValue
// @covers instance.input.updateStructuredData instance.input.getEditor
describe('input methods while a custom prompt line has content', () => {
  contractSetup();

  it('reject every write without calling its updater, and leave the draft', async () => {
    const { instance } = await openChat();
    await updateContent(instance, () => textDoc('parked'));
    await act(async () => {
      instance.writeableElements[
        WriteableElementName.CUSTOM_PROMPT_LINE
      ].append(document.createElement('input'));
    });
    const before = instance.state.get().input;
    const updater = jest.fn();
    const hostOwned =
      'Input content is host-owned while CUSTOM_PROMPT_LINE has content.';

    expect(() => instance.input.updateRawValue(updater)).toThrow(hostOwned);
    expect(() => instance.input.updateStructuredData(updater)).toThrow(
      hostOwned
    );
    await expect(instance.input.updateContent(updater)).rejects.toThrow(
      hostOwned
    );
    await expect(instance.input.getEditor()).rejects.toThrow(
      'Input is not currently rendered'
    );
    expect(updater).not.toHaveBeenCalled();
    expect(instance.state.get().input).toEqual(before);
  });
});
