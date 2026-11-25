/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect, fixture, html, oneEvent, waitUntil } from '@open-wc/testing';
import '../index.js';

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

interface TranscriptElement extends HTMLElement {
  text: string;
  updateComplete: Promise<boolean>;
}

interface CodeSnippetElement extends HTMLElement {
  code: string;
}

async function renderTranscript(text: string) {
  const transcript = await fixture<TranscriptElement>(
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
  return { transcript, markdown };
}

/** The text of each list item the markdown element rendered. */
function listItems(markdown: MarkdownElement) {
  return [...markdown.shadowRoot!.querySelectorAll('cds-list-item, li')].map(
    (item) => item.textContent?.trim()
  );
}

// These cases read the markdown element's rendered markup, because what it
// renders from the transcript's text is the behavior under test.
describe('cds-aichat-transcript markdown', () => {
  afterEach(() => {
    delete (window as { transcriptXss?: boolean }).transcriptXss;
  });

  it('hands its text to the markdown renderer unchanged', async () => {
    const { markdown } = await renderTranscript(MARKDOWN);
    expect(markdown.markdown).to.equal(MARKDOWN);
  });

  it('hands over new text when the text changes', async () => {
    const { transcript, markdown } = await renderTranscript(MARKDOWN);
    transcript.text = '- Only point';
    await transcript.updateComplete;
    await markdown.updateComplete;
    expect(markdown.markdown).to.equal('- Only point');
    await waitUntil(
      () => !markdown.shadowRoot?.querySelector('cds-aichat-code-snippet'),
      'the old code block goes'
    );
    expect(listItems(markdown)).to.deep.equal(['Only point']);
  });

  it('renders every list item and the whole code block', async () => {
    const { markdown } = await renderTranscript(MARKDOWN);
    expect(listItems(markdown)).to.deep.equal([
      'First point',
      'Second point',
      'Third point',
    ]);
    const snippet = markdown.shadowRoot!.querySelector<CodeSnippetElement>(
      'cds-aichat-code-snippet'
    )!;
    expect(snippet.code).to.include('const first = 1;');
    expect(snippet.code).to.include('const second = 2;');
  });

  it('still sanitizes the markdown', async () => {
    const { markdown } = await renderTranscript(MARKDOWN);
    const image = markdown.shadowRoot!.querySelector('img');
    expect(image, 'the image itself renders').to.not.equal(null);
    expect(image!.hasAttribute('onerror')).to.equal(false);
    // An unsanitized handler would run once the missing image fails to load.
    if (!image!.complete) {
      await oneEvent(image!, 'error');
    }
    expect((window as { transcriptXss?: boolean }).transcriptXss).to.equal(
      undefined
    );
  });
});
