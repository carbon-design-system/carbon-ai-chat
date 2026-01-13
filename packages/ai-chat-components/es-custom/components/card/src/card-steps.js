/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, nothing, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import { ICON_INDICATOR_KIND } from '@carbon/web-components/es-custom/components/icon-indicator/icon-indicator.js';
import '@carbon/web-components/es-custom/components/loading/loading.js';
import prefix from '../../../globals/settings.js';
import styles from './card-steps.scss.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';

/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Step component
 */
let CardSteps = class CardSteps extends LitElement {
    constructor() {
        super(...arguments);
        /** Steps to render */
        this.steps = [];
    }
    render() {
        return html `
      <div class="${prefix}-card-steps">
        ${this.steps.length > 0
            ? repeat(this.steps, (step) => step.title, (step) => html `
                <div class="${prefix}-card-step">
                  ${!step.kind
                ? html `${step.label}`
                : step.kind !== ICON_INDICATOR_KIND["IN-PROGRESS"]
                    ? html `
                          <div class="${prefix}-card-step-indicator">
                            <cds-custom-icon-indicator
                              kind="${ifDefined(step.kind)}"
                              size="16"
                            ></cds-custom-icon-indicator>
                            ${step.label}
                          </div>
                        `
                    : html `
                          <div class="${prefix}-card-step-indicator">
                            <cds-custom-loading
                              active
                              description="Loading"
                              assistive-text="Loading"
                              small
                            ></cds-custom-loading>
                            ${step.label}
                          </div>
                        `}

                  <div class="${prefix}-card-step-content">
                    <p class="${prefix}-card-step-title">${step.title}</p>
                    ${step.description
                ? html `<div class="${prefix}-card-step-description">
                          ${step.description}
                        </div>`
                : nothing}
                  </div>
                </div>
              `)
            : nothing}
      </div>
    `;
    }
};
CardSteps.styles = styles;
__decorate([
    property({ type: Array })
], CardSteps.prototype, "steps", void 0);
CardSteps = __decorate([
    carbonElement("cds-aichat-card-steps")
], CardSteps);
var CDSAIChatCardSteps = CardSteps;

export { CDSAIChatCardSteps as default };
//# sourceMappingURL=card-steps.js.map
