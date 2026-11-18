/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect } from '@open-wc/testing';
import { splitRunBreaks } from '../split-run-breaks.js';

describe('splitRunBreaks', () => {
  it('returns the run as the body when it has no edge breaks', () => {
    expect(splitRunBreaks('hello', false, false)).to.deep.equal({
      leading: '',
      body: 'hello',
      trailing: '',
    });
  });

  it('keeps edge breaks in the middle of a paragraph', () => {
    expect(splitRunBreaks('\n\nhello\n', false, false)).to.deep.equal({
      leading: '\n\n',
      body: 'hello',
      trailing: '\n',
    });
  });

  it('drops a leading break at the start of the paragraph', () => {
    expect(splitRunBreaks('\nhello', true, false)).to.deep.equal({
      leading: '',
      body: '\nhello',
      trailing: '',
    });
  });

  it('drops a trailing break at the end of the paragraph', () => {
    expect(splitRunBreaks('hello\n', false, true)).to.deep.equal({
      leading: '',
      body: 'hello\n',
      trailing: '',
    });
  });

  it('counts a run of only breaks once, as leading', () => {
    expect(splitRunBreaks('\n\n', false, false)).to.deep.equal({
      leading: '\n\n',
      body: '',
      trailing: '',
    });
  });

  it('drops a run of only breaks at the end of the paragraph', () => {
    expect(splitRunBreaks('\n\n', false, true)).to.deep.equal({
      leading: '',
      body: '\n\n',
      trailing: '',
    });
  });
});
