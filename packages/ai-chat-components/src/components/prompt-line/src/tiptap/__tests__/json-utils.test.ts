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
    'line1\nline2\nline3',
  ];
  for (const value of cases) {
    it(`preserves ${JSON.stringify(value)}`, () => {
      expect(getRawText(textToDoc(value))).to.equal(value);
    });
  }
});

describe('textOffsetToDocPos', function () {
  // The formula encodes textToDoc's shape, so pin it against a doc textToDoc
  // actually built rather than against the arithmetic.
  it('offsets by one inside a single paragraph', () => {
    expect(textOffsetToDocPos('hello', 0)).to.equal(1);
    expect(textOffsetToDocPos('hello', 5)).to.equal(6);
  });

  it('adds one more for every newline crossed', () => {
    // 'ab\ncd' -> doc(p('ab'), p('cd')). Offset 3 is 'c', the first character
    // of the second paragraph.
    expect(textOffsetToDocPos('ab\ncd', 3)).to.equal(5);
    expect(textOffsetToDocPos('a\nb\nc', 4)).to.equal(7);
  });

  it('handles an empty value and a blank line', () => {
    expect(textOffsetToDocPos('', 0)).to.equal(1);
    expect(textOffsetToDocPos('a\n\nb', 3)).to.equal(6);
  });
});
