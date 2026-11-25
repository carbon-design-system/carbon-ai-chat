/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';

import { renderTokenChip } from '../render-token-chip.js';

/**
 * Returns all CSS text from the dynamic-css-var-sheet singleton, which uses
 * either document.adoptedStyleSheets or a fallback <style> element.
 */
function getDynamicSheetCssText(): string {
  // The dynamic-css-var-sheet adopts its singleton on the document. Collect
  // all adopted stylesheets and also any <style> elements that may have been
  // used as a fallback.
  const fromAdopted = Array.from(document.adoptedStyleSheets ?? [])
    .map((s) => {
      try {
        return Array.from(s.cssRules)
          .map((r) => r.cssText)
          .join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  const fromStyle = Array.from(document.querySelectorAll('style'))
    .map((el) => el.textContent ?? '')
    .join('\n');

  return `${fromAdopted}\n${fromStyle}`;
}

describe('renderTokenChip', function () {
  afterEach(() => {
    document
      .querySelectorAll('.cds-aichat--token')
      .forEach((el) => el.remove());
  });

  it('creates a span with class cds-aichat--token', () => {
    const chip = renderTokenChip({
      attrs: { label: 'Alice' },
      type: 'mention',
      context: 'composer',
    });
    expect(chip.tagName.toLowerCase()).to.equal('span');
    expect(chip.classList.contains('cds-aichat--token')).to.be.true;
  });

  it('sets data-token-context="composer" for composer chips', () => {
    const chip = renderTokenChip({
      attrs: { label: 'Alice' },
      type: 'mention',
      context: 'composer',
    });
    expect(chip.getAttribute('data-token-context')).to.equal('composer');
  });

  it('sets data-token-context="historical" for historical chips', () => {
    const chip = renderTokenChip({
      attrs: { label: '/summarize', value: 'summarize', trigger: '/' },
      type: 'command',
      context: 'historical',
    });
    expect(chip.getAttribute('data-token-context')).to.equal('historical');
  });

  it('installs a chip color rule for composer chips with a static fallback', () => {
    // Trigger rule installation by creating a chip.
    renderTokenChip({
      attrs: { label: 'Alice' },
      type: 'mention',
      context: 'composer',
    });

    const cssText = getDynamicSheetCssText();
    // The rule must include a static fallback — bare var(--cds-tag-color-blue)
    // without a fallback resolves to nothing in an unthemed host.
    expect(cssText).to.match(/--cds-tag-color-blue,\s*#0043ce/i);
  });

  it('installs a chip color rule for historical chips with a static fallback', () => {
    renderTokenChip({
      attrs: { label: 'Alice' },
      type: 'mention',
      context: 'historical',
    });

    const cssText = getDynamicSheetCssText();
    expect(cssText).to.match(/--cds-link-secondary,\s*#0043ce/i);
  });

  it('composer chip has a non-inherited color in an unthemed host', () => {
    // No Carbon theme class on any ancestor — tokens are undefined.
    const host = document.createElement('div');
    document.body.appendChild(host);

    const chip = renderTokenChip({
      attrs: { label: 'Alice' },
      type: 'mention',
      context: 'composer',
    });
    host.appendChild(chip);

    const style = getComputedStyle(chip);
    // #0043ce → rgb(0, 67, 206). The chip must not resolve to the inherited
    // body text color.
    expect(style.color).to.equal('rgb(0, 67, 206)');

    host.remove();
  });

  it('historical chip has a non-inherited color in an unthemed host', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const chip = renderTokenChip({
      attrs: { label: 'Alice' },
      type: 'mention',
      context: 'historical',
    });
    host.appendChild(chip);

    const style = getComputedStyle(chip);
    // link-secondary white-theme fallback: #0043ce → rgb(0, 67, 206).
    expect(style.color).to.equal('rgb(0, 67, 206)');

    host.remove();
  });
});
