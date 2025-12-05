/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { repeat } from "lit/directives/repeat.js";
import "@carbon/web-components/es/components/icon-indicator/icon-indicator.js";
import "@carbon/web-components/es/components/loading/loading.js";
import { ICON_INDICATOR_KIND } from "@carbon/web-components/es/components/icon-indicator/icon-indicator.js";
import prefix from "../../../globals/settings.js";
// @ts-ignore
import styles from "./card-steps.scss?lit";

export type Step = {
  title: string;
  description?: string;
  kind?: ICON_INDICATOR_KIND;
  label?: string;
};
/**
 * Step component
 */
@customElement(`${prefix}-card-steps`)
class CardSteps extends LitElement {
  static styles = styles;

  /** Steps to render */
  @property({ type: Array })
  steps: Step[] = [];

  render() {
    return html`
      <div class="${prefix}-card-steps">
        ${this.steps.length > 0
          ? repeat(
              this.steps,
              (step) => step.title,
              (step) => html`
                <div class="${prefix}-card-step">
                  ${!step.kind
                    ? html`${step.label}`
                    : step.kind !== ICON_INDICATOR_KIND["IN-PROGRESS"]
                      ? html`
                          <div class="${prefix}-card-step-indicator">
                            <cds-icon-indicator
                              kind="${ifDefined(step.kind)}"
                              size="16"
                            ></cds-icon-indicator>
                            ${step.label}
                          </div>
                        `
                      : html`
                          <div class="${prefix}-card-step-indicator">
                            <cds-loading
                              active
                              description="Loading"
                              assistive-text="Loading"
                              small
                            ></cds-loading>
                            ${step.label}
                          </div>
                        `}

                  <div class="${prefix}-card-step-content">
                    <p class="${prefix}-card-step-title">${step.title}</p>
                    ${step.description
                      ? html`<div class="${prefix}-card-step-description">
                          ${step.description}
                        </div>`
                      : nothing}
                  </div>
                </div>
              `,
            )
          : nothing}
      </div>
    `;
  }
}

export default CardSteps;
