/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import { emulateMedia, sendKeys } from '@web/test-runner-commands';
import ConversationalSearchShell from '@carbon/ai-chat-components/es/components/conversational-search/src/conversational-search-shell.js';
import '@carbon/ai-chat-components/es/components/markdown/index.js';
import '@carbon/ai-chat-components/es/components/conversational-search/index.js';
import '@carbon/ai-chat-components/es/components/carousel/index.js';
import type CitationCard from '@carbon/ai-chat-components/es/components/conversational-search/src/citation-card.js';
import type Carousel from '@carbon/ai-chat-components/es/components/carousel/src/carousel.js';
import Markdown from '@carbon/ai-chat-components/es/components/markdown/src/markdown.js';
import { insertHighlightMarkdown } from '../src/citation-utils.js';

async function answer() {
  return fixture<ConversationalSearchShell>(html`
    <cds-aichat-conversational-search-shell show-citations-toggle>
      <p>Answer content</p>
      <p slot="citations">Source content</p>
    </cds-aichat-conversational-search-shell>
  `);
}

describe('conversational search shell', () => {
  it('renders a default slot and keeps the toggle hidden by default', async () => {
    const element = await fixture<ConversationalSearchShell>(html`
      <cds-aichat-conversational-search-shell
        ><p>Answer</p></cds-aichat-conversational-search-shell
      >
    `);
    expect(element).to.be.instanceOf(ConversationalSearchShell);
    expect(
      element.shadowRoot?.querySelector('slot')?.assignedElements()[0]
        .textContent
    ).to.equal('Answer');
    expect(element.shadowRoot?.querySelector('button')).to.equal(null);
  });

  it('assigns mounted citations to a region hidden by default', async () => {
    const element = await answer();
    const slot = element.shadowRoot!.querySelector<HTMLSlotElement>(
      'slot[name="citations"]'
    )!;
    expect(slot.assignedElements()).to.deep.equal([
      element.querySelector('[slot="citations"]'),
    ]);
    expect(slot.parentElement!.hidden).to.equal(true);
    expect(getComputedStyle(slot.parentElement!).display).to.equal('none');
    expect(element.querySelector('[slot="citations"]')!.textContent).to.equal(
      'Source content'
    );
  });

  it('shows citations independently of whether the toggle is shown', async () => {
    const element = await answer();
    element.showCitationsToggle = false;
    element.citationsOpen = true;
    await element.updateComplete;
    const region = element.shadowRoot!.querySelector(
      'slot[name="citations"]'
    )!.parentElement!;
    expect(element.shadowRoot!.querySelector('button')).to.equal(null);
    expect(region.hidden).to.equal(false);
    expect(getComputedStyle(region).display).not.to.equal('none');
    element.citationsOpen = false;
    await element.updateComplete;
    expect(region.hidden).to.equal(true);
    expect(getComputedStyle(region).display).to.equal('none');
  });

  it('keeps an answer error between the toggle and the closed citations region', async () => {
    const element = await fixture<ConversationalSearchShell>(html`
      <cds-aichat-conversational-search-shell show-citations-toggle>
        <p>Partial answer</p>
        <p slot="answer-error">Answer incomplete</p>
        <p slot="citations">Source content</p>
      </cds-aichat-conversational-search-shell>
    `);
    const errorSlot = element.shadowRoot!.querySelector<HTMLSlotElement>(
      'slot[name="answer-error"]'
    )!;
    const citationsSlot = element.shadowRoot!.querySelector(
      'slot[name="citations"]'
    )!;
    const button = element.shadowRoot!.querySelector('button')!;
    expect(errorSlot.assignedElements()[0].textContent).to.equal(
      'Answer incomplete'
    );
    expect(errorSlot.closest('[hidden]')).to.equal(null);
    const part = element.shadowRoot!.querySelector('[part="answer"]')!;
    const answerSlot = element.shadowRoot!.querySelector('slot:not([name])');
    expect(part.contains(answerSlot)).to.equal(true);
    expect(part.contains(button)).to.equal(true);
    expect(part.contains(errorSlot)).to.equal(false);
    expect(part.contains(citationsSlot)).to.equal(false);
    expect(
      button.compareDocumentPosition(errorSlot) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).not.to.equal(0);
    expect(
      errorSlot.compareDocumentPosition(citationsSlot) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).not.to.equal(0);
  });

  it('leaves highlighted Markdown rendering to the slotted element', async () => {
    const text = insertHighlightMarkdown(
      'First and final. <img src=x onerror=alert(1)>',
      {
        ranges: [
          { start: 0, end: 5 },
          { start: 10, end: 15 },
        ],
      }
    );
    const element = await fixture<ConversationalSearchShell>(html`
      <cds-aichat-conversational-search-shell>
        <cds-aichat-markdown
          .markdown=${text}
          .sanitizeHTML=${true}></cds-aichat-markdown>
      </cds-aichat-conversational-search-shell>
    `);
    const markdown = element.querySelector('cds-aichat-markdown') as Markdown;
    await markdown.updateComplete;
    expect(
      [...markdown.shadowRoot!.querySelectorAll('mark')].map(
        (mark) => mark.textContent
      )
    ).to.deep.equal(['First', 'final']);
    expect(
      markdown.shadowRoot!.querySelector('img')?.hasAttribute('onerror')
    ).to.equal(false);
  });

  it('exposes the supplied name and expanded state on one native button', async () => {
    const element = await answer();
    element.toggleLabel = 'Afficher les citations';
    element.citationsLabel = 'Sources';
    element.citationsOpen = true;
    await element.updateComplete;
    const button = element.shadowRoot!.querySelector('button')!;
    expect(button.type).to.equal('button');
    expect(button.getAttribute('aria-label')).to.equal(
      'Afficher les citations'
    );
    expect(button.getAttribute('aria-expanded')).to.equal('true');
    expect(
      element.shadowRoot!.getElementById(button.getAttribute('aria-controls')!)
    ).to.equal(
      element.shadowRoot!.querySelector('slot[name="citations"]')!.parentElement
    );
    expect(button.textContent).to.include('Sources');
    const tag = button.querySelector('cds-tag')!;
    expect(tag.hasAttribute('tabindex')).to.equal(false);
    expect(button.querySelector('[aria-hidden="true"]')).to.exist;
    expect(element.shadowRoot!.querySelectorAll('button')).to.have.length(1);
  });

  it('renders HTML-looking labels as inert text and attribute values', async () => {
    const element = await answer();
    const payload =
      '<img src="invalid" onerror="window.__citationLabelExecuted = true">';
    const attributePayload =
      '" autofocus onfocus="window.__citationLabelExecuted = true';
    element.citationsLabel = payload;
    element.toggleLabel = attributePayload;
    await element.updateComplete;
    const button = element.shadowRoot!.querySelector('button')!;
    const tag = button.querySelector('cds-tag')!;
    expect(tag.textContent).to.include(payload);
    expect(button.getAttribute('aria-label')).to.equal(attributePayload);
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
        ConversationalSearchShell.eventCitationsToggle,
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
          ConversationalSearchShell.eventCitationsToggle,
        ]);
        expect(events[0].detail).to.deep.equal({ open: true });
        for (const event of events) {
          expect(event.bubbles).to.equal(true);
          expect(event.composed).to.equal(true);
          expect(event.cancelable).to.equal(false);
        }
        expect(element.citationsOpen).to.equal(false);
        expect(button.getAttribute('aria-expanded')).to.equal('false');
        const region = element.shadowRoot!.querySelector(
          'slot[name="citations"]'
        )!.parentElement!;
        expect(region.hidden).to.equal(true);
        expect(element.shadowRoot!.activeElement).to.equal(button);
        events.length = 0;
        element.citationsOpen = true;
        await element.updateComplete;
        expect(events).to.have.length(0);
        expect(region.hidden).to.equal(false);
        button.click();
        expect(events).to.have.length(1);
        expect(events[0].detail).to.deep.equal({ open: false });
        expect(element.citationsOpen).to.equal(true);
        await element.updateComplete;
        expect(region.hidden).to.equal(false);
      } finally {
        document.removeEventListener(
          ConversationalSearchShell.eventCitationsToggle,
          listener
        );
      }
    });
  }

  describe('selection', () => {
    let selects: CustomEvent[];
    const record = (event: Event) => selects.push(event as CustomEvent);

    beforeEach(async () => {
      selects = [];
      document.addEventListener(
        ConversationalSearchShell.eventCitationsSelect,
        record
      );
      // Carousel moves end synchronously, since no transitionend is needed.
      await emulateMedia({ reducedMotion: 'reduce' });
    });

    afterEach(async () => {
      document.removeEventListener(
        ConversationalSearchShell.eventCitationsSelect,
        record
      );
      await emulateMedia({ reducedMotion: 'no-preference' });
    });

    function cards(count: number) {
      return Array.from(
        { length: count },
        (_, index) => html`
          <cds-aichat-citation-card index=${index} expandable>
            <div slot="title">Source ${index + 1}</div>
            <div slot="body">Cited text ${index + 1}.</div>
          </cds-aichat-citation-card>
        `
      );
    }

    function cardButton(element: Element, index: number) {
      return element
        .querySelector(`cds-aichat-citation-card[index="${index}"]`)!
        .shadowRoot!.querySelector('button')!;
    }

    function visibleSlide(carousel: Element) {
      return [...carousel.querySelectorAll('cds-aichat-citation-card')].find(
        (slide) => !slide.hasAttribute('inert')
      );
    }

    async function started(carousel: Element) {
      await waitUntil(
        () => carousel.querySelector('[data-index]'),
        'carousel did not start'
      );
    }

    it('shell: normalizes card selection', async () => {
      const cardEvents: Event[] = [];
      const recordCard = (event: Event) => cardEvents.push(event);
      document.addEventListener('cds-aichat-citation-select', recordCard);
      try {
        const element = await fixture<ConversationalSearchShell>(html`
          <cds-aichat-conversational-search-shell
            citations-open
            selected-citation-index="0">
            <div slot="citations">${cards(2)}</div>
          </cds-aichat-conversational-search-shell>
        `);
        cardButton(element, 1).click();
        expect(selects.map((event) => event.detail)).to.deep.equal([
          { index: 1 },
        ]);
        expect(selects[0].bubbles).to.equal(true);
        expect(selects[0].composed).to.equal(true);
        expect(cardEvents).to.have.length(0);
        expect(element.selectedCitationIndex).to.equal(0);

        selects.length = 0;
        cardButton(element, 0).click();
        expect(selects).to.have.length(0);
      } finally {
        document.removeEventListener('cds-aichat-citation-select', recordCard);
      }
    });

    it('shell: normalizes slide changes', async () => {
      const element = await fixture<ConversationalSearchShell>(html`
        <cds-aichat-conversational-search-shell selected-citation-index="0">
          <div slot="citations"><span></span></div>
        </cds-aichat-conversational-search-shell>
      `);
      let slideEvents = 0;
      const countSlide = () => slideEvents++;
      document.addEventListener('cds-aichat-carousel-onchange', countSlide);
      try {
        element.querySelector('span')!.dispatchEvent(
          new CustomEvent('cds-aichat-carousel-onchange', {
            detail: { currentIndex: 2 },
            bubbles: true,
            composed: true,
          })
        );
        expect(selects.map((event) => event.detail)).to.deep.equal([
          { index: 2 },
        ]);
        expect(slideEvents).to.equal(1);
      } finally {
        document.removeEventListener(
          'cds-aichat-carousel-onchange',
          countSlide
        );
      }
    });

    it('shell: applies selection to slotted and late-mounted cards', async () => {
      const element = await fixture<ConversationalSearchShell>(html`
        <cds-aichat-conversational-search-shell selected-citation-index="0">
          ${cards(2).map((card) => html`<div slot="citations">${card}</div>`)}
        </cds-aichat-conversational-search-shell>
      `);
      const slotted = [
        ...element.querySelectorAll<CitationCard>('cds-aichat-citation-card'),
      ];
      expect(slotted.map((card) => card.selected)).to.deep.equal([true, false]);
      element.selectedCitationIndex = 1;
      await element.updateComplete;
      expect(slotted.map((card) => card.selected)).to.deep.equal([false, true]);
      await slotted[1].updateComplete;
      expect(slotted[1].hasAttribute('selected')).to.equal(true);

      const wrapper = element.querySelector('[slot="citations"]')!;
      const late = document.createElement('div');
      late.innerHTML = `
        <cds-aichat-carousel>
          <div>
            <cds-aichat-citation-card index="0"></cds-aichat-citation-card>
            <cds-aichat-citation-card index="1"></cds-aichat-citation-card>
          </div>
        </cds-aichat-carousel>`;
      wrapper.append(late);
      // MutationObserver callbacks run as microtasks.
      await Promise.resolve();
      const lateCards = [
        ...late.querySelectorAll<CitationCard>('cds-aichat-citation-card'),
      ];
      expect(lateCards.map((card) => card.selected)).to.deep.equal([
        false,
        true,
      ]);
      expect(
        late.querySelector<Carousel>('cds-aichat-carousel')!.currentIndex
      ).to.equal(1);
      expect(selects).to.have.length(0);
    });

    it('shell: keeps watching citations after it is moved', async () => {
      const element = await fixture<ConversationalSearchShell>(html`
        <cds-aichat-conversational-search-shell selected-citation-index="1">
          <div slot="citations"></div>
        </cds-aichat-conversational-search-shell>
      `);
      const parent = element.parentElement!;
      element.remove();
      parent.append(element);
      const card = document.createElement(
        'cds-aichat-citation-card'
      ) as CitationCard;
      card.index = 1;
      element.querySelector('[slot="citations"]')!.append(card);
      // MutationObserver callbacks run as microtasks.
      await Promise.resolve();
      expect(card.selected).to.equal(true);
    });

    it('shell: leaves slotted content alone without a selected index', async () => {
      const element = await fixture<ConversationalSearchShell>(html`
        <cds-aichat-conversational-search-shell>
          <cds-aichat-carousel slot="citations">
            <div>${cards(2)}</div>
          </cds-aichat-carousel>
        </cds-aichat-conversational-search-shell>
      `);
      const carousel = element.querySelector<Carousel>('cds-aichat-carousel')!;
      expect(carousel.currentIndex).to.equal(undefined);
      expect(
        [
          ...element.querySelectorAll<CitationCard>('cds-aichat-citation-card'),
        ].map((card) => card.selected)
      ).to.deep.equal([false, false]);
      await started(carousel);
      // The carousel's own startup event still reaches the host.
      expect(selects.map((event) => event.detail)).to.deep.equal([
        { index: 0 },
      ]);
    });

    it('shell: late-mounted carousel starts on the selected slide', async () => {
      const element = await fixture<ConversationalSearchShell>(html`
        <cds-aichat-conversational-search-shell
          citations-open
          selected-citation-index="1">
          <div slot="citations"></div>
        </cds-aichat-conversational-search-shell>
      `);
      const carousel = document.createElement('cds-aichat-carousel');
      const slides = document.createElement('div');
      slides.innerHTML = [0, 1, 2]
        .map(
          (index) =>
            `<cds-aichat-citation-card index="${index}"></cds-aichat-citation-card>`
        )
        .join('');
      carousel.append(slides);
      element.querySelector('[slot="citations"]')!.append(carousel);
      await started(carousel);
      expect(visibleSlide(carousel)!.getAttribute('index')).to.equal('1');
      expect(selects).to.have.length(0);
    });

    it('shell: selection does not move focus', async () => {
      const element = await fixture<ConversationalSearchShell>(html`
        <cds-aichat-conversational-search-shell
          citations-open
          selected-citation-index="0">
          <button type="button">Answer action</button>
          <cds-aichat-carousel slot="citations">
            <div>${cards(3)}</div>
          </cds-aichat-carousel>
        </cds-aichat-conversational-search-shell>
      `);
      const carousel = element.querySelector<Carousel>('cds-aichat-carousel')!;
      await started(carousel);
      const action = element.querySelector('button')!;
      action.focus();
      element.selectedCitationIndex = 2;
      await element.updateComplete;
      await carousel.updateComplete;
      expect(visibleSlide(carousel)!.getAttribute('index')).to.equal('2');
      expect(document.activeElement).to.equal(action);
      expect(selects).to.have.length(0);
    });
  });
});
