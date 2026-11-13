/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The Tiptap input utilities, as a host uses them outside the chat: the
 * JSONContent helpers on plain docs, and the extension factories in a
 * standalone editor. The shared ones run against both entries. Inside the
 * chat, `config.input` drives the same factories (see `input/`).
 *
 * This file mounts no chat, so it doesn't call `contractSetup()`.
 */

import { Editor, Extensions, JSONContent, Node } from '@tiptap/core';

import * as aiChatEntry from '../../../../src/aiChatEntry';
import * as serverEntry from '../../../../src/serverEntry';
import type { SuggestionItem } from '../../../../src/aiChatEntry';

type SharedUtils = Pick<
  typeof serverEntry,
  | 'buildCarbonExtensions'
  | 'carbonAutocomplete'
  | 'carbonCommand'
  | 'carbonMention'
  | 'carbonStarterTrigger'
  | 'findNodesByType'
  | 'getRawText'
  | 'mapNodes'
  | 'removeNodesByType'
  | 'setHostOriginMeta'
  | 'textToDoc'
>;

const ENTRIES: [string, SharedUtils][] = [
  ['aiChatEntry', aiChatEntry],
  ['serverEntry', serverEntry],
];

function paragraph(...content: JSONContent[]): JSONContent {
  return content.length
    ? { type: 'paragraph', content }
    : { type: 'paragraph' };
}

function text(value: string, marks?: JSONContent['marks']): JSONContent {
  return marks
    ? { type: 'text', text: value, marks }
    : { type: 'text', text: value };
}

function doc(...content: JSONContent[]): JSONContent {
  return { type: 'doc', content };
}

const ALICE = {
  type: 'mention',
  attrs: { id: 'alice', label: 'Alice', value: '@alice' },
};
const SUMMARIZE = {
  type: 'command',
  attrs: { id: 'sum', label: 'Summarize', value: '/summarize' },
};

// @covers export.aiChatEntry.getRawText export.serverEntry.getRawText
// @covers export.aiChatEntry.textToDoc export.serverEntry.textToDoc
describe.each(ENTRIES)('%s plain-text projection', (_, utils) => {
  it('joins text, token values, hard breaks, and paragraph breaks', () => {
    const content = doc(
      paragraph(text('hi '), ALICE, text(' and '), SUMMARIZE),
      paragraph(text('line'), { type: 'hardBreak' }, text('break')),
      paragraph()
    );
    expect(utils.getRawText(content)).toBe(
      'hi @alice and /summarize\nline\nbreak\n'
    );
  });

  it('uses a token label when it has no value', () => {
    const bob = { type: 'mention', attrs: { id: 'bob', label: 'Bob' } };
    expect(utils.getRawText(doc(paragraph(bob)))).toBe('Bob');
  });

  it('uses an empty token value as is, not the label', () => {
    // The JSDoc says tokens contribute `attrs.value || attrs.label`; main
    // uses any string value, so an empty one contributes nothing.
    const empty = {
      type: 'mention',
      attrs: { id: 'bob', label: 'Bob', value: '' },
    };
    expect(utils.getRawText(doc(paragraph(empty)))).toBe('');
  });

  it('builds one paragraph per line', () => {
    expect(utils.textToDoc('one\n\ntwo')).toEqual(
      doc(paragraph(text('one')), paragraph(), paragraph(text('two')))
    );
  });

  it.each(['', 'one line', 'a\nb', '\n\ntrailing\n'])(
    'round-trips %j through textToDoc and getRawText',
    (value) => {
      expect(utils.getRawText(utils.textToDoc(value))).toBe(value);
    }
  );
});

