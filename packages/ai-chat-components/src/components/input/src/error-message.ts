/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { css, html, LitElement, TemplateResult, unsafeCSS } from "lit";
import { property, state } from "lit/decorators.js";

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import WarningFilled16 from "@carbon/icons/es/warning--filled/16.js";
import ChevronDown16 from "@carbon/icons/es/chevron--down/16.js";
import ChevronUp16 from "@carbon/icons/es/chevron--up/16.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";

import styles from "./error-message.scss?lit";

const blockClass = `${prefix}-error-message`;

/**
 * Error message component for AI Chat input.
 *
 * @element cds-aichat-error-message
 */
@carbonElement(`${prefix}-error-message`)
class ErrorMessage extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * The error message to display.
   */
  @property({ type: String, attribute: "message" })
  message = "";

  /**
   * Whether the error message is expandable.
   */
  @property({ type: Boolean, attribute: "expandable" })
  expandable = false;

  /**
   * Whether the error message is in fullscreen layout.
   */
  @property({ type: Boolean, attribute: "fullscreen" })
  fullscreen = false;

  /**
   * Whether the error message is currently expanded
   * @internal
   */
  @state() private isExpanded = false;

  render() {
    const warningIcon = html`<span class="${blockClass}__icon">
      ${iconLoader(WarningFilled16)}
    </span>`;

    let chevronIcon: TemplateResult | null = null;
    if (this.expandable) {
      const icon = this.isExpanded ? ChevronUp16 : ChevronDown16;
      chevronIcon = html`<span class="${blockClass}__chevron">
        ${iconLoader(icon)}
      </span>`;
    }

    return html`
      <div class="${blockClass}">
        ${!this.fullscreen && warningIcon}
        <span class="${blockClass}__text">${this.message}</span>
        ${this.fullscreen && warningIcon} ${chevronIcon}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-error-message": ErrorMessage;
  }
}

export default ErrorMessage;
