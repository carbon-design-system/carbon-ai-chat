/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { TokenTree } from '../markdown-token-tree.js';

/**
 * Reports source or output that cannot join an inline paragraph.
 * @category Messaging
 */
export class InlineMarkdownError extends Error {
  /** Stable reason for rejecting the complete run. */
  readonly code: 'block-content' | 'non-inline-output';

  constructor(code: 'block-content' | 'non-inline-output', message: string) {
    super(message);
    this.name = 'InlineMarkdownError';
    this.code = code;
  }
}

const PHRASING = new Set(
  'a abbr audio b bdi bdo br button canvas cite code data datalist del dfn em embed i iframe img input ins kbd label map mark meter noscript object output picture progress q ruby rp rt s samp select small span strong sub sup textarea time u var video wbr'.split(
    ' '
  )
);
const BLOCK_TAGS = new Set(
  'address article aside blockquote body caption col colgroup dd details dialog div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html legend li main menu nav ol p pre search section summary table tbody td tfoot th thead tr ul'.split(
    ' '
  )
);

function invalidOutput(): never {
  throw new InlineMarkdownError(
    'non-inline-output',
    'renderInlineMarkdown received non-inline output; use phrasing HTML without custom elements.'
  );
}

export function validateInlineTree(tree: TokenTree): TokenTree | undefined {
  if (!tree.children.length) {
    return undefined;
  }
  const paragraph = tree.children[0];
  if (
    tree.children.length !== 1 ||
    paragraph.token.type !== 'paragraph_open' ||
    paragraph.token.tag !== 'p'
  ) {
    throw new InlineMarkdownError(
      'block-content',
      'renderInlineMarkdown accepts one inline paragraph; render block content with the markdown element.'
    );
  }
  const visit = ({ token, children }: TokenTree) => {
    if (
      (token.block && token.type !== 'inline') ||
      BLOCK_TAGS.has(token.tag?.toLowerCase() ?? '') ||
      token.tag?.includes('-') ||
      token.attrs?.some(([name]) => name.toLowerCase() === 'is') ||
      ['fence', 'code_block', 'html_block', 'html_container'].includes(
        token.type ?? ''
      )
    ) {
      invalidOutput();
    }
    children.forEach(visit);
  };
  paragraph.children.forEach(visit);
  return paragraph;
}

export function validateInlineAttributes(
  attributes: Record<string, string>
): void {
  if (Object.keys(attributes).some((name) => name.toLowerCase() === 'is')) {
    invalidOutput();
  }
}

// Elements that are phrasing content only inside these parents.
const CONTEXTUAL_PARENTS = new Map([
  ['source', ['picture', 'audio', 'video']],
  ['track', ['audio', 'video']],
  ['optgroup', ['select']],
  ['option', ['select', 'optgroup', 'datalist']],
]);

const FOREIGN_NAMESPACES = [
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1998/Math/MathML',
];

function isInlineElement(element: Element): boolean {
  const tag = element.localName.toLowerCase();
  if (tag.includes('-') || element.hasAttribute('is')) {
    return false;
  }
  if (element.namespaceURI === 'http://www.w3.org/1999/xhtml') {
    const parent = element.parentElement?.localName ?? '';
    return PHRASING.has(tag) || !!CONTEXTUAL_PARENTS.get(tag)?.includes(parent);
  }
  return (
    FOREIGN_NAMESPACES.includes(element.namespaceURI ?? '') &&
    tag !== 'script' &&
    !(tag === 'math' && element.getAttribute('display') === 'block')
  );
}

export function validateInlineHTML(html: string): void {
  const template = document.createElement('template');
  template.innerHTML = html;
  for (const element of template.content.querySelectorAll('*')) {
    if (!isInlineElement(element)) {
      invalidOutput();
    }
  }
}
