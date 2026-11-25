/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect, fixture, html } from '@open-wc/testing';
import { renderInlineMarkdown } from '../index.js';

async function renderInline(text: string) {
  const content = renderInlineMarkdown(text, {
    sanitizeHTML: true,
    removeHTML: true,
    projectPluginOutput: true,
  });
  return fixture<HTMLDivElement>(html`<div><span>${content}</span></div>`);
}

describe('renderInlineMarkdown', () => {
  it('renders nothing for empty input', async () => {
    const root = await renderInline('');
    expect(root.textContent).to.equal('');
    expect(root.querySelector('span')!.childElementCount).to.equal(0);
  });

  it('renders plain text unchanged', async () => {
    const root = await renderInline('hello there');
    expect(root.textContent).to.equal('hello there');
  });

  it('emits <strong> for **bold**', async () => {
    const root = await renderInline('a **bold** word');
    const strong = root.querySelector('strong');
    expect(strong?.textContent).to.equal('bold');
    expect(root.textContent).to.equal('a bold word');
  });

  it('emits <em> for *italic*', async () => {
    const root = await renderInline('an *em* word');
    expect(root.querySelector('em')?.textContent).to.equal('em');
  });

  it('emits <code> for `inline code`', async () => {
    const root = await renderInline('run `npm install`');
    expect(root.querySelector('code')?.textContent).to.equal('npm install');
  });

  it('emits <s> for ~~strike~~', async () => {
    const root = await renderInline('a ~~strike~~');
    expect(root.querySelector('s')?.textContent).to.equal('strike');
  });

  it('emits <mark> for ==highlight==', async () => {
    const root = await renderInline('a ==marked== word');
    expect(root.querySelector('mark')?.textContent).to.equal('marked');
    expect(root.textContent).to.equal('a marked word');
  });

  it('renders a soft break (single newline) as <br>', async () => {
    const root = await renderInline('one\ntwo');
    expect(root.querySelectorAll('br')).to.have.lengthOf(1);
    // An extra space beside the break keeps its count but changes the text.
    expect(root.textContent).to.equal('onetwo');
  });

  it('renders a hard break (two trailing spaces + newline) as <br>', async () => {
    const root = await renderInline('one  \ntwo');
    expect(root.querySelectorAll('br')).to.have.lengthOf(1);
  });
});
