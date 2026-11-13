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

describe('legacy paragraph-per-line breaks', function () {
  it('joins paragraphs with one newline', () => {
    expect(
      getRawText({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'one' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'two' }] },
        ],
      })
    ).to.equal('one\ntwo');
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

  it('makes each newline start a paragraph, including an empty line', () => {
    expect(textToDoc('one\ntwo\n\nthree')).to.deep.equal({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'one' }],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'two' }] },
        { type: 'paragraph' },
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

  it('counts the extra position at every paragraph boundary', () => {
    expect(textOffsetToDocPos('ab\ncd', 3)).to.equal(5);
    expect(textOffsetToDocPos('a\n\nb', 3)).to.equal(6);
    expect(textOffsetToDocPos('line1\nline2', 8)).to.equal(10);
  });

  it('keeps a blank-line caret inside its own empty paragraph', () => {
    expect(textOffsetToDocPos('a\n\nb', 2)).to.equal(4);
    expect(textOffsetToDocPos('a\n\n\n\nb', 2)).to.equal(4);
    expect(textOffsetToDocPos('a\n\n\n\nb', 4)).to.equal(8);
    expect(textOffsetToDocPos('a\n\n\nb', 3)).to.equal(6);
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
      ['a\n\nb', 2, 'a\nX\nb'],
      ['a\n\nb', 3, 'a\n\nXb'],
      ['a\n\n\n\nb', 2, 'a\nX\n\n\nb'],
      ['a\n\n\nb', 3, 'a\n\nX\nb'],
    ];
    for (const [text, offset, typed] of cases) {
      it(`types into a paragraph at offset ${offset} of ${JSON.stringify(text)}`, () => {
        expect(typeAt(text, offset)).to.equal(typed);
      });
    }
  });
});
