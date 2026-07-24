/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/tooltip/index.js";

import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("writeable-element-example")
class WriteableElementExample extends LitElement {
  static styles = css`
    /* Block host + flex tooltip so the swatch's slot content is exactly the
       swatch height. The element defaults to inline, and Carbon's cds-tooltip is
       inline too, which reserves font-descender space below the swatch and
       throws off its vertical alignment in the header / prompt-line rows. */
    :host {
      display: block;
    }
    cds-tooltip {
      display: flex;
      align-items: center;
    }
    .writeable-element-external--not-rounded {
      --cds-aichat-border-radius-start-start: 0;
      --cds-aichat-border-radius-start-end: 0;
      --cds-aichat-border-radius-end-start: 0;
      --cds-aichat-border-radius-end-end: 0;
    }
    .external {
      background: green;
      color: #fff;
      padding: 1rem;
      border-start-start-radius: var(--cds-aichat-border-radius-start-start);
      border-start-end-radius: var(--cds-aichat-border-radius-start-end);
      border-end-start-radius: var(--cds-aichat-border-radius-end-start);
      border-end-end-radius: var(--cds-aichat-border-radius-end-end);
    }
    .external--swatch {
      display: block;
      inline-size: 32px;
      block-size: 32px;
      padding: 0;
      border: 0;
      background: green;
      cursor: pointer;
    }
    .external--swatch-header {
      inline-size: 24px;
      block-size: 24px;
    }
  `;

  @property({ type: String })
  accessor location: string = "";

  @property({ type: String })
  accessor valueFromParent: string = "";

  render() {
    let classNames = "external";
    if (this.location === "aiTooltipAfterDescriptionElement") {
      classNames += " writeable-element-external--not-rounded";
    }

    // The header fixed actions and in-composer prompt-line slots sit inside tight
    // rows, so show a small green swatch that names the slot in a Carbon tooltip
    // on hover/focus rather than a text block. The prompt-line swatches match the
    // 32px input controls; the header uses smaller (24px) icons, so its swatch is
    // 24px.
    if (
      this.location === "headerFixedActionsElement" ||
      this.location === "promptLineActionsEnd" ||
      this.location === "promptLineSendButtonStart"
    ) {
      const isHeader = this.location === "headerFixedActionsElement";
      const swatchClass = isHeader
        ? "external--swatch external--swatch-header"
        : "external--swatch";
      // The header swatch sits at the top of the chat, so prefer pointing its
      // tooltip down into the chat body; the prompt-line swatches sit at the
      // bottom, so they prefer pointing up into the message area. `autoalign`
      // (floating-ui) then flips/shifts from that preferred side to stay inside
      // the viewport — needed for the sidebar/float layouts and RTL, where a
      // fixed side would clip against the chat or page edge.
      const align = isHeader ? "bottom" : "top";
      return html`<cds-tooltip align="${align}" autoalign>
        <button
          type="button"
          class="${swatchClass}"
          aria-label=${this.location}
        ></button>
        <cds-tooltip-content>${this.location}</cds-tooltip-content>
      </cds-tooltip>`;
    }

    return html`<div class="${classNames}">
      Location: ${this.location}. Parent prop: ${this.valueFromParent}.
    </div> `;
  }
}

export default WriteableElementExample;
