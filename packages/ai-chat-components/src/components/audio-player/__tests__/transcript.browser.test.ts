/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import '../index.js';
import '../../markdown/index.js';

/** A paragraph, a list, a fenced code block, and HTML that sanitizing must neutralize. */
const MARKDOWN = [
  'The speaker covers three points:',
  '',
  '- First point',
  '- Second point',
  '- Third point',
  '',
  '```ts',
  'const first = 1;',
  'const second = 2;',
  '```',
  '',
  '<img src="missing.png" onerror="window.transcriptXss = true">',
].join('\n');

interface MarkdownElement extends HTMLElement {
  markdown: string;
  updateComplete: Promise<boolean>;
}

interface CodeSnippetElement extends HTMLElement {
  code: string;
}

async function renderTranscript(text: string) {
  const transcript = await fixture<
    HTMLElement & { updateComplete: Promise<boolean> }
  >(
    html`<cds-aichat-transcript expanded .text=${text}></cds-aichat-transcript>`
  );
  await transcript.updateComplete;
  const markdown = transcript.shadowRoot!.querySelector<MarkdownElement>(
    'cds-aichat-markdown'
  )!;
  await markdown.updateComplete;
  await waitUntil(
    () => markdown.shadowRoot?.querySelector('cds-aichat-code-snippet'),
    'the code block renders'
  );
  return markdown;
}

describe('cds-aichat-transcript markdown', () => {
  it('hands its text to the markdown renderer unchanged', async () => {
    const markdown = await renderTranscript(MARKDOWN);
    expect(markdown.markdown).to.equal(MARKDOWN);
  });

  it('renders every list item and the whole code block', async () => {
    const markdown = await renderTranscript(MARKDOWN);
    const root = markdown.shadowRoot!;
    const items = [...root.querySelectorAll('cds-list-item, li')].map((item) =>
      item.textContent?.trim()
    );
    expect(items).to.deep.equal(['First point', 'Second point', 'Third point']);
    const snippet = root.querySelector<CodeSnippetElement>(
      'cds-aichat-code-snippet'
    )!;
    expect(snippet.code).to.include('const first = 1;');
    expect(snippet.code).to.include('const second = 2;');
  });

  it('still sanitizes the markdown', async () => {
    const markdown = await renderTranscript(MARKDOWN);
    const image = markdown.shadowRoot!.querySelector('img');
    expect(image, 'the image itself renders').to.not.equal(null);
    expect(image!.hasAttribute('onerror')).to.equal(false);
    expect((window as { transcriptXss?: boolean }).transcriptXss).to.equal(
      undefined
    );
  });
});
