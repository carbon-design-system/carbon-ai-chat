/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  css,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  unsafeCSS,
} from "lit";
import { property, state } from "lit/decorators.js";

import "@carbon/web-components/es/components/icon-button/index.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import WarningFilled16 from "@carbon/icons/es/warning--filled/16.js";
import ChevronDown16 from "@carbon/icons/es/chevron--down/16.js";
import ChevronUp16 from "@carbon/icons/es/chevron--up/16.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";

import styles from "./error-message.scss?lit";

const blockClass = `${prefix}-error-message`;

/**
 * Error message component for AI Chat prompt line.
 *
 * @element cds-aichat-error-message
 */
@carbonElement(`${prefix}-error-message`)
class ErrorMessage extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * The error title text to display.
   */
  @property({ type: String, attribute: "title" })
  title = "";

  /**
   * The error description text to display.
   */
  @property({ type: String, attribute: "description" })
  description = "";

  /**
   * Whether the error message is collapsible.
   */
  @property({ type: Boolean, attribute: "collapsible" })
  collapsible = false;

  /**
   * Whether the prompt line has alternate layout for expanded mode and/or message actions.
   */
  @property({ type: Boolean, reflect: true, attribute: "actions-layout" })
  actionsLayout = false;

  /**
   * Whether the error message is in fullscreen layout.
   */
  @property({ type: Boolean, attribute: "fullscreen" })
  fullscreen = false;

  /**
   * Whether the error message is currently expanded.
   * @internal
   */
  @state() private _isExpanded = true;

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("collapsible")) {
      this._isExpanded = !this.collapsible;
    }
  }

  /**
   * Toggles the expanded state to show more or less of the error message.
   */
  private _handleClickExpanded() {
    this._isExpanded = !this._isExpanded;
  }

  render() {
    const warningIcon = html`<span class="${blockClass}__warning-icon">
      ${iconLoader(WarningFilled16)}
    </span>`;

    const hasChevron = this.collapsible && this.description;

    let expandButton: TemplateResult | null = null;
    if (hasChevron) {
      const icon = this._isExpanded ? ChevronUp16 : ChevronDown16;
      const label = `${this._isExpanded ? "Collapse" : "Expand"} error message`;

      expandButton = html`<cds-icon-button
        class="${blockClass}__chevron"
        kind="ghost"
        size="sm"
        align="top-end"
        aria-label="${label}"
        @click="${this._handleClickExpanded}"
      >
        ${iconLoader(icon, { slot: "icon", focusable: "true", tabindex: "-1" })}
        <span slot="tooltip-content">${label}</span>
      </cds-icon-button>`;
    }

    return html`
      <div class="${blockClass}">
        <div
          class="${blockClass}__warning-icon-and-text${
            !hasChevron
              ? ` ${blockClass}__warning-icon-and-text--no-chevron`
              : ""
          }"
        >
          ${this.fullscreen ? null : warningIcon}
          <div
            class="${blockClass}__text${
              this._isExpanded ? ` ${blockClass}__text--expanded` : ""
            }"
          >
            ${this.title}<br />
            ${this._isExpanded ? this.description : ""}
          </div>
          ${this.fullscreen ? warningIcon : null}
        </div>
        ${expandButton}
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
