/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, PropertyValues, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { repeat } from "lit/directives/repeat.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import "@carbon/web-components/es/components/button/button.js";
import { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";
import {
  BUTTON_KIND,
  BUTTON_SIZE,
} from "@carbon/web-components/es/components/button/button.js";
// @ts-ignore
import styles from "./workspace-shell-footer.scss?lit";
import prefix from "../../../globals/settings.js";

export type Action = {
  label: string;
  id?: string;
  kind?: BUTTON_KIND;
  disabled?: boolean;
  payload?: unknown;
  icon?: CarbonIcon;
};

@customElement(`${prefix}-workspace-shell-footer`)
class CDSAIChatWorkspaceShellFooter extends LitElement {
  static styles = styles;

  @property({ type: String, reflect: true })
  slot = "footer";

  @property({ type: Array })
  actions: Action[] = [];

  @property({ type: String })
  size?: BUTTON_SIZE = BUTTON_SIZE.EXTRA_EXTRA_LARGE;

  @state()
  private isStacked = false;

  private _resizeObserver?: ResizeObserver;

  private handleAction(action: Action) {
    this.dispatchEvent(
      new CustomEvent("cds-aichat-workspace-shell-footer-action", {
        detail: action,
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected updated(_changedProperties: PropertyValues): void {
    const wrapper = this.renderRoot.querySelector(
      `.${prefix}-workspace-shell-footer`,
    ) as HTMLElement;

    if (!wrapper || !this.actions || this.actions.length === 0) {
      return;
    }

    this._resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      const stacked = width < Math.max(this.actions?.length * 180, 528); // Assuming each button is around 200px wide

      // Only update if value changes to avoid re-render
      if (stacked !== this.isStacked) {
        this.isStacked = stacked;
      }
    });

    this._resizeObserver.observe(wrapper);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
  }

  get displayingActions() {
    return this.isStacked ? [...this.actions].reverse() : this.actions;
  }

  get rounded() {
    if (!this.actions) {
      return;
    }
    return !this.isStacked &&
      !this.actions.some((a) =>
        ["ghost", "tertiary", "danger-ghost"].includes(a.kind || ""),
      )
      ? "bottom-right"
      : "bottom";
  }

  render() {
    return this.actions && this.actions.length > 0
      ? html`
          <div
            data-rounded=${ifDefined(this.rounded)}
            ?data-stacked=${this.isStacked}
            class="${classMap({
              [`${prefix}-workspace-shell-footer`]: true,
              [`${prefix}-workspace-shell-footer--stacked`]: this.isStacked,
            })}"
          >
            ${repeat(
              this.displayingActions,
              (action) => action.label,
              (action) => html`
                <cds-button
                  class="${classMap({
                    [`${prefix}-workspace-shell-footer__button`]: true,
                  })}"
                  id=${ifDefined(action.id)}
                  kind=${ifDefined(action.kind)}
                  size=${this.isStacked
                    ? BUTTON_SIZE.EXTRA_LARGE
                    : ifDefined(this.size)}
                  ?disabled=${action.disabled}
                  @click=${() => this.handleAction(action)}
                >
                  ${action.icon
                    ? iconLoader(action.icon, { slot: "icon" })
                    : nothing}
                  ${action.label}
                </cds-button>
              `,
            )}
          </div>
        `
      : nothing;
  }
}

export default CDSAIChatWorkspaceShellFooter;
