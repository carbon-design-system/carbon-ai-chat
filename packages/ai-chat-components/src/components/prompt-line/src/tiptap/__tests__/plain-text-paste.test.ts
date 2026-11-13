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
import HardBreakNode from '@tiptap/extension-hard-break';
import ParagraphNode from '@tiptap/extension-paragraph';
import TextNode from '@tiptap/extension-text';

import { getRawText, textToDoc } from '../json-utils.js';
import { PlainTextPaste } from '../plain-text-paste.js';

function makeEditor(initialContent = '', { hardBreak = true } = {}) {
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const editor = new Editor({
    element: mount,
    extensions: [
      DocumentNode,
      ParagraphNode,
      TextNode,
      ...(hardBreak ? [HardBreakNode] : []),
      PlainTextPaste,
    ],
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

function dispatchPaste(editor: Editor, text: string): void {
  const event = {
    clipboardData: { getData: () => text },
  } as unknown as ClipboardEvent;
  editor.view.someProp('handlePaste', (fn) =>
    fn(editor.view, event, null as never)
  );
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

    dispatchPaste(editor, 'hello');

    expect(getRawText(editor.getJSON())).to.equal('hello');
  });

  it('inserts at the cursor without replacing existing content', () => {
    const { editor, cleanup: c } = makeEditor('world');
    cleanup = c;

    // Place cursor at the start of "world" and paste "hello " — should prepend.
    editor.commands.setTextSelection(1);
    dispatchPaste(editor, 'hello ');

    expect(getRawText(editor.getJSON())).to.equal('hello world');
  });

  it('turns a single newline into a line break within the surrounding paragraph', () => {
    const { editor, cleanup: c } = makeEditor('world');
    cleanup = c;

    editor.commands.setTextSelection(3);
    dispatchPaste(editor, 'a\nb');

    expect(editor.getJSON().content?.length).to.equal(1);
    expect(getRawText(editor.getJSON())).to.equal('woa\nbrld');
  });

  it('starts a new paragraph at a blank line, merged with the surrounding text', () => {
    const { editor, cleanup: c } = makeEditor('world');
    cleanup = c;

    editor.commands.setTextSelection(3);
    dispatchPaste(editor, 'a\n\nb');

    expect(editor.getJSON().content?.length).to.equal(2);
    expect(getRawText(editor.getJSON())).to.equal('woa\n\nbrld');
  });

  it('reads back pasted text the way textToDoc builds it', () => {
    const { editor, cleanup: c } = makeEditor();
    cleanup = c;

    const text = 'one\ntwo\n\nthree\n\n\nfour';
    dispatchPaste(editor, text);

    expect(editor.getJSON()).to.deep.equal(textToDoc(text));
    expect(getRawText(editor.getJSON())).to.equal(text);
  });

  it('treats Windows and old Mac line endings as newlines', () => {
    const { editor, cleanup: c } = makeEditor();
    cleanup = c;

    dispatchPaste(editor, 'a\r\nb\r\rc');

    expect(getRawText(editor.getJSON())).to.equal('a\nb\n\nc');
  });

  it('makes one paragraph per line in a schema without hardBreak', () => {
    const { editor, cleanup: c } = makeEditor('world', { hardBreak: false });
    cleanup = c;

    editor.commands.setTextSelection(3);
    dispatchPaste(editor, 'a\nb');

    expect(editor.getJSON().content?.length).to.equal(2);
    expect(getRawText(editor.getJSON())).to.equal('woa\n\nbrld');
  });

  it('collapses the caret after text pasted over a selection', () => {
    const { editor, cleanup: c } = makeEditor('world');
    cleanup = c;

    editor.commands.setTextSelection({ from: 2, to: 4 });
    dispatchPaste(editor, 'XY');
    editor.commands.insertContent('Z');

    expect(getRawText(editor.getJSON())).to.equal('wXYZld');
  });

  it('keeps every pasted line when replacing a select-all', () => {
    const { editor, cleanup: c } = makeEditor('<p>one</p><p>two</p>');
    cleanup = c;

    editor.commands.selectAll();
    dispatchPaste(editor, '\n\n');
    editor.commands.insertContent('Z');

    expect(editor.getJSON().content?.length).to.equal(2);
    expect(getRawText(editor.getJSON())).to.equal('\n\nZ');
  });

  it('keeps a pasted lone newline as a line break when replacing a select-all', () => {
    const { editor, cleanup: c } = makeEditor('<p>one</p><p>two</p>');
    cleanup = c;

    editor.commands.selectAll();
    dispatchPaste(editor, '\n');
    editor.commands.insertContent('Z');

    expect(editor.getJSON().content?.length).to.equal(1);
    expect(getRawText(editor.getJSON())).to.equal('\nZ');
  });
});
