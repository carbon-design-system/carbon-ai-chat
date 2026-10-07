/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';
import {
  insertHighlightMarkdown,
  sortCitations,
} from '../src/citation-utils.js';

describe('citation helpers', () => {
  it('keeps text without ranges and ignores blank spans', () => {
    expect(insertHighlightMarkdown('answer')).to.equal('answer');
    expect(insertHighlightMarkdown('answer', { ranges: [] })).to.equal(
      'answer'
    );
    expect(
      insertHighlightMarkdown('a   b', { ranges: [{ start: 1, end: 4 }] })
    ).to.equal('a   b');
  });

  it('inserts multiple highlights without changing the supplied ranges', () => {
    const ranges = Object.freeze([
      Object.freeze({ start: 0, end: 5 }),
      Object.freeze({ start: 10, end: 15 }),
    ]);
    expect(insertHighlightMarkdown('First and final.', { ranges })).to.equal(
      '==First== and ==final==.'
    );
    expect(ranges.map((range) => range.start)).to.deep.equal([0, 10]);
  });

  it('preserves substring behavior for reversed and out-of-bounds ranges', () => {
    expect(
      insertHighlightMarkdown('abcdef', { ranges: [{ start: 4, end: 2 }] })
    ).to.equal('abcd==cd==cdef');
    expect(
      insertHighlightMarkdown('abcdef', { ranges: [{ start: -2, end: 99 }] })
    ).to.equal('==abcdef==');
  });

  it('preserves existing behavior when ranges overlap', () => {
    expect(
      insertHighlightMarkdown('abcdef', {
        ranges: [
          { start: 0, end: 4 },
          { start: 2, end: 6 },
        ],
      })
    ).to.equal('==ab====cdef==');
  });

  it('keeps absent citations null and empty citations empty', () => {
    expect(sortCitations()).to.equal(null);
    expect(sortCitations(null)).to.equal(null);
    expect(sortCitations([])).to.deep.equal([]);
  });

  it('moves citations without ranges last without mutating either group', () => {
    const citations = Object.freeze([
      { id: 'none' },
      { id: 'second', ranges: [{ start: 6, end: 9 }] },
      { id: 'empty', ranges: [] },
      { id: 'first', ranges: [{ start: 0, end: 3 }] },
    ]);
    expect(
      sortCitations(citations)?.map((citation) => citation.id)
    ).to.deep.equal(['second', 'first', 'none', 'empty']);
    expect(citations.map((citation) => citation.id)).to.deep.equal([
      'none',
      'second',
      'empty',
      'first',
    ]);
  });
});