// @covers export.aiChatEntry.removeNodesByType export.serverEntry.removeNodesByType
// @covers export.aiChatEntry.mapNodes export.serverEntry.mapNodes
// @covers export.aiChatEntry.findNodesByType export.serverEntry.findNodesByType
describe.each(ENTRIES)('%s JSONContent walkers', (_, utils) => {
  const BOLD = [{ type: 'bold' }];
  const SOURCE = doc(
    paragraph(text('a', BOLD), ALICE, text('b')),
    paragraph(SUMMARIZE, ALICE)
  );

  it('removes every node of the given types and keeps text marks', () => {
    expect(utils.removeNodesByType(SOURCE, 'mention', 'command')).toEqual(
      // A paragraph emptied this way keeps an empty `content` array.
      doc(paragraph(text('a', BOLD), text('b')), {
        type: 'paragraph',
        content: [],
      })
    );
  });

  it('returns a new tree and leaves its input unchanged', () => {
    const before = JSON.parse(JSON.stringify(SOURCE));
    utils.removeNodesByType(SOURCE, 'mention');
    expect(SOURCE).toEqual(before);
  });

  it('finds the nodes of one type in document order', () => {
    const found = utils
      .findNodesByType(SOURCE, 'mention')
      .map((node) => node.attrs?.id);
    expect(found).toEqual(['alice', 'alice']);
    expect(utils.findNodesByType(SOURCE, 'paragraph')).toHaveLength(2);
  });

  it('maps children before their parents', () => {
    const visited: string[] = [];
    utils.mapNodes(doc(paragraph(text('x'), ALICE)), (node) => {
      visited.push(node.type ?? '');
      return node;
    });
    expect(visited).toEqual(['text', 'mention', 'paragraph', 'doc']);
  });

  it('drops a node mapped to null and swaps in a returned node', () => {
    const mapped = utils.mapNodes(SOURCE, (node) => {
      if (node.type === 'command') {
        return null;
      }
      return node.type === 'mention' ? text(String(node.attrs?.value)) : node;
    });
    expect(utils.getRawText(mapped)).toBe('a@aliceb\n@alice');
    expect(utils.findNodesByType(mapped, 'command')).toEqual([]);
  });

  it('gives an empty doc when the root is mapped to null', () => {
    // Not in the JSDoc; this is main's fallback for a removed root.
    expect(utils.mapNodes(SOURCE, () => null)).toEqual(doc(paragraph()));
  });
});

// A minimal schema, so a standalone editor needs no extra Tiptap packages.
const Doc = Node.create({ name: 'doc', topNode: true, content: 'block+' });
const Paragraph = Node.create({
  name: 'paragraph',
  group: 'block',
  content: 'inline*',
  parseHTML: () => [{ tag: 'p' }],
  renderHTML: ({ HTMLAttributes }) => ['p', HTMLAttributes, 0],
});
const Text = Node.create({ name: 'text', group: 'inline' });

const editors: Editor[] = [];

/**
 * Mounts a standalone editor. Token node views need a mounted view, so
 * content goes in after the mount, through `setContent`.
 */
function mountEditor(extensions: Extensions): Editor {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const editor = new Editor({
    element,
    extensions: [Doc, Paragraph, Text, ...extensions],
  });
  editors.push(editor);
  return editor;
}

/** The starter items in an editor's storage, under the extension's name. */
function starterItems(editor: Editor): SuggestionItem[] {
  const storage = editor.storage as unknown as Record<
    string,
    { items: SuggestionItem[] }
  >;
  return storage.carbonStarterTrigger.items;
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  document.body.innerHTML = '';
});

const ITEM: SuggestionItem = {
  id: 'alice',
  label: 'Alice',
  value: '@alice',
};

// @covers export.aiChatEntry.carbonMention export.serverEntry.carbonMention
// @covers export.aiChatEntry.carbonCommand export.serverEntry.carbonCommand
describe.each(ENTRIES)('%s token factories', (_, utils) => {
  it('carbonMention adds a mention node that keeps its attributes', () => {
    const editor = mountEditor([
      utils.carbonMention({ trigger: '@', items: [] }),
    ]);
    const attrs = {
      id: 'alice',
      label: 'Alice',
      value: '@alice',
      data: { team: 'a' },
    };
    editor.commands.setContent(doc(paragraph({ type: 'mention', attrs })));
    const [node] = utils.findNodesByType(editor.getJSON(), 'mention');
    expect(node.attrs).toMatchObject(attrs);
  });

  it('carbonCommand adds a command node', () => {
    const editor = mountEditor([
      utils.carbonCommand({ trigger: '/', items: [] }),
    ]);
    editor.commands.setContent(doc(paragraph(SUMMARIZE)));
    expect(utils.getRawText(editor.getJSON())).toBe('/summarize');
    expect(utils.findNodesByType(editor.getJSON(), 'command')).toHaveLength(1);
  });

  it('calls onSelect and onRemove with the item when a user edit adds or removes a token', () => {
    const onSelect = jest.fn();
    const onRemove = jest.fn();
    const editor = mountEditor([
      utils.carbonMention({ trigger: '@', items: [], onSelect, onRemove }),
    ]);
    editor.commands.setContent(
      doc(
        paragraph({ type: 'mention', attrs: { ...ITEM, data: { team: 'a' } } })
      )
    );
    expect(onSelect.mock.calls).toEqual([[{ ...ITEM, team: 'a' }]]);
    editor.commands.clearContent(true);
    expect(onRemove.mock.calls).toEqual([[{ ...ITEM, team: 'a' }]]);
  });
});

