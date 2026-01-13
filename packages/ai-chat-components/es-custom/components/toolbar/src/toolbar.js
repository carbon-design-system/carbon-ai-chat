/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, nothing, html } from 'lit';
import { state, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { repeat } from 'lit/directives/repeat.js';
import '@carbon/web-components/es-custom/components/button/index.js';
import '@carbon/web-components/es-custom/components/overflow-menu/index.js';
import '../../../node_modules/@carbon/utilities/es/documentLang/documentLang.js';
import { createOverflowHandler as L } from '../../../node_modules/@carbon/utilities/es/overflowHandler/overflowHandler.js';
import OverflowMenuVertical16 from '@carbon/icons/es/overflow-menu--vertical/16.js';
import { iconLoader } from '@carbon/web-components/es-custom/globals/internal/icon-loader.js';
import prefix from '../../../globals/settings.js';
import styles from './toolbar.scss.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
/**
 * Toolbar.
 *
 * @element cds-aichat-toolbar
 * @slot navigation - Defines the navigation area of the toolbar.
 * @slot title - Defines the title section of the toolbar.
 * @slot fixed-actions - Defines the area for displaying actions that are always visible (not overflowed) in the toolbar.
 * @slot toolbar-ai-label - Defines the area for displaying the AI label in the toolbar.
 *
 */
let CDSAIChatToolbar = class CDSAIChatToolbar extends LitElement {
    constructor() {
        super(...arguments);
        /** Hidden actions rendered in the overflow menu.
         *  @internal
         */
        this.hiddenItems = [];
        /** The list of actions. */
        this.actions = [];
        /** Should actions be overflowing. */
        this.overflow = false;
        this.measuring = true;
    }
    connectedCallback() {
        super.connectedCallback();
        this.style.visibility = this.overflow ? "hidden" : "visible";
    }
    firstUpdated() {
        if (!this.overflow) {
            return;
        }
        this.updateComplete.then(() => {
            this.setupOverflowHandler();
            this.style.removeProperty("visibility");
        });
    }
    updated(changedProps) {
        if (changedProps.has("actions")) {
            this.updateComplete
                .then(() => {
                this.hiddenItems = [];
            })
                .then(() => this.setupOverflowHandler())
                .then(() => {
                this.measuring = false;
            });
        }
    }
    setupOverflowHandler() {
        if (!this.container || !this.overflow) {
            return;
        }
        this.overflowHandler?.disconnect();
        this.overflowHandler = L({
            container: this.container,
            dimension: "width",
            onChange: (visibleItems) => {
                this.hiddenItems = this.actions.filter((_, i) => i >= visibleItems.length && !_.fixed);
            },
        });
    }
    disconnectedCallback() {
        this.overflowHandler?.disconnect();
        super.disconnectedCallback();
    }
    render() {
        const fixedActions = this.actions.filter((d) => d.fixed);
        const nonFixedActions = this.actions.filter((d) => !d.fixed);
        const renderIconButton = (action) => {
            return html `
        <cds-custom-icon-button
          ?data-fixed=${action.fixed}
          @click=${action.onClick}
          size=${action.size || "md"}
          align="bottom-end"
          kind="ghost"
          enter-delay-ms="0"
          leave-delay-ms="0"
        >
          ${iconLoader(action.icon, {
                slot: "icon",
            })}
          <span slot="tooltip-content">${action.text}</span>
        </cds-custom-icon-button>
      `;
        };
        return html `
      <div
        data-rounded="top"
        class=${classMap({ [`${prefix}-toolbar`]: true })}
      >
        <div data-fixed class="cds-aichat-toolbar__navigation">
          <slot name="navigation"></slot>
        </div>

        <div data-fixed class="cds-aichat-toolbar__title">
          <slot name="title"></slot>
        </div>

        <div data-fixed class="cds-aichat-toolbar__fixed-actions">
          <slot name="fixed-actions"></slot>
        </div>

        <div data-fixed><slot name="decorator"></slot></div>

        ${repeat(nonFixedActions, (_, i) => i, renderIconButton)}
        ${this.measuring || this.hiddenItems.length > 0
            ? html `
              <cds-custom-overflow-menu
                size=${this.actions?.[0]?.size || "md"}
                align="bottom-end"
                data-offset
                ?data-hidden=${this.hiddenItems.length === 0}
                kind="ghost"
                close-on-activation
                enter-delay-ms="0"
                leave-delay-ms="0"
              >
                ${iconLoader(OverflowMenuVertical16, {
                class: `${prefix}-toolbar-overflow-icon`,
                slot: "icon",
            })}
                <span slot="tooltip-content">Options</span>
                <cds-custom-overflow-menu-body flipped>
                  ${repeat(this.hiddenItems, (item) => item.text, (item) => html `
                      <cds-custom-overflow-menu-item @click=${item.onClick}>
                        ${item.text}
                      </cds-custom-overflow-menu-item>
                    `)}
                </cds-custom-overflow-menu-body>
              </cds-custom-overflow-menu>
            `
            : nothing}
        ${repeat(fixedActions, (_, i) => i, renderIconButton)}
      </div>
    `;
    }
};
CDSAIChatToolbar.styles = styles;
__decorate([
    state()
], CDSAIChatToolbar.prototype, "hiddenItems", void 0);
__decorate([
    property({ type: Array, attribute: false, reflect: false })
], CDSAIChatToolbar.prototype, "actions", void 0);
__decorate([
    property({ type: Boolean, attribute: "overflow", reflect: true })
], CDSAIChatToolbar.prototype, "overflow", void 0);
__decorate([
    query(`.${prefix}-toolbar`)
], CDSAIChatToolbar.prototype, "container", void 0);
__decorate([
    state()
], CDSAIChatToolbar.prototype, "measuring", void 0);
CDSAIChatToolbar = __decorate([
    carbonElement("cds-aichat-toolbar")
], CDSAIChatToolbar);
var CDSAIChatToolbar$1 = CDSAIChatToolbar;

export { CDSAIChatToolbar, CDSAIChatToolbar$1 as default };
//# sourceMappingURL=toolbar.js.map
