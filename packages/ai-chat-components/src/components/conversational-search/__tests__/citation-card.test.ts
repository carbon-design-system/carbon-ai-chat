/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html, nextFrame, waitUntil } from '@open-wc/testing';
import '@carbon/ai-chat-components/es/components/conversational-search/index.js';
import '@carbon/ai-chat-components/es/components/carousel/index.js';
import CitationCard from '@carbon/ai-chat-components/es/components/conversational-search/src/citation-card.js';

const LONG_TEXT = 'Carbon is the design system for IBM products. '.repeat(12);

function recordEvents() {
  const events: CustomEvent[] = [];
  const listener = (event: Event) => events.push(event as CustomEvent);
  const types = [
    CitationCard.eventCitationSelect,
    CitationCard.eventCitationExpand,
  ];
  for (const type of types) {
    document.addEventListener(type, listener);
  }
  return {
    events,
    types: () => events.map((event) => event.type),
    stop: () => {
      for (const type of types) {
        document.removeEventListener(type, listener);
      }
    },
  };
}

function interactive(card: CitationCard) {
  return card.shadowRoot!.querySelector<HTMLElement>('a, button');
}

// The name comes from content, so the element must hold the title and nothing
// else.
function namedByTitleOnly(element: HTMLElement) {
  const slots = element.querySelectorAll<HTMLSlotElement>('slot');
  return (
    !element.hasAttribute('aria-label') &&
    !element.hasAttribute('aria-labelledby') &&
    slots.length === 1 &&
    slots[0].assignedElements()[0]?.textContent === 'Source title' &&
    element.textContent!.trim() === ''
  );
}

function footerLabel(card: CitationCard) {
  return card.shadowRoot!.querySelector('[class$="__label"]')?.textContent;
}

async function card(
  attributes: Partial<
    Pick<CitationCard, 'url' | 'expandable' | 'sourceLabel'>
  > = {},
  body = 'Short cited text.'
) {
  const element = await fixture<CitationCard>(html`
    <cds-aichat-citation-card
      index="2"
      .url=${attributes.url}
      ?expandable=${attributes.expandable}
      .sourceLabel=${attributes.sourceLabel}>
      <div slot="title">Source title</div>
      <div slot="body">${body}</div>
    </cds-aichat-citation-card>
  `);
  // Let the first overflow measurement land.
  await nextFrame();
  await nextFrame();
  await element.updateComplete;
  return element;
}

