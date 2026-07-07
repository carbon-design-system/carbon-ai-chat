/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html } from "lit";
import styles from "./carousel.scss?lit";
import { carbonElement } from "../../../globals/decorators/index.js";
import prefix from "../../../globals/settings.js";
import {
  initCarousel,
  InitCarousel,
  Config,
  CarouselResponse,
} from "@carbon/utilities";
import { queryAssignedElements } from "lit/decorators/query-assigned-elements.js";
import { property, state } from "lit/decorators.js";
import "@carbon/web-components/es/components/icon-button/icon-button.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import { ChevronLeft16, ChevronRight16 } from "@carbon/icons";

const blockClass = `${prefix}-carousel`;

/**
 * Carousel component
 *
 * @element cds-aichat-carousel
 * @fires cds-aichat-carousel-onchange custom event for when the carousel changes
 * @slot body The body
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

  @queryAssignedElements({ flatten: true })
  private container?: Array<HTMLElement>;

  private carousel?: InitCarousel;

  @state()
  private _currentIndex = 0;

  @state()
  private _lastIndex = 0;

  private _handlePrev() {
    this.carousel?.prev();
  }

  private _handleNext() {
    this.carousel?.next();
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
        init,
      ),
    );
  }

  async firstUpdated() {
    if (this.container) {
      // temp solution to account for image load time
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
      const config: Config = {
        onViewChangeEnd: (endData) => {
          this._currentIndex = endData.currentIndex;
          this._dispatchChange(endData);
        },
      };
      this.carousel = initCarousel(this.container[0], config);
      this._lastIndex = Object.keys(this.carousel.allViews).length - 1;
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
            leave-delay-ms="0"
          >
            ${iconLoader(ChevronLeft16, { slot: "icon" })}
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
            leave-delay-ms="0"
          >
            ${iconLoader(ChevronRight16, { slot: "icon" })}
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
