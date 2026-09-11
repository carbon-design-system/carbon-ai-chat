/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';
import { Editor } from '@tiptap/core';
import DocumentNode from '@tiptap/extension-document';
import ParagraphNode from '@tiptap/extension-paragraph';
import TextNode from '@tiptap/extension-text';

import { carbonCommand, carbonMention } from '../carbon-mention.js';
import { setHostOriginMeta } from '../origin-meta.js';
import type { SuggestionItem, TriggerSuggestionConfig } from '../types.js';

const ITEMS: SuggestionItem[] = [
  { id: 'u1', label: 'Alice' },
  { id: 'u2', label: 'Bob' },
];

const DEFAULT_TRIGGER: Record<'mention' | 'command', string> = {
  mention: '@',
  command: '/',
};

function makeEditor(
  type: 'mention' | 'command' = 'mention',
  overrides: Partial<TriggerSuggestionConfig> = {},
  trigger = DEFAULT_TRIGGER[type]
) {
  const factory = type === 'command' ? carbonCommand : carbonMention;
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const editor = new Editor({
    element: mount,
    extensions: [
      DocumentNode,
      ParagraphNode,
      TextNode,
      factory({ trigger, items: ITEMS, ...overrides }),
    ],
    content: '',
  });
  return {
    editor,
    cleanup: () => {
      editor.destroy();
      mount.remove();
    },
  };
}

/** Insert an atomic mention node carrying the given attrs at the cursor. */
function insertMention(
  editor: Editor,
  attrs: {
    id: string;
    label: string;
    value?: string;
    data?: unknown;
    mentionSuggestionChar?: string;
  }
) {
  editor.commands.insertContent({
    type: 'mention',
    attrs: { value: null, data: null, ...attrs },
  });
}

/** Document positions of every token node of the given type, in order. */
function tokenPositions(editor: Editor, type: 'mention' | 'command'): number[] {
  const positions: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === type) {
      positions.push(pos);
    }
  });
  return positions;
}

/** Delete the mention node at `pos` (atomic inline nodes have size 1). */
function deleteMentionAt(editor: Editor, pos: number) {
  editor
    .chain()
    .deleteRange({ from: pos, to: pos + 1 })
    .run();
}

describe('tiptap/carbon-mention onRemove', function () {
  it('fires once with the reconstructed item when a mention is deleted', () => {
    const removed: SuggestionItem[] = [];
    const { editor, cleanup } = makeEditor('mention', {
      onRemove: (item) => removed.push(item),
    });

    insertMention(editor, { id: 'u1', label: 'Alice', value: '@alice' });
    expect(removed).to.have.lengthOf(0);

    deleteMentionAt(editor, tokenPositions(editor, 'mention')[0]);

    expect(removed).to.have.lengthOf(1);
    expect(removed[0].id).to.equal('u1');
    expect(removed[0].label).to.equal('Alice');
    expect(removed[0].value).to.equal('@alice');
    cleanup();
  });

  it('carries custom fields stashed in attrs.data back onto the item', () => {
    const removed: SuggestionItem[] = [];
    const { editor, cleanup } = makeEditor('mention', {
      onRemove: (item) => removed.push(item),
    });

    insertMention(editor, {
      id: 'u1',
      label: 'Alice',
      data: { team: 'design' },
    });
    deleteMentionAt(editor, tokenPositions(editor, 'mention')[0]);

    expect(removed).to.have.lengthOf(1);
    expect((removed[0] as Record<string, unknown>).team).to.equal('design');
    cleanup();
  });

  it('fires once per removed instance for duplicate ids (multiset diff)', () => {
    const removed: SuggestionItem[] = [];
    const { editor, cleanup } = makeEditor('mention', {
      onRemove: (item) => removed.push(item),
    });

    // Two chips with the SAME id, separated by a space.
    insertMention(editor, { id: 'u1', label: 'Alice' });
    editor.commands.insertContent(' ');
    insertMention(editor, { id: 'u1', label: 'Alice' });

    // Delete just one of the two — exactly one onRemove.
    const positions = tokenPositions(editor, 'mention');
    expect(positions).to.have.lengthOf(2);
    deleteMentionAt(editor, positions[positions.length - 1]);
    expect(removed).to.have.lengthOf(1);

    // Delete the survivor — one more.
    deleteMentionAt(editor, tokenPositions(editor, 'mention')[0]);
    expect(removed).to.have.lengthOf(2);
    cleanup();
  });

  it('does NOT fire for host-origin (programmatic) removals', () => {
    const removed: SuggestionItem[] = [];
    const { editor, cleanup } = makeEditor('mention', {
      onRemove: (item) => removed.push(item),
    });

    insertMention(editor, { id: 'u1', label: 'Alice' });
    const pos = tokenPositions(editor, 'mention')[0];

    const tr = editor.state.tr.delete(pos, pos + 1);
    setHostOriginMeta(tr);
    editor.view.dispatch(tr);

    expect(removed).to.have.lengthOf(0);
    cleanup();
  });

  it('does not throw when no onRemove is configured', () => {
    const { editor, cleanup } = makeEditor('mention');

    insertMention(editor, { id: 'u1', label: 'Alice' });
    expect(() =>
      deleteMentionAt(editor, tokenPositions(editor, 'mention')[0])
    ).to.not.throw();

    expect(tokenPositions(editor, 'mention')).to.have.lengthOf(0);
    cleanup();
  });

  it('Backspace leaves the correct trigger char for carbonMention with custom trigger', () => {
    const { editor, cleanup } = makeEditor('mention', {}, '*');

    insertMention(editor, {
      id: 'u1',
      label: 'Alice',
      mentionSuggestionChar: '*',
    });

    // Place cursor immediately after the chip so Backspace targets it.
    const pos = tokenPositions(editor, 'mention')[0];
    editor.commands.setTextSelection(pos + 1);

    editor.commands.keyboardShortcut('Backspace');

    // The chip should be gone and replaced with the trigger character.
    expect(tokenPositions(editor, 'mention')).to.have.lengthOf(0);
    expect(editor.state.doc.textContent).to.equal('*');
    cleanup();
  });
});