// @covers export.aiChatEntry.setHostOriginMeta export.serverEntry.setHostOriginMeta
describe.each(ENTRIES)('%s setHostOriginMeta', (_, utils) => {
  it('keeps onSelect and onRemove from firing for a tagged transaction', () => {
    const onSelect = jest.fn();
    const onRemove = jest.fn();
    const editor = mountEditor([
      utils.carbonMention({ trigger: '@', items: [], onSelect, onRemove }),
    ]);
    const mention = editor.schema.nodes.mention.create(ITEM);
    editor.view.dispatch(
      utils.setHostOriginMeta(editor.state.tr.insert(1, mention))
    );
    expect(utils.getRawText(editor.getJSON())).toBe('@alice');

    const end = editor.state.doc.content.size - 1;
    editor.view.dispatch(
      utils.setHostOriginMeta(editor.state.tr.delete(1, end))
    );
    expect(utils.getRawText(editor.getJSON())).toBe('');
    expect(onSelect).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('leaves an untagged transaction to fire them', () => {
    const onSelect = jest.fn();
    const editor = mountEditor([
      utils.carbonMention({ trigger: '@', items: [], onSelect }),
    ]);
    const mention = editor.schema.nodes.mention.create(ITEM);
    editor.view.dispatch(editor.state.tr.insert(1, mention));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

// @covers export.aiChatEntry.carbonStarterTrigger export.serverEntry.carbonStarterTrigger
describe.each(ENTRIES)('%s carbonStarterTrigger', (_, utils) => {
  it('holds its items in the editor storage, where a host can swap them', () => {
    const items: SuggestionItem[] = [{ id: 'hi', label: 'Say hi' }];
    const editor = mountEditor([utils.carbonStarterTrigger(items)]);
    expect(starterItems(editor)).toEqual(items);
  });
});

/**
 * The trigger reports an editor sends. The event name is the one
 * `carbonMention`'s JSDoc names; only `type` and `query` are read.
 */
function recordTriggers(
  editor: Editor
): Array<{ type: string; query: string } | null> {
  const reports: Array<{ type: string; query: string } | null> = [];
  editor.view.dom.addEventListener('cds-aichat-trigger-change', (event) => {
    const detail = (event as CustomEvent).detail;
    reports.push(detail && { type: detail.type, query: detail.query });
  });
  return reports;
}

// @covers export.aiChatEntry.carbonAutocomplete export.serverEntry.carbonAutocomplete
describe.each(ENTRIES)('%s carbonAutocomplete', (_, utils) => {
  it('reports the typed text as its query and inserts nothing', () => {
    const editor = mountEditor([utils.carbonAutocomplete()]);
    const reports = recordTriggers(editor);
    editor.commands.focus();
    editor.commands.insertContent('hel');
    editor.commands.insertContent(' @al');
    expect(reports).toEqual([
      { type: 'autocomplete', query: 'hel' },
      { type: 'autocomplete', query: 'hel @al' },
    ]);
    expect(utils.getRawText(editor.getJSON())).toBe('hel @al');
  });

  it('stands down while the trailing word starts with an excluded trigger', () => {
    const editor = mountEditor([
      utils.carbonAutocomplete([{ char: '@', position: 'anywhere' }]),
    ]);
    const reports = recordTriggers(editor);
    editor.commands.focus();
    editor.commands.insertContent('hel');
    editor.commands.insertContent(' @al');
    expect(reports).toEqual([{ type: 'autocomplete', query: 'hel' }, null]);
  });
});

// @covers export.aiChatEntry.buildCarbonExtensions export.serverEntry.buildCarbonExtensions
describe.each(ENTRIES)('%s buildCarbonExtensions', (_, utils) => {
  it('builds one extension per supplied config, in a fixed order', () => {
    const extensions = utils.buildCarbonExtensions({
      starters: { items: [] },
      autocomplete: { items: [] },
      command: { trigger: '/', items: [] },
      mention: { trigger: '@', items: [] },
    });
    expect(extensions.map((extension) => extension.name)).toEqual([
      'mention',
      'command',
      'carbonAutocomplete',
      'carbonStarterTrigger',
    ]);
  });

  it('leaves out the extension of each config left out', () => {
    expect(utils.buildCarbonExtensions({})).toEqual([]);
    const extensions = utils.buildCarbonExtensions({
      command: { trigger: '/', items: [] },
    });
    expect(extensions.map((extension) => extension.name)).toEqual(['command']);
  });

  it('builds extensions a standalone editor can run', () => {
    const editor = mountEditor(
      utils.buildCarbonExtensions({
        mention: { trigger: '@', items: [] },
        starters: { items: [ITEM] },
      })
    );
    editor.commands.setContent(doc(paragraph(text('hi '), ALICE)));
    expect(utils.getRawText(editor.getJSON())).toBe('hi @alice');
    expect(starterItems(editor)).toEqual([ITEM]);
  });
});

// @covers export.aiChatEntry.renderTokenChip
describe('renderTokenChip', () => {
  const { renderTokenChip } = aiChatEntry;

  it('shows the label, or the value when there is no label', () => {
    const labelled = renderTokenChip({
      attrs: { id: 'alice', label: 'Alice', value: '@alice' },
      type: 'mention',
      context: 'composer',
    });
    const unlabelled = renderTokenChip({
      attrs: { id: 'alice', value: '@alice' },
      type: 'mention',
      context: 'historical',
    });
    expect(labelled.textContent).toBe('Alice');
    expect(unlabelled.textContent).toBe('@alice');
  });

  it('prefixes the trigger stored on the token', () => {
    const chip = renderTokenChip({
      attrs: { id: 'sum', label: 'Summarize', trigger: '/' },
      type: 'command',
      context: 'composer',
    });
    expect(chip.textContent).toBe('/Summarize');
  });

  it('calls renderCustomToken with the id, label, and custom data', () => {
    const renderCustomToken = jest.fn(
      (_item: SuggestionItem): HTMLElement | null => null
    );
    renderTokenChip({
      attrs: {
        id: 'alice',
        label: 'Alice',
        value: '@alice',
        data: { team: 'a' },
      },
      config: { renderCustomToken },
      type: 'mention',
      context: 'composer',
    });
    // TokenChipAttrs' JSDoc says a custom renderer reads back the stored
    // `value` too; main passes only `id`, `label`, and the custom data.
    expect(renderCustomToken.mock.calls).toEqual([
      [{ id: 'alice', label: 'Alice', team: 'a' }],
    ]);
  });

  it('falls back to the default chip when renderCustomToken returns nothing', () => {
    const chip = renderTokenChip({
      attrs: { id: 'alice', label: 'Alice' },
      config: { renderCustomToken: () => null },
      type: 'mention',
      context: 'composer',
    });
    expect(chip.textContent).toBe('Alice');
  });

  it('falls back to the default chip and logs when renderCustomToken throws', () => {
    const error = jest.mocked(console.error);
    error.mockClear();
    const chip = renderTokenChip({
      attrs: { id: 'alice', label: 'Alice' },
      config: {
        renderCustomToken: () => {
          throw new Error('broken renderer');
        },
      },
      type: 'mention',
      context: 'composer',
    });
    expect(chip.textContent).toBe('Alice');
    expect(error).toHaveBeenCalledTimes(1);
  });
});

// @covers export.aiChatEntry.renderInLightDom
describe('renderInLightDom', () => {
  const { renderInLightDom } = aiChatEntry;

  it('returns a span container by default and a div when asked', () => {
    const content = document.createElement('b');
    expect(renderInLightDom({ content }).container.tagName).toBe('SPAN');
    expect(
      renderInLightDom({ content, containerTag: 'div' }).container.tagName
    ).toBe('DIV');
  });

  it('sends one bubbling, composed event from the dispatch target', () => {
    const dispatchTarget = new EventTarget();
    const dispatch = jest.spyOn(dispatchTarget, 'dispatchEvent');
    renderInLightDom({
      content: document.createElement('b'),
      dispatchTarget,
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    const [event] = dispatch.mock.calls[0];
    expect([event.bubbles, event.composed]).toEqual([true, true]);
  });
});
