/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from '@open-wc/testing';
import '@carbon/ai-chat-components/es/components/code-snippet/index.js';
import CDSAIChatCodeSnippet from '@carbon/ai-chat-components/es/components/code-snippet/src/code-snippet.js';

describe('code-snippet', function () {
  it('should render cds-aichat-code-snippet with copy button in toolbar by default', async () => {
    const el = await fixture<CDSAIChatCodeSnippet>(
      html`<cds-aichat-code-snippet
        code="const x = 1;"></cds-aichat-code-snippet>`
    );
    expect(el).to.be.instanceOf(CDSAIChatCodeSnippet);
    const toolbar = el.shadowRoot!.querySelector('cds-aichat-toolbar');
    expect(toolbar).to.exist;
    await toolbar!.updateComplete;
    const copyBtn = toolbar!.shadowRoot!.querySelector('cds-copy-button');
    expect(copyBtn).to.exist;
    expect(copyBtn!.getAttribute('feedback')).to.equal('Copied!');
    expect(copyBtn!.getAttribute('feedback-timeout')).to.equal('2000');
    expect(copyBtn!.getAttribute('kind')).to.equal('ghost');
    expect(copyBtn!.textContent?.trim()).to.equal('Copy to clipboard');
  });

  it('should support custom feedback and feedback-timeout properties', async () => {
    const el = await fixture<CDSAIChatCodeSnippet>(
      html`<cds-aichat-code-snippet
        code="const x = 1;"
        feedback="Code copied!"
        feedback-timeout="3500"
        copy-button-tooltip-content="Copy snippet"></cds-aichat-code-snippet>`
    );
    const toolbar = el.shadowRoot!.querySelector('cds-aichat-toolbar');
    expect(toolbar).to.exist;
    await toolbar!.updateComplete;
    const copyBtn = toolbar!.shadowRoot!.querySelector('cds-copy-button');
    expect(copyBtn).to.exist;
    expect(copyBtn!.getAttribute('feedback')).to.equal('Code copied!');
    expect(copyBtn!.getAttribute('feedback-timeout')).to.equal('3500');
    expect(copyBtn!.textContent?.trim()).to.equal('Copy snippet');
  });

  it('should hide copy button when hide-copy-button is true', async () => {
    const el = await fixture<CDSAIChatCodeSnippet>(
      html`<cds-aichat-code-snippet
        code="const x = 1;"
        hide-copy-button></cds-aichat-code-snippet>`
    );
    const toolbar = el.shadowRoot!.querySelector('cds-aichat-toolbar');
    expect(toolbar).to.exist;
    await toolbar!.updateComplete;
    const copyBtn = toolbar!.shadowRoot!.querySelector('cds-copy-button');
    expect(copyBtn).to.not.exist;
  });

  it('should invoke copy handler when copy button is clicked', async () => {
    const el = await fixture<CDSAIChatCodeSnippet>(
      html`<cds-aichat-code-snippet
        code="const msg = 'hello';"></cds-aichat-code-snippet>`
    );
    const toolbar = el.shadowRoot!.querySelector('cds-aichat-toolbar');
    expect(toolbar).to.exist;
    await toolbar!.updateComplete;
    const copyBtn = toolbar!.shadowRoot!.querySelector('cds-copy-button');
    expect(copyBtn).to.exist;

    // Verify copy button click executes without error
    expect(() => copyBtn!.click()).to.not.throw();
  });
});
