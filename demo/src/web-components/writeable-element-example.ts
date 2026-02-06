/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("writeable-element-example")
class WriteableElementExample extends LitElement {
  static styles = css`
    .writeable-element-external--not-rounded {
      --cds-aichat-rounded-modifier-radius-start-start: 0;
      --cds-aichat-rounded-modifier-radius-start-end: 0;
      --cds-aichat-rounded-modifier-radius-end-start: 0;
      --cds-aichat-rounded-modifier-radius-end-end: 0;
    }
    .external {
      background: green;
      color: #fff;
      padding: 1rem;
      border-start-start-radius: var(
        --cds-aichat-rounded-modifier-radius-start-start
      );
      border-start-end-radius: var(
        --cds-aichat-rounded-modifier-radius-start-end
      );
      border-end-start-radius: var(
        --cds-aichat-rounded-modifier-radius-end-start
      );
      border-end-end-radius: var(--cds-aichat-rounded-modifier-radius-end-end);
    }
    .external--compact {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 0;
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

    // Special compact display for header fixed actions
    if (this.location === "headerFixedActionsElement") {
      return html`<div class="external external--compact">
        ${this.location}
      </div>`;
    }

    return html`<div class="${classNames}">
      Location: ${this.location}. Parent prop: ${this.valueFromParent}.
    </div> `;
  }
}

export default WriteableElementExample;
