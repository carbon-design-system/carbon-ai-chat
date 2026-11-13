/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { fixture, html, expect } from '@open-wc/testing';
import prefix from '../../../globals/settings.js';
import '../index.js';
import type CDSAIChatInlineError from '../src/inline-error.js';

const blockClass = `${prefix}-inline-error`;

describe(blockClass, () => {
  it('renders the text after the icon', async () => {
    const el = await fixture<CDSAIChatInlineError>(
      html`<cds-aichat-inline-error>Something broke</cds-aichat-inline-error>`
    );
    const icon = el.shadowRoot!.querySelector(`.${blockClass}__icon`)!;
    const text = el.shadowRoot!.querySelector(`.${blockClass}__text`)!;
    const markdown = text.querySelector('cds-aichat-markdown') as any;
    await markdown.updateComplete;
    expect(markdown.shadowRoot!.textContent).to.contain('Something broke');
    expect(icon.querySelector('svg')).to.exist;
    expect(
      icon.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
    ).to.be.greaterThan(0);
  });

  it('labels the icon with icon-label', async () => {
    const el = await fixture<CDSAIChatInlineError>(
      html`<cds-aichat-inline-error icon-label="Error"
        >Something broke</cds-aichat-inline-error
      >`
    );
    expect(el.iconLabel).to.equal('Error');
    const svg = el.shadowRoot!.querySelector(`.${blockClass}__icon svg`)!;
    expect(svg.getAttribute('aria-label')).to.equal('Error');
    expect(svg.getAttribute('role')).to.equal('img');
    expect(svg.hasAttribute('aria-hidden')).to.be.false;
  });

  it('updates the icon label when the property changes', async () => {
    const el = await fixture<CDSAIChatInlineError>(
      html`<cds-aichat-inline-error icon-label="Error"
        >Something broke</cds-aichat-inline-error
      >`
    );
    el.iconLabel = 'Fehler';
    await el.updateComplete;
    const svg = el.shadowRoot!.querySelector(`.${blockClass}__icon svg`)!;
    expect(svg.getAttribute('aria-label')).to.equal('Fehler');
  });

  it('hides the icon from assistive technology without a label', async () => {
    const el = await fixture<CDSAIChatInlineError>(
      html`<cds-aichat-inline-error>Something broke</cds-aichat-inline-error>`
    );
    const svg = el.shadowRoot!.querySelector(`.${blockClass}__icon svg`)!;
    expect(svg.getAttribute('aria-hidden')).to.equal('true');
    expect(svg.hasAttribute('aria-label')).to.be.false;
  });
  describe('markdown', () => {
    it('renders the text as markdown', async () => {
      const el = await fixture<CDSAIChatInlineError>(
        html`<cds-aichat-inline-error
          >Try **again** or [docs](https://example.com)</cds-aichat-inline-error
        >`
      );
      const markdown = el.shadowRoot!.querySelector(
        'cds-aichat-markdown'
      ) as any;
      await markdown.updateComplete;
      expect(markdown.hasAttribute('remove-html')).to.be.true;
      expect(
        markdown.shadowRoot!.querySelector('strong')?.textContent
      ).to.equal('again');
      expect(markdown.shadowRoot!.querySelector('a')?.textContent).to.equal(
        'docs'
      );
    });

    it('removes HTML from the text', async () => {
      const el = await fixture<CDSAIChatInlineError>(
        html`<cds-aichat-inline-error
          >Hello <b>there</b> &lt;i&gt;x&lt;/i&gt;</cds-aichat-inline-error
        >`
      );
      const markdown = el.shadowRoot!.querySelector(
        'cds-aichat-markdown'
      ) as any;
      await markdown.updateComplete;
      expect(markdown.shadowRoot!.querySelector('b')).to.not.exist;
      expect(markdown.shadowRoot!.querySelector('i')).to.not.exist;
    });
  });
});