describe('citation card', () => {
  it('citation-card: link variant', async () => {
    const element = await card({ url: 'https://www.example.com/docs' });
    const link = interactive(element)!;
    expect(link.localName).to.equal('a');
    expect(link.getAttribute('href')).to.equal('https://www.example.com/docs');
    expect(link.getAttribute('target')).to.equal('_blank');
    expect(link.getAttribute('rel')).to.equal('noopener noreferrer');
    expect(footerLabel(element)).to.equal('www.example.com');
  });

  it('citation-card: expandable variant names the button by title', async () => {
    const element = await card({
      expandable: true,
      sourceLabel: 'View source',
    });
    const button = interactive(element)!;
    expect(button.localName).to.equal('button');
    expect(button.getAttribute('type')).to.equal('button');
    expect(namedByTitleOnly(button)).to.equal(true);
    expect(footerLabel(element)).to.equal('View source');
  });

  it('citation-card: plain variant', async () => {
    const element = await card({ sourceLabel: 'View source' });
    expect(interactive(element)).to.equal(null);
    expect(element.shadowRoot!.querySelector('[tabindex]')).to.equal(null);
    expect(footerLabel(element)).to.equal(undefined);
  });

  it('citation-card: only interactive variants are named', async () => {
    const plain = await card();
    expect(
      plain.shadowRoot!.querySelector('[aria-labelledby], [aria-label]')
    ).to.equal(null);
    const link = await card({ url: 'https://www.example.com' });
    expect(namedByTitleOnly(interactive(link)!)).to.equal(true);
    const button = await card({ expandable: true });
    expect(namedByTitleOnly(interactive(button)!)).to.equal(true);
  });

  it('citation-card: overflow re-measures both ways on resize', async () => {
    const container = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 1200px">
        <cds-aichat-citation-card index="1">
          <div slot="title">Source title</div>
          <div slot="body">${'Carbon is the design system. '.repeat(10)}</div>
        </cds-aichat-citation-card>
      </div>
    `);
    const element = container.querySelector<CitationCard>(
      'cds-aichat-citation-card'
    )!;
    await nextFrame();
    await nextFrame();
    await element.updateComplete;
    expect(interactive(element)).to.equal(null);

    container.style.inlineSize = '200px';
    await waitUntil(
      () => interactive(element)?.localName === 'button',
      'narrow card did not become expandable'
    );
    container.style.inlineSize = '1200px';
    await waitUntil(
      () => interactive(element) === null,
      'wide card did not become plain'
    );
  });

  it('citation-card: keeps measuring after a carousel moves it', async () => {
    const container = await fixture<HTMLDivElement>(html`
      <div style="position: relative; inline-size: 1200px">
        <cds-aichat-carousel>
          <div>
            <cds-aichat-citation-card index="0">
              <div slot="title">Source title</div>
              <div slot="body">
                ${'Carbon is the design system. '.repeat(10)}
              </div>
            </cds-aichat-citation-card>
          </div>
        </cds-aichat-carousel>
      </div>
    `);
    const element = container.querySelector<CitationCard>(
      'cds-aichat-citation-card'
    )!;
    // Starting, the carousel moves each slide into a wrapper, which
    // disconnects and reconnects it.
    await waitUntil(
      () => element.hasAttribute('data-index'),
      'carousel did not start'
    );
    await nextFrame();
    await nextFrame();
    expect(interactive(element)).to.equal(null);
    container.style.inlineSize = '200px';
    await waitUntil(
      () => interactive(element)?.localName === 'button',
      'moved card did not become expandable'
    );
  });

  it('citation-card: forced expandable ignores fit', async () => {
    const element = await card({ expandable: true });
    expect(interactive(element)!.localName).to.equal('button');
    element.style.inlineSize = '1200px';
    await nextFrame();
    await nextFrame();
    await element.updateComplete;
    expect(interactive(element)!.localName).to.equal('button');
  });

  it('citation-card: a url card is never expandable', async () => {
    const element = await card(
      { url: 'https://www.example.com', expandable: true },
      LONG_TEXT
    );
    expect(interactive(element)!.localName).to.equal('a');
  });

  it('citation-card: select on focus and click', async () => {
    const recorder = recordEvents();
    // Keep link clicks from opening a tab.
    const preventNavigation = (event: Event) => event.preventDefault();
    window.addEventListener('click', preventNavigation);
    try {
      const link = await card({ url: 'https://www.example.com' });
      interactive(link)!.focus();
      expect(recorder.types()).to.deep.equal([
        CitationCard.eventCitationSelect,
      ]);
      expect(recorder.events[0].detail).to.deep.equal({ index: 2 });
      interactive(link)!.click();
      expect(recorder.types()).to.have.length(2);

      recorder.events.length = 0;
      const button = await card({ expandable: true });
      interactive(button)!.focus();
      expect(recorder.types()).to.deep.equal([
        CitationCard.eventCitationSelect,
      ]);

      recorder.events.length = 0;
      const plain = await card();
      plain.click();
      plain
        .shadowRoot!.querySelector<HTMLElement>('[class*="__frame"]')!
        .click();
      expect(recorder.events).to.have.length(0);
    } finally {
      recorder.stop();
      window.removeEventListener('click', preventNavigation);
    }
  });

  it('citation-card: expand on activation only', async () => {
    const recorder = recordEvents();
    try {
      const element = await card({ expandable: true });
      interactive(element)!.focus();
      expect(recorder.types()).to.deep.equal([
        CitationCard.eventCitationSelect,
      ]);
      recorder.events.length = 0;
      interactive(element)!.click();
      expect(recorder.types()).to.deep.equal([
        CitationCard.eventCitationExpand,
        CitationCard.eventCitationSelect,
      ]);
      for (const event of recorder.events) {
        expect(event.detail).to.deep.equal({ index: 2 });
        expect(event.bubbles).to.equal(true);
        expect(event.composed).to.equal(true);
      }
    } finally {
      recorder.stop();
    }
  });

  it('citation-card: link click is not prevented', async () => {
    const recorder = recordEvents();
    let defaultPrevented: boolean | undefined;
    const inspect = (event: Event) => {
      defaultPrevented = event.defaultPrevented;
      // Keep the test page from opening a tab.
      event.preventDefault();
    };
    window.addEventListener('click', inspect);
    try {
      const element = await card({ url: 'https://www.example.com' });
      interactive(element)!.click();
      expect(defaultPrevented).to.equal(false);
      expect(recorder.types()).to.deep.equal([
        CitationCard.eventCitationSelect,
      ]);
    } finally {
      recorder.stop();
      window.removeEventListener('click', inspect);
    }
  });

  it('citation-card: reflects selected', async () => {
    const element = await card();
    element.selected = true;
    await element.updateComplete;
    expect(element.hasAttribute('selected')).to.equal(true);
  });
});
