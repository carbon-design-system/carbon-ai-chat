/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { repeat } from "lit/directives/repeat.js";
import "@carbon/web-components/es/components/button/index.js";
import "@carbon/web-components/es/components/overflow-menu/index.js";
import { OVERFLOW_MENU_SIZE } from "@carbon/web-components/es/components/overflow-menu/defs.js";
import { createOverflowHandler } from "@carbon/utilities";
import OverflowMenuVertical16 from "@carbon/icons/es/overflow-menu--vertical/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import prefix from "../../../globals/settings.js";
import styles from "./toolbar.scss?lit";
import { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";
import { carbonElement } from "../../../globals/decorators/index.js";

export interface Action {
  text: string;
  icon: CarbonIcon;
  size?: string;
  fixed?: boolean;
  onClick: () => void;
}

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
@carbonElement(`${prefix}-toolbar`)
class CDSAIChatToolbar extends LitElement {
  /** Hidden actions rendered in the overflow menu.
   *  @internal
   */
  @state() private hiddenItems: Action[] = [];

  /** The list of actions. */
  @property({ type: Array, attribute: false, reflect: false })
  actions: Action[] = [];

  /** Should actions be overflowing. */
  @property({ type: Boolean, attribute: "overflow", reflect: true })
  overflow = false;

  /** Container holding all action buttons and the overflow menu.
   *  @internal
   */
  @query(`.${prefix}-toolbar`) private container!: HTMLElement;

  @state() private measuring = true;

  private overflowHandler?: { disconnect: () => void };

  connectedCallback(): void {
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

  updated(changedProps: Map<string, unknown>) {
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

  private setupOverflowHandler() {
    if (!this.container || !this.overflow) {
      return;
    }

    this.overflowHandler?.disconnect();

    this.overflowHandler = createOverflowHandler({
      container: this.container,
      dimension: "width",
      onChange: (visibleItems: HTMLElement[]) => {
        this.hiddenItems = this.actions.filter(
          (_, i) => i >= visibleItems.length && !_.fixed,
        );
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

    const renderIconButton = (action: Action) => {
      return html`
        <cds-icon-button
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
        </cds-icon-button>
      `;
    };

    return html`
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
          ? html`
              <cds-overflow-menu
                size=${(this.actions?.[0]?.size as OVERFLOW_MENU_SIZE) || "md"}
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
                <cds-overflow-menu-body flipped>
                  ${repeat(
                    this.hiddenItems,
                    (item) => item.text,
                    (item) => html`
                      <cds-overflow-menu-item @click=${item.onClick}>
                        ${item.text}
                      </cds-overflow-menu-item>
                    `,
                  )}
                </cds-overflow-menu-body>
              </cds-overflow-menu>
            `
          : nothing}
        ${repeat(fixedActions, (_, i) => i, renderIconButton)}
      </div>
    `;
  }

  static styles = styles;
}

export { CDSAIChatToolbar };
export default CDSAIChatToolbar;
