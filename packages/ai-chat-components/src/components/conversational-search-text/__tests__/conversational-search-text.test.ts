/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html } from '@open-wc/testing';
import { sendKeys } from '@web/test-runner-commands';
import ConversationalSearchText from '@carbon/ai-chat-components/es/components/conversational-search-text/src/conversational-search-text.js';
import '@carbon/ai-chat-components/es/components/markdown/index.js';
import Markdown from '@carbon/ai-chat-components/es/components/markdown/src/markdown.js';
import { insertHighlightMarkdown } from '../src/citation-utils.js';

async function answer() {
  return fixture<ConversationalSearchText>(html`
    <cds-aichat-conversational-search-text show-citations-toggle>
      <p>Answer content</p>
    </cds-aichat-conversational-search-text>
  `);
}

describe('conversational search answer', () => {
  it('renders a default slot and keeps the toggle hidden by default', async () => {
    const element = await fixture<ConversationalSearchText>(html`
      <cds-aichat-conversational-search-text
        ><p>Answer</p></cds-aichat-conversational-search-text
      >
    `);
    expect(element).to.be.instanceOf(ConversationalSearchText);
    expect(
      element.shadowRoot?.querySelector('slot')?.assignedElements()[0]
        .textContent
    ).to.equal('Answer');
    expect(element.shadowRoot?.querySelector('button')).to.equal(null);
  });

  it('leaves highlighted Markdown rendering to the slotted element', async () => {
    const text = insertHighlightMarkdown('First and final.', {
      ranges: [
        { start: 0, end: 5 },
        { start: 10, end: 15 },
      ],
    });
    const element = await fixture<ConversationalSearchText>(html`
      <cds-aichat-conversational-search-text streaming>
        <cds-aichat-markdown .markdown=${text}></cds-aichat-markdown>
      </cds-aichat-conversational-search-text>
    `);
    const markdown = element.querySelector('cds-aichat-markdown') as Markdown;
    await markdown.updateComplete;
    expect(
      [...markdown.shadowRoot!.querySelectorAll('mark')].map(
        (mark) => mark.textContent
      )
    ).to.deep.equal(['First', 'final']);
    expect(element.streaming).to.equal(true);
  });

  it('exposes the supplied name, expanded state, and optional ID on one native button', async () => {
    const element = await answer();
    element.toggleLabel = 'Afficher les citations';
    element.citationsLabel = 'Sources';
    element.toggleId = 'sources-1';
    element.citationsOpen = true;
    await element.updateComplete;
    const button = element.shadowRoot!.querySelector('button')!;
    expect(button.type).to.equal('button');
    expect(button.getAttribute('aria-label')).to.equal(
      'Afficher les citations'
    );
    expect(button.getAttribute('aria-expanded')).to.equal('true');
    expect(button.id).to.equal('sources-1');
    expect(button.textContent).to.include('Sources');
    const tag = button.querySelector('cds-tag')!;
    expect(tag.hasAttribute('tabindex')).to.equal(false);
    expect(button.querySelector('[aria-hidden="true"]')).to.exist;
    expect(element.shadowRoot!.querySelectorAll('button')).to.have.length(1);
    element.toggleId = '';
    await element.updateComplete;
    expect(button.hasAttribute('id')).to.equal(false);
  });

  it('renders HTML-looking labels and IDs as inert text and attribute values', async () => {
    const element = await answer();
    const payload =
      '<img src="invalid" onerror="window.__citationLabelExecuted = true">';
    const attributePayload =
      '" autofocus onfocus="window.__citationLabelExecuted = true';
    element.citationsLabel = payload;
    element.toggleLabel = attributePayload;
    element.toggleId = attributePayload;
    await element.updateComplete;
    const button = element.shadowRoot!.querySelector('button')!;
    const tag = button.querySelector('cds-tag')!;
    expect(tag.textContent).to.include(payload);
    expect(button.getAttribute('aria-label')).to.equal(attributePayload);
    expect(button.id).to.equal(attributePayload);
    expect(element.shadowRoot!.querySelector('img')).to.equal(null);
    expect(button.hasAttribute('autofocus')).to.equal(false);
    expect(button.hasAttribute('onfocus')).to.equal(false);
    button.focus();
    expect(
      (window as Window & { __citationLabelExecuted?: boolean })
        .__citationLabelExecuted
    ).to.equal(undefined);
  });

  for (const activation of ['click', 'Enter', 'Space']) {
    it(`requests one controlled transition per ${activation} activation`, async () => {
      const element = await answer();
      const events: CustomEvent[] = [];
      const listener = (event: Event) => events.push(event as CustomEvent);
      document.addEventListener(
        ConversationalSearchText.eventCitationsToggle,
        listener
      );
      document.addEventListener(
        ConversationalSearchText.eventCitationsScroll,
        listener
      );
      try {
        const button = element.shadowRoot!.querySelector('button')!;
        button.focus();
        if (activation === 'click') {
          button.click();
        } else {
          await sendKeys({ press: activation });
        }
        expect(events.map((event) => event.type)).to.deep.equal([
          ConversationalSearchText.eventCitationsToggle,
          ConversationalSearchText.eventCitationsScroll,
        ]);
        expect(events[0].detail).to.deep.equal({ open: true });
        for (const event of events) {
          expect(event.bubbles).to.equal(true);
          expect(event.composed).to.equal(true);
          expect(event.cancelable).to.equal(false);
        }
        expect(element.citationsOpen).to.equal(false);
        expect(button.getAttribute('aria-expanded')).to.equal('false');
        expect(element.shadowRoot!.activeElement).to.equal(button);
        events.length = 0;
        element.citationsOpen = true;
        await element.updateComplete;
        expect(events).to.have.length(0);
        button.click();
        expect(events).to.have.length(1);
        expect(events[0].detail).to.deep.equal({ open: false });
      } finally {
        document.removeEventListener(
          ConversationalSearchText.eventCitationsToggle,
          listener
        );
        document.removeEventListener(
          ConversationalSearchText.eventCitationsScroll,
          listener
        );
      }
    });
  }
});