describe('tiptap/carbon-command Backspace', function () {
  it('Backspace leaves "/" when using the default command trigger', () => {
    const { editor, cleanup } = makeEditor('command', {}, '/');

    editor.commands.insertContent({
      type: 'command',
      attrs: { id: 'c1', label: 'summarize', value: null, data: null },
    });

    // Place cursor immediately after the chip so Backspace targets it.
    const pos = tokenPositions(editor, 'command')[0];
    editor.commands.setTextSelection(pos + 1);

    editor.commands.keyboardShortcut('Backspace');

    // The chip should be gone and "/" left behind.
    expect(tokenPositions(editor, 'command')).to.have.lengthOf(0);
    expect(editor.state.doc.textContent).to.equal('/');
    cleanup();
  });

  describe('the data attr contract', () => {
    it('keeps host custom fields out of HTML but inside the JSON', () => {
      const { editor, cleanup } = makeEditor('mention');

      editor.commands.insertContent({
        type: 'mention',
        attrs: {
          id: 'u1',
          label: 'Alice',
          value: '@alice',
          data: { team: 'design' },
        },
      });

      // renderHTML returns nothing for `data`, so the object never reaches
      // serialized markup — no "[object Object]", no host fields in a copy.
      expect(editor.getHTML()).to.not.contain('object Object');
      expect(editor.getHTML()).to.not.contain('design');

      // The JSON round-trip is the path that has to keep them.
      const [node] = (editor.getJSON().content?.[0].content ?? []).filter(
        (child) => child.type === 'mention'
      );
      expect(node?.attrs?.data).to.deep.equal({ team: 'design' });
      cleanup();
    });

    // An array is `typeof 'object'`, so it clears a bare object check and
    // still spreads to index keys — it needs the same guard the string does.
    [
      { label: 'string', data: 'abc' },
      { label: 'array', data: ['a', 'b'] },
      { label: 'number', data: 42 },
    ].forEach(({ label, data }) => {
      it(`never spreads a ${label} data attr into the removed item`, () => {
        const removed: SuggestionItem[] = [];
        const { editor, cleanup } = makeEditor('mention', {
          onRemove: (item) => removed.push(item),
        });

        // insertContent takes a raw node spec, so a host can put anything in
        // attrs.data — this is the reachable route, not hand-authored HTML.
        editor.commands.insertContent({
          type: 'mention',
          attrs: { id: 'u1', label: 'Alice', value: '@alice', data },
        });

        const positions = tokenPositions(editor, 'mention');
        expect(positions).to.have.lengthOf(1);

        editor
          .chain()
          .deleteRange({ from: positions[0], to: positions[0] + 1 })
          .run();

        expect(removed).to.have.lengthOf(1);
        // Unguarded, 'abc' spreads to {0:'a',1:'b',2:'c'} and ['a','b'] to
        // {0:'a',1:'b'}.
        expect(removed[0]).to.not.have.property('0');
        expect(removed[0]).to.deep.equal({
          id: 'u1',
          label: 'Alice',
          value: '@alice',
        });
        cleanup();
      });
    });
  });
});
