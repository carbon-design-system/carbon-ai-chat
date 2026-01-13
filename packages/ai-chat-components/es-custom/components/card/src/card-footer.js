/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, nothing, html } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import { BUTTON_SIZE } from '@carbon/web-components/es-custom/components/button/button.js';
import '@carbon/web-components/es-custom/components/icon-button/icon-button.js';
import { iconLoader } from '@carbon/web-components/es-custom/globals/internal/icon-loader.js';
import prefix from '../../../globals/settings.js';
import styles from './card-footer.scss.js';
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
 * Footer action bar that renders Carbon buttons and emits an `action` event.
 * Consumers listen for events instead of passing callbacks.
 */
let CardFooter = class CardFooter extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * Sets default slot value to footer
         */
        this.slot = "footer";
        /** Card actions to render */
        this.actions = [];
        this.size = BUTTON_SIZE.LARGE;
        this.isIconButton = false;
    }
    handleAction(action) {
        if (action.onClick) {
            action.onClick();
        }
        this.dispatchEvent(new CustomEvent("cds-aichat-card-footer-action", {
            detail: action,
            bubbles: true,
            composed: true,
        }));
    }
    updated(changedProperties) {
        if (changedProperties.has("actions")) {
            if (!this.actions || this.actions.length === 0) {
                return;
            }
            const allActionsHaveNoLabels = this.actions.every((action) => !action.label);
            this.isIconButton = allActionsHaveNoLabels;
        }
    }
    render() {
        if (!this.actions || this.actions.length === 0) {
            return nothing;
        }
        return !this.isIconButton
            ? html `
          <div
            class=${classMap({
                [`${prefix}-card-footer__actions`]: true,
                [`${prefix}-card-footer__actions--stacked`]: this.actions.length > 2,
            })}
            data-rounded="bottom"
            ?data-stacked=${this.actions.length > 2}
          >
            ${repeat(this.actions, (action) => action.id, (action) => html `<cds-custom-button
                  kind=${action.kind ?? "secondary"}
                  size=${ifDefined(this.size)}
                  ?disabled=${action.disabled || action.isViewing}
                  class=${classMap({
                [`${prefix}-card-footer__action-viewing`]: action.isViewing ?? false,
            })}
                  @click=${() => this.handleAction(action)}
                >
                  ${action.label}
                  ${action.icon
                ? iconLoader(action.icon, !action.isViewing
                    ? {
                        slot: "icon",
                        class: `${prefix}-card-footer__action-icon`,
                    }
                    : undefined)
                : nothing}
                </cds-custom-button> `)}
          </div>
        `
            : html `
          <div
            class=${classMap({
                [`${prefix}-card-footer__icon-actions`]: true,
            })}
            data-rounded="bottom-right"
            ?data-stacked=${this.actions.length > 2}
          >
            ${repeat(this.actions, (action) => action.id, (action) => html `<cds-custom-icon-button
                  kind=${action.kind ?? "ghost"}
                  size=${ifDefined(this.size)}
                  ?disabled=${action.disabled}
                  @click=${() => this.handleAction(action)}
                >
                  ${action.icon
                ? iconLoader(action.icon, { slot: "icon" })
                : nothing}
                  <span slot="tooltip-content">${action.tooltipText}</span>
                </cds-custom-icon-button> `)}
          </div>
        `;
    }
};
CardFooter.styles = styles;
__decorate([
    property({ type: String, reflect: true })
], CardFooter.prototype, "slot", void 0);
__decorate([
    property({ type: Array })
], CardFooter.prototype, "actions", void 0);
__decorate([
    property({ type: String })
], CardFooter.prototype, "size", void 0);
__decorate([
    property({ type: Boolean, attribute: "is-icon-button", reflect: true })
], CardFooter.prototype, "isIconButton", void 0);
CardFooter = __decorate([
    carbonElement("cds-aichat-card-footer")
], CardFooter);
var CDSAIChatCardFooter = CardFooter;

export { CDSAIChatCardFooter as default };
//# sourceMappingURL=card-footer.js.map
