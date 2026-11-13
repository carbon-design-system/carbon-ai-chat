/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';

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
    expect(textOffsetToDocPos(0)).to.equal(1);
    expect(textOffsetToDocPos(5)).to.equal(6);
  });

  it('counts a hard break as one position and a paragraph boundary as two', () => {
    // 'ab\ncd' -> doc(p('ab', hardBreak, 'cd')): offset 3 is 'c', at 4.
    // 'a\n\nb' -> doc(p('a'), p('b')): offset 3 is 'b', at 4.
    expect(textOffsetToDocPos(3)).to.equal(4);
  });
});
