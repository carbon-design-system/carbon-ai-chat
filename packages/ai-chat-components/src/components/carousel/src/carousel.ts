/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html } from 'lit';
import styles from './carousel.scss?lit';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import {
  initCarousel,
  InitCarousel,
  Config,
  CarouselResponse,
} from '@carbon/utilities';
import { queryAssignedElements } from 'lit/decorators/query-assigned-elements.js';
import { property, state } from 'lit/decorators.js';
import '@carbon/web-components/es/components/icon-button/icon-button.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import { ChevronLeft16, ChevronRight16 } from '@carbon/icons';

const blockClass = `${prefix}-carousel`;

/**
 * Carousel component
 *
 * @element cds-aichat-carousel
 * @fires cds-aichat-carousel-onchange custom event for when the carousel changes
 * @slot - Carousel views.
 */
@carbonElement(blockClass)
class CDSAICarousel extends LitElement {
  /**
   * Text for the next button
   */
  @property({ type: String })
  nextBtnText?: string;

  /**
   * Text for the previous button
   */
  @property({ type: String })
  previousBtnText?: string;

  /**
   * The slide to show, counted from 0. When set, the carousel starts on this
   * slide, and moving to it fires no `cds-aichat-carousel-onchange`. Leave it
   * unset to start on the first slide and report that start. The carousel
   * doesn't update it when the user changes slides, so set it from
   * `cds-aichat-carousel-onchange` to keep the two in step.
   */
  @property({ type: Number, attribute: 'current-index' })
  currentIndex?: number;

  @queryAssignedElements({ flatten: true })
  private container?: Array<HTMLElement>;

  // While a programmatic move steps through slides, their ends fire no onchange.
  private _stepping = false;

  // With motion on, a programmatic move's last step ends on transitionend,
  // after _moveTo returns. That end fires no onchange either.
  private _pendingIndex?: number;

  private _reducedMotion = false;

  private carousel?: InitCarousel;

  @state()
  private _currentIndex = 0;

  @state()
  private _lastIndex = 0;

  private _handlePrev() {
    // The user's step may land on a pending move's own slide; report it.
    this._pendingIndex = undefined;
    this.carousel?.prev();
  }

  private _handleNext() {
    this._pendingIndex = undefined;
    this.carousel?.next();
  }

  // Steps one slide at a time. Prev pops the library's history, so jumping
  // straight to a slide would send a later Prev back to where the jump began.
  private _moveTo(target: number) {
    const carousel = this.carousel;
    if (!carousel) {
      return;
    }
    const index = Math.max(0, Math.min(target, this._lastIndex));
    let current = carousel.getActiveItem().index;
    if (index === current) {
      return;
    }
    this._currentIndex = index;
    this._stepping = true;
    try {
      for (; current < index; current++) {
        carousel.next();
      }
      for (; current > index; current--) {
        carousel.prev();
      }
    } finally {
      this._stepping = false;
    }
    this._pendingIndex = this._reducedMotion ? undefined : index;
  }

  private _dispatchChange(data: CarouselResponse) {
    const init = {
      detail: data,
      bubbles: true,
      composed: true,
    };
    this.dispatchEvent(
      new CustomEvent(
        (this.constructor as typeof CDSAICarousel).eventOnChange,
        init
      )
    );
  }

  async firstUpdated() {
    if (this.container) {
      // temp solution to account for image load time
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
      let starting = true;
      const config: Config = {
        onViewChangeEnd: (endData) => {
          if (this._stepping) {
            return;
          }
          const pending = this._pendingIndex;
          this._pendingIndex = undefined;
          // Any other end comes from the user, including a swipe while the
          // move's transitionend is still due or never comes.
          if (endData.currentIndex === pending) {
            return;
          }
          this._currentIndex = endData.currentIndex;
          // initCarousel reports the first slide synchronously.
          if (!(starting && this.currentIndex !== undefined)) {
            this._dispatchChange(endData);
          }
        },
      };
      // initCarousel reads this once too.
      this._reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      this.carousel = initCarousel(this.container[0], config);
      starting = false;
      this._lastIndex = Object.keys(this.carousel.allViews).length - 1;
      if (this.currentIndex !== undefined) {
        this._moveTo(this.currentIndex);
      }
    }
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('currentIndex') && this.currentIndex !== undefined) {
      this._moveTo(this.currentIndex);
    }
  }

  render() {
    return html`
      <div class=${blockClass}>
        <slot></slot>
        <div class="${blockClass}__controls">
          <cds-icon-button
            class="${blockClass}__previous-btn"
            @click=${this._handlePrev}
            kind="ghost"
            size="sm"
            align="bottom-start"
            enter-delay-ms="0"
            leave-delay-ms="0">
            ${iconLoader(ChevronLeft16, { slot: 'icon' })}
            <span slot="tooltip-content">${this.previousBtnText}</span>
          </cds-icon-button>
          <span class="${blockClass}__indicator"
            >${this._currentIndex + 1} / ${this._lastIndex + 1}</span
          >
          <cds-icon-button
            class="${blockClass}__next-btn"
            @click=${this._handleNext}
            kind="ghost"
            size="sm"
            align="bottom-start"
            enter-delay-ms="0"
            leave-delay-ms="0">
            ${iconLoader(ChevronRight16, { slot: 'icon' })}
            <span slot="tooltip-content">${this.nextBtnText}</span>
          </cds-icon-button>
        </div>
      </div>
    `;
  }

  static get eventOnChange() {
    return `${blockClass}-onchange`;
  }

  static styles = styles;
}

export default CDSAICarousel;
