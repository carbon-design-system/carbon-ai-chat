/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';

import { attachRootStyles } from '../root-styles.js';

function makeRoot(): ShadowRoot {
  const host = document.createElement('div');
  document.body.append(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<span></span>';
  return root;
}

describe('root-styles', function () {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('adopts a constructed sheet and keeps other sheets', () => {
    const root = makeRoot();
    const other = new CSSStyleSheet();
    root.adoptedStyleSheets = [other];
    const attached = attachRootStyles(root, 'span { color: rgb(1, 2, 3); }');
    const span = root.querySelector('span')!;

    expect(root.adoptedStyleSheets.length).to.equal(2);
    expect(root.adoptedStyleSheets[0]).to.equal(other);
    expect(root.querySelector('style')).to.equal(null);
    expect(getComputedStyle(span).color).to.equal('rgb(1, 2, 3)');

    attached.update('span { color: rgb(4, 5, 6); }');
    expect(root.adoptedStyleSheets.length).to.equal(2);
    expect(getComputedStyle(span).color).to.equal('rgb(4, 5, 6)');

    attached.detach();
    expect(root.adoptedStyleSheets).to.deep.equal([other]);
  });

  it('builds the sheet from the root document', () => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const target = frame.contentDocument!;
    const host = target.createElement('div');
    target.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<span></span>';

    attachRootStyles(root, 'span { color: rgb(1, 2, 3); }');

    expect(root.querySelector('style')).to.equal(null);
    expect(
      target.defaultView!.getComputedStyle(root.querySelector('span')!).color
    ).to.equal('rgb(1, 2, 3)');
  });

  it('falls back to one style element without constructed sheets', () => {
    const replaceSync = CSSStyleSheet.prototype.replaceSync;
    CSSStyleSheet.prototype.replaceSync = () => {
      throw new Error('Constructed stylesheet writes are unavailable');
    };
    try {
      const root = makeRoot();
      const attached = attachRootStyles(root, 'span { color: rgb(1, 2, 3); }');
      const style = root.querySelector('style');
      expect(style).to.exist;
      expect(root.adoptedStyleSheets.length).to.equal(0);

      attached.update('span { color: rgb(4, 5, 6); }');
      expect(root.querySelectorAll('style').length).to.equal(1);
      expect(getComputedStyle(root.querySelector('span')!).color).to.equal(
        'rgb(4, 5, 6)'
      );

      attached.detach();
      expect(root.querySelector('style')).to.equal(null);
    } finally {
      CSSStyleSheet.prototype.replaceSync = replaceSync;
    }
  });
});
