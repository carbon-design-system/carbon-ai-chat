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
import '../../markdown/index.js';
import type CDSAIChatInlineError from '../src/inline-error.js';

const blockClass = `${prefix}-inline-error`;

describe(blockClass, () => {
  it('renders the slotted text after the icon', async () => {
    const el = await fixture<CDSAIChatInlineError>(
      html`<cds-aichat-inline-error>Something broke</cds-aichat-inline-error>`
    );
    const icon = el.shadowRoot!.querySelector(`.${blockClass}__icon`)!;
    const text = el.shadowRoot!.querySelector(`.${blockClass}__text`)!;
    const slot = text.querySelector('slot') as HTMLSlotElement;
    expect(slot.assignedNodes()[0].textContent).to.equal('Something broke');
    expect(icon.querySelector('svg')).to.exist;
    expect(
      icon.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
    ).to.be.greaterThan(0);
  });

  it('shows text that changes after the first render', async () => {
    const el = await fixture<CDSAIChatInlineError>(
      html`<cds-aichat-inline-error>Something broke</cds-aichat-inline-error>`
    );
    el.firstChild!.textContent = 'Etwas ist schiefgelaufen';
    await el.updateComplete;
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>(
      `.${blockClass}__text slot`
    )!;
    expect(slot.assignedNodes()[0].textContent).to.equal(
      'Etwas ist schiefgelaufen'
    );
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
    it('shows a slotted markdown element', async () => {
      const el = await fixture<CDSAIChatInlineError>(
        html`<cds-aichat-inline-error
          ><cds-aichat-markdown remove-html
            >Try **again**</cds-aichat-markdown
          ></cds-aichat-inline-error
        >`
      );
      const markdown = el.querySelector('cds-aichat-markdown') as any;
      await markdown.updateComplete;
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>(
        `.${blockClass}__text slot`
      )!;
      expect(slot.assignedElements()[0]).to.equal(markdown);
      expect(
        markdown.shadowRoot!.querySelector('strong')?.textContent
      ).to.equal('again');
    });
  });
});
