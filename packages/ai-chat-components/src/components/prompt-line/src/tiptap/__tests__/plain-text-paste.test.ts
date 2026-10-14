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
import { Fragment, Slice } from '@tiptap/pm/model';

import { getRawText } from '../json-utils.js';
import { linesToNodes, PlainTextPaste } from '../plain-text-paste.js';

function makeEditor(initialContent = '') {
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const editor = new Editor({
    element: mount,
    extensions: [DocumentNode, ParagraphNode, TextNode, PlainTextPaste],
    content: initialContent,
  });
  return {
    editor,
    cleanup: () => {
      editor.destroy();
      mount.remove();
    },
  };
}

function applyPaste(editor: Editor, text: string): void {
  const { state } = editor.view;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const nodes = linesToNodes(state.schema, lines);
  const { from, to } = state.selection;
  const slice = new Slice(Fragment.from(nodes), 1, 1);
  editor.view.dispatch(state.tr.replace(from, to, slice));
}

describe('tiptap/plain-text-paste', function () {
  let cleanup: (() => void) | undefined;
  let initialBodyChildCount: number;

  beforeEach(() => {
    initialBodyChildCount = document.body.childElementCount;
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    expect(document.body.childElementCount).to.equal(initialBodyChildCount);
  });

  it('does not produce a leading newline when pasting into an empty editor', () => {
    const { editor, cleanup: c } = makeEditor();
    cleanup = c;

    applyPaste(editor, 'hello');

    expect(getRawText(editor.getJSON())).to.equal('hello');
  });

  it('inserts at the cursor without replacing existing content', () => {
    const { editor, cleanup: c } = makeEditor('world');
    cleanup = c;

    // Place cursor at the start of "world" and paste "hello " — should prepend.
    editor.commands.setTextSelection(1);
    applyPaste(editor, 'hello ');

    expect(getRawText(editor.getJSON())).to.equal('hello world');
  });
});
