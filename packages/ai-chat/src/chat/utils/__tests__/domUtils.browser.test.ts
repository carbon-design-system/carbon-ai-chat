/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { doFocus, getDeepActiveElement } from '../domUtils';

// doFocus reports where focus landed, so these run in a real browser, which
// decides what can take focus.
describe('doFocus', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns true when it moves focus to the element', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    expect(doFocus(button)).toBe(true);
    expect(document.activeElement).toBe(button);
  });

  it('returns false when the element cannot take focus', () => {
    const outside = document.createElement('button');
    const div = document.createElement('div');
    document.body.append(outside, div);
    outside.focus();

    expect(doFocus(div)).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  it('returns false for a disabled button, even with a tabindex', () => {
    const outside = document.createElement('button');
    const disabled = document.createElement('button');
    disabled.disabled = true;
    disabled.tabIndex = 0;
    document.body.append(outside, disabled);
    outside.focus();

    expect(doFocus(disabled)).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  it('returns true when a shadow host passes focus to its inner control', () => {
    const host = document.createElement('div');
    const inner = document.createElement('button');
    host
      .attachShadow({ mode: 'open', delegatesFocus: true })
      .appendChild(inner);
    document.body.appendChild(host);

    expect(doFocus(host)).toBe(true);
    expect(getDeepActiveElement()).toBe(inner);
  });
});
