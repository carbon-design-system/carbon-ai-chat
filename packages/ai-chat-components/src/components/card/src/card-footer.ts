/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html, nothing, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { repeat } from "lit/directives/repeat.js";
import "@carbon/web-components/es/components/button/button.js";
import "@carbon/web-components/es/components/icon-button/icon-button.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import {
  BUTTON_KIND,
  BUTTON_SIZE,
} from "@carbon/web-components/es/components/button/button.js";
import prefix from "../../../globals/settings.js";
// @ts-ignore
import styles from "./card-footer.scss?lit";
import { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";

export type Action = {
  label: string;
  id?: string;
  kind?: BUTTON_KIND;
  disabled?: boolean;
  payload?: unknown;
  icon?: CarbonIcon;
  onClick?: () => void;
  tooltipText?: string;
  isViewing?: boolean;
};

/**
 * Footer action bar that renders Carbon buttons and emits an `action` event.
 * Consumers listen for events instead of passing callbacks.
 */
@customElement(`${prefix}-card-footer`)
class CardFooter extends LitElement {
  static styles = styles;

  /**
   * Sets default slot value to footer
   */
  @property({ type: String, reflect: true })
  slot = "footer";

  /** Card actions to render */
  @property({ type: Array })
  actions: Action[] = [];

  @property({ type: String })
  size?: BUTTON_SIZE = BUTTON_SIZE.LARGE;

  @property({ type: Boolean, attribute: "is-icon-button", reflect: true })
  isIconButton = false;

  private handleAction(action: Action) {
    if (action.onClick) {
      action.onClick();
    }
    this.dispatchEvent(
      new CustomEvent("cds-aichat-card-footer-action", {
        detail: action,
        bubbles: true,
        composed: true,
      }),
    );
  }

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has("actions")) {
      if (!this.actions || this.actions.length === 0) {
        return;
      }
      const allActionsHaveNoLabels = this.actions.every(
        (action) => !action.label,
      );
      this.isIconButton = allActionsHaveNoLabels;
    }
  }

  render() {
    if (!this.actions || this.actions.length === 0) {
      return nothing;
    }
    return !this.isIconButton
      ? html`
          <div
            class=${classMap({
              [`${prefix}-card-footer__actions`]: true,
              [`${prefix}-card-footer__actions--stacked`]:
                this.actions.length > 2,
            })}
            data-rounded="bottom"
            ?data-stacked=${this.actions.length > 2}
          >
            ${repeat(
              this.actions,
              (action) => action.id,
              (action) =>
                html`<cds-button
                  kind=${action.kind ?? "secondary"}
                  size=${ifDefined(this.size)}
                  ?disabled=${action.disabled || action.isViewing}
                  class=${classMap({
                    [`${prefix}-card-footer__action-viewing`]:
                      action.isViewing ?? false,
                  })}
                  @click=${() => this.handleAction(action)}
                >
                  ${action.label}
                  ${action.icon
                    ? iconLoader(
                        action.icon,
                        !action.isViewing
                          ? {
                              slot: "icon",
                              class: `${prefix}-card-footer__action-icon`,
                            }
                          : undefined,
                      )
                    : nothing}
                </cds-button> `,
            )}
          </div>
        `
      : html`
          <div
            class=${classMap({
              [`${prefix}-card-footer__icon-actions`]: true,
            })}
            data-rounded="bottom-right"
            ?data-stacked=${this.actions.length > 2}
          >
            ${repeat(
              this.actions,
              (action) => action.id,
              (action) =>
                html`<cds-icon-button
                  kind=${action.kind ?? "ghost"}
                  size=${ifDefined(this.size)}
                  ?disabled=${action.disabled}
                  @click=${() => this.handleAction(action)}
                >
                  ${action.icon
                    ? iconLoader(action.icon, { slot: "icon" })
                    : nothing}
                  <span slot="tooltip-content">${action.tooltipText}</span>
                </cds-icon-button> `,
            )}
          </div>
        `;
  }
}

export default CardFooter;
