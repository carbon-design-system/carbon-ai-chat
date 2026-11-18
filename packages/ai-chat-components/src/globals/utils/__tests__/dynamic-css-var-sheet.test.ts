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
  setVarsForSelector,
  clearSelector,
  clearVarsForSelector,
} from '../dynamic-css-var-sheet.js';

/**
 * Reads every rule the shared sheet has published onto the document. The module
 * adopts its singleton on `document`, so a selector is "live" as soon as it
 * appears here.
 */
function documentCssText(): string {
  return Array.from(document.adoptedStyleSheets ?? [])
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');
}

describe('dynamic-css-var-sheet', function () {
  // Unique per test so a leaked rule can never satisfy a later assertion.
  let selector: string;
  let counter = 0;

  beforeEach(() => {
    selector = `.dcvs-test-${++counter}`;
  });

  afterEach(async () => {
    clearSelector(selector);
    await Promise.resolve();
  });

  it('publishes a rule synchronously', () => {
    setVarsForSelector(selector, { color: 'rgb(255, 0, 0)' });
    expect(documentCssText()).to.contain(selector);
  });

  // Regression guard for #2201. Components call the clear helpers from
  // `disconnectedCallback`, which WebKit runs while draining the custom-element
  // reaction queue inside `Element.remove()`. Mutating an adopted sheet in that
  // window segfaults the WebKit renderer, so the write must land after it.
  it('defers clearSelector past the synchronous teardown window', async () => {
    setVarsForSelector(selector, { color: 'rgb(255, 0, 0)' });
    expect(documentCssText()).to.contain(selector);

    clearSelector(selector);
    expect(
      documentCssText(),
      'sheet must not be mutated inside disconnectedCallback'
    ).to.contain(selector);

    await Promise.resolve();
    expect(documentCssText()).to.not.contain(selector);
  });

  it('defers clearVarsForSelector past the synchronous teardown window', async () => {
    setVarsForSelector(selector, { color: 'rgb(255, 0, 0)' });
    expect(documentCssText()).to.contain(selector);

    clearVarsForSelector(selector, ['color']);
    expect(
      documentCssText(),
      'sheet must not be mutated inside disconnectedCallback'
    ).to.contain(selector);

    await Promise.resolve();
    expect(documentCssText()).to.not.contain(selector);
  });

  it('coalesces repeated clears into a single flush', async () => {
    const other = `${selector}-other`;
    setVarsForSelector(selector, { color: 'rgb(255, 0, 0)' });
    setVarsForSelector(other, { color: 'rgb(0, 0, 255)' });

    clearSelector(selector);
    clearSelector(other);
    await Promise.resolve();

    const css = documentCssText();
    expect(css).to.not.contain(selector);
    expect(css).to.not.contain(other);
  });

  it('keeps a re-set selector alive when a clear is already pending', async () => {
    setVarsForSelector(selector, { color: 'rgb(255, 0, 0)' });
    clearSelector(selector);
    // A component re-connecting before the flush must win over the queued clear.
    setVarsForSelector(selector, { color: 'rgb(0, 128, 0)' });

    await Promise.resolve();
    expect(documentCssText()).to.contain(selector);
  });
});
