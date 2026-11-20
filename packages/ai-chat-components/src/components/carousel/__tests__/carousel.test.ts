/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect, waitUntil } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import '@carbon/ai-chat-components/es/components/carousel/index.js';
import Carousel from '@carbon/ai-chat-components/es/components/carousel/src/carousel.js';
import prefix from '../../../globals/settings';

const blockClass = `${prefix}-carousel`;

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

  describe('current-index', () => {
    let changes: number[];
    const record = (event: Event) =>
      changes.push((event as CustomEvent).detail.currentIndex);

    beforeEach(() => {
      changes = [];
      document.addEventListener(Carousel.eventOnChange, record);
    });

    afterEach(async () => {
      document.removeEventListener(Carousel.eventOnChange, record);
      await emulateMedia({ reducedMotion: 'no-preference' });
    });

    async function carousel(currentIndex?: number) {
      const element = await fixture<Carousel>(html`
        <cds-aichat-carousel .currentIndex=${currentIndex}>
          <div>
            <div class="slide">slide 1</div>
            <div class="slide">slide 2</div>
            <div class="slide">slide 3</div>
            <div class="slide">slide 4</div>
          </div>
        </cds-aichat-carousel>
      `);
      // Slides get data-index when the carousel starts, after its 100 ms wait.
      await waitUntil(
        () => element.querySelector('[data-index]'),
        'carousel did not start'
      );
      return element;
    }

    function slides(element: Carousel) {
      return [...element.querySelectorAll<HTMLElement>('.slide')];
    }

    function visible(element: Carousel) {
      return slides(element).findIndex((slide) => !slide.hasAttribute('inert'));
    }

    function indicator(element: Carousel) {
      return element.shadowRoot!.querySelector(`.${blockClass}__indicator`)!
        .textContent;
    }

    function click(element: Carousel, button: 'previous' | 'next') {
      element
        .shadowRoot!.querySelector<HTMLElement>(
          `.${blockClass}__${button}-btn`
        )!
        .click();
    }

    async function moveTo(element: Carousel, index: number) {
      element.currentIndex = index;
      await element.updateComplete;
    }

    it('carousel: startup onchange unchanged without current-index', async () => {
      await emulateMedia({ reducedMotion: 'reduce' });
      const element = await carousel();
      expect(changes).to.deep.equal([0]);
      expect(visible(element)).to.equal(0);
    });

    it('carousel: current-index applies at startup without onchange', async () => {
      await emulateMedia({ reducedMotion: 'reduce' });
      const element = await carousel(2);
      expect(visible(element)).to.equal(2);
      await element.updateComplete;
      expect(indicator(element)).to.equal('3 / 4');
      expect(changes).to.deep.equal([]);
    });

    it('carousel: current-index past the last slide shows the last slide', async () => {
      await emulateMedia({ reducedMotion: 'reduce' });
      const element = await carousel(9);
      expect(visible(element)).to.equal(3);
      expect(changes).to.deep.equal([]);
    });

    it('carousel: programmatic moves are silent with reduced motion', async () => {
      await emulateMedia({ reducedMotion: 'reduce' });
      const element = await carousel();
      changes.length = 0;
      await moveTo(element, 2);
      expect(visible(element)).to.equal(2);
      expect(changes).to.deep.equal([]);
      click(element, 'next');
      expect(visible(element)).to.equal(3);
      expect(changes).to.deep.equal([3]);
    });

    it('carousel: programmatic moves are silent with motion', async () => {
      const element = await carousel();
      changes.length = 0;
      await moveTo(element, 2);
      expect(visible(element)).to.equal(2);
      // No transition CSS runs here, so end the move by hand.
      slides(element)[2].dispatchEvent(new Event('transitionend'));
      expect(changes).to.deep.equal([]);
      click(element, 'next');
      slides(element)[3].dispatchEvent(new Event('transitionend'));
      expect(visible(element)).to.equal(3);
      expect(changes).to.deep.equal([3]);
    });

    it('carousel: user navigation reports even if a move never ends', async () => {
      const element = await carousel();
      changes.length = 0;
      await moveTo(element, 2);
      click(element, 'next');
      slides(element)[3].dispatchEvent(new Event('transitionend'));
      expect(changes).to.deep.equal([3]);
    });

    it('carousel: a swipe during a pending move reports', async () => {
      const element = await carousel();
      changes.length = 0;
      await moveTo(element, 2);
      element
        .querySelector('div')!
        .dispatchEvent(
          new WheelEvent('wheel', { deltaX: 50, cancelable: true })
        );
      slides(element)[3].dispatchEvent(new Event('transitionend'));
      expect(visible(element)).to.equal(3);
      expect(changes).to.deep.equal([3]);
    });

    it('carousel: a backward move before any animation stays silent', async () => {
      const element = await carousel();
      changes.length = 0;
      await moveTo(element, 2);
      // Until it sees an animation, the library also ends each Prev at once.
      await moveTo(element, 0);
      slides(element)[0].dispatchEvent(new Event('transitionend'));
      expect(visible(element)).to.equal(0);
      expect(changes).to.deep.equal([]);
      click(element, 'next');
      slides(element)[1].dispatchEvent(new Event('transitionend'));
      expect(changes).to.deep.equal([1]);
    });

    it('carousel: prev after a programmatic move goes to the previous slide', async () => {
      await emulateMedia({ reducedMotion: 'reduce' });
      const element = await carousel(2);
      click(element, 'previous');
      expect(visible(element)).to.equal(1);
      click(element, 'previous');
      expect(visible(element)).to.equal(0);
      expect(changes).to.deep.equal([1, 0]);

      changes.length = 0;
      await moveTo(element, 3);
      await moveTo(element, 1);
      expect(visible(element)).to.equal(1);
      click(element, 'previous');
      expect(visible(element)).to.equal(0);
      expect(changes).to.deep.equal([0]);
    });
  });
});
