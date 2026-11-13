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

import { getRawText, textOffsetToDocPos, textToDoc } from '../json-utils.js';

describe('textToDoc / getRawText round-trip', function () {
  // textToDoc is documented as the inverse of getRawText for plain text:
  // getRawText(textToDoc(s)) === s. Cover empty, single line, blank lines, and
  // leading/trailing newlines so a regression in either direction is caught.
  const cases = [
    '',
    'x',
    'x\ny',
    'x\ny\n',
    '\n',
    'a\n\nb',
    'a\n\n\nb',
    'a\n\n\n\nb',
    '\n\n',
    'line1\nline2\nline3',
  ];
  for (const value of cases) {
    it(`preserves ${JSON.stringify(value)}`, () => {
      expect(getRawText(textToDoc(value))).to.equal(value);
    });
  }
});

describe('markdown-like breaks', function () {
  it('joins paragraphs with two newlines', () => {
    expect(
      getRawText({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'one' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'two' }] },
        ],
      })
    ).to.equal('one\n\ntwo');
  });

  it('turns a hard break into one newline', () => {
    expect(
      getRawText({
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
      })
    ).to.equal('one\ntwo');
  });

  it('makes a single newline a hard break and two a new paragraph', () => {
    expect(textToDoc('one\ntwo\n\nthree')).to.deep.equal({
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
        { type: 'paragraph', content: [{ type: 'text', text: 'three' }] },
      ],
    });
  });
});

describe('textOffsetToDocPos', function () {
  // The formula encodes textToDoc's shape, so each case names the doc
  // textToDoc builds for its text.
  it('offsets by one inside a single paragraph', () => {
    expect(textOffsetToDocPos('hello', 0)).to.equal(1);
    expect(textOffsetToDocPos('hello', 5)).to.equal(6);
  });

  it('counts a hard break as one position and a paragraph boundary as two', () => {
    // 'ab\ncd' -> doc(p('ab', hardBreak, 'cd')): offset 3 is 'c', at 4.
    expect(textOffsetToDocPos('ab\ncd', 3)).to.equal(4);
    // 'a\n\nb' -> doc(p('a'), p('b')): offset 3 is 'b', at 4.
    expect(textOffsetToDocPos('a\n\nb', 3)).to.equal(4);
  });

  it('moves a caret on the blank line between paragraphs to the next paragraph', () => {
    // 'a\n\nb' -> doc(p('a'), p('b')): offset 2 sits between the newlines.
    expect(textOffsetToDocPos('a\n\nb', 2)).to.equal(4);
    // 'a\n\n\n\nb' -> doc(p('a'), p(), p('b')): offset 2 lands in the empty
    // paragraph and offset 4 at the start of 'b'.
    expect(textOffsetToDocPos('a\n\n\n\nb', 2)).to.equal(4);
    expect(textOffsetToDocPos('a\n\n\n\nb', 4)).to.equal(6);
    // 'a\n\n\nb' -> doc(p('a'), p(hardBreak, 'b')): the third newline is a
    // hard break, so offset 3 is before it.
    expect(textOffsetToDocPos('a\n\n\nb', 3)).to.equal(4);
  });

  describe('in an editor seeded with textToDoc', function () {
    let editor: Editor | undefined;
    let mount: HTMLElement | undefined;

    afterEach(() => {
      editor?.destroy();
      mount?.remove();
      editor = undefined;
      mount = undefined;
    });

    /** Puts the caret at `offset` in `text`, types "X", and reads the text back. */
    function typeAt(text: string, offset: number): string {
      mount = document.createElement('div');
      document.body.appendChild(mount);
      editor = new Editor({
        element: mount,
        extensions: [DocumentNode, ParagraphNode, TextNode, HardBreakNode],
        content: textToDoc(text),
      });
      const pos = textOffsetToDocPos(text, offset);
      editor.commands.setTextSelection(pos);
      expect(editor.state.selection.from).to.equal(pos);
      expect(editor.state.selection.$from.parent.isTextblock).to.equal(true);
      editor.commands.insertContent('X');
      return getRawText(editor.getJSON());
    }

    const cases: [string, number, string][] = [
      ['hello', 0, 'Xhello'],
      ['hello', 5, 'helloX'],
      ['ab\ncd', 3, 'ab\nXcd'],
      ['a\n\nb', 1, 'aX\n\nb'],
      ['a\n\nb', 2, 'a\n\nXb'],
      ['a\n\nb', 3, 'a\n\nXb'],
      ['a\n\n\n\nb', 2, 'a\n\nX\n\nb'],
      ['a\n\n\nb', 3, 'a\n\nX\nb'],
    ];
    for (const [text, offset, typed] of cases) {
      it(`types into a paragraph at offset ${offset} of ${JSON.stringify(text)}`, () => {
        expect(typeAt(text, offset)).to.equal(typed);
      });
    }
  });
});
