/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { render } from '@testing-library/react';

import { renderInlineMarkdown } from '../../../src/chat/components/helpers/InlineMarkdown/InlineMarkdown';

function renderInline(text: string) {
  return render(<div data-testid="root">{renderInlineMarkdown(text)}</div>);
}

describe('renderInlineMarkdown', () => {
  it('returns null on empty input', () => {
    const { container } = renderInline('');
    expect(container.querySelector('[data-testid=root]')?.innerHTML).toBe('');
  });

  it('renders plain text unchanged', () => {
    const { getByTestId } = renderInline('hello there');
    expect(getByTestId('root').textContent).toBe('hello there');
  });

  it('emits <strong> for **bold**', () => {
    const { getByTestId } = renderInline('a **bold** word');
    const root = getByTestId('root');
    const strong = root.querySelector('strong');
    expect(strong?.textContent).toBe('bold');
    expect(root.textContent).toBe('a bold word');
  });

  it('emits <em> for *italic*', () => {
    const { getByTestId } = renderInline('an *em* word');
    expect(getByTestId('root').querySelector('em')?.textContent).toBe('em');
  });

  it('emits <code> for `inline code`', () => {
    const { getByTestId } = renderInline('run `npm install`');
    expect(getByTestId('root').querySelector('code')?.textContent).toBe(
      'npm install'
    );
  });

  it('emits <s> for ~~strike~~', () => {
    const { getByTestId } = renderInline('a ~~strike~~');
    expect(getByTestId('root').querySelector('s')?.textContent).toBe('strike');
  });

  it('emits <mark> for ==highlight==', () => {
    const { getByTestId } = renderInline('a ==marked== word');
    const root = getByTestId('root');
    expect(root.querySelector('mark')?.textContent).toBe('marked');
    expect(root.textContent).toBe('a marked word');
  });

  it('emits <a target=_blank rel=noopener> for links', () => {
    const { getByTestId } = renderInline('see [docs](https://example.com)');
    const a = getByTestId('root').querySelector('a');
    expect(a?.getAttribute('href')).toBe('https://example.com');
    expect(a?.getAttribute('target')).toBe('_blank');
    expect(a?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a?.textContent).toBe('docs');
  });

  it('renders a soft break (single newline) as <br>', () => {
    const { container } = renderInline('one\ntwo');
    const root = container.querySelector('[data-testid=root]');
    expect(root?.querySelectorAll('br')).toHaveLength(1);
    // Exact text, not `toContain`: a half-fix that emitted the <br> and kept
    // the old space Fragment would render the same two lines and still pass.
    expect(root?.textContent).toBe('onetwo');
  });

  it('renders a hard break (two trailing spaces + newline) as <br>', () => {
    const { container } = renderInline('one  \ntwo');
    const root = container.querySelector('[data-testid=root]');
    expect(root?.querySelectorAll('br')).toHaveLength(1);
  });

  it('strips raw HTML (removeHTML=true at tokenize time)', () => {
    // Malicious-ish input: an inline <img> tag with onerror. With HTML disabled
    // in the tokenizer, the parser keeps the raw `<` text but does not produce
    // an html_inline token, so React renders the literal characters.
    const { getByTestId } = renderInline(
      'before<img src=x onerror=alert(1)>after'
    );
    const root = getByTestId('root');
    // No real <img> element should be present.
    expect(root.querySelector('img')).toBeNull();
    // Text content keeps the literal characters.
    expect(root.textContent).toContain('alert(1)');
  });
});
