/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from '@open-wc/testing';
import '@carbon/ai-chat-components/es/components/carousel/index.js';
import Carousel from '@carbon/ai-chat-components/es/components/carousel/src/carousel.js';
import { prefix } from '../../../globals/settings';

const blockClass = `${prefix}-aichat-carousel`;

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

const template = html`
  <cds-aichat-carousel>
    <div class="carousel-wrapper">
      <div>slide 1</div>
      <div>slide 2</div>
      <div>slide 3</div>
    </div>
  </cds-aichat-carousel>
`;

describe('carousel', function async() {
  it('uses an overridden event name when a subclass dispatches a view change', () => {
    class NamedCarousel extends Carousel {
      static get eventOnChange() {
        return 'consumer-carousel-change';
      }
    }
    customElements.define('test-named-carousel', NamedCarousel);
    const element = new NamedCarousel();
    const received: CustomEvent[] = [];
    element.addEventListener('consumer-carousel-change', (event) => {
      received.push(event as CustomEvent);
    });
    let defaultEvents = 0;
    element.addEventListener('cds-aichat-carousel-onchange', () => {
      defaultEvents += 1;
    });
    const detail = { currentIndex: 1 };

    element['_dispatchChange'](detail as any);

    expect(received).to.have.length(1);
    expect(received[0].detail).to.equal(detail);
    expect(defaultEvents).to.equal(0);
  });

  it.skip('should render with cds-aichat-carousel minimum attributes', async () => {
    const el = await fixture<Carousel>(template);
    await el.updateComplete;

    // temp solution to account for image load time and the component's own
    // 100ms wait inside firstUpdated before initCarousel runs (plus the
    // setTimeout-scheduled style writes inside @carbon/utilities)
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 300));

    expect(el).to.be.instanceOf(Carousel);

    const root = el.shadowRoot;
    expect(root).to.exist;

    const indicator = root?.querySelector(`.${blockClass}__indicator`);
    expect(indicator?.textContent).to.equal('1 / 3');

    await expect(el).dom.to.equalSnapshot();
  });
});
