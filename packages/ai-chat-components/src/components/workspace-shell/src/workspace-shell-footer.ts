/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "@carbon/web-components/es/components/button/button.js";
import { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import { BUTTON_KIND } from "@carbon/web-components/es/components/button/button.js";

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

/**
 * Workspace Shell Footer.
 * @element cds-aichat-workspace-shell-footer
 * @fires cds-aichat-workspace-shell-footer-clicked - The custom event fired when footer buttons are clicked.
 */
@customElement("cds-aichat-workspace-shell-footer")
class CDSAIChatWorkspaceShellFooter extends LitElement {
  static styles = styles;

  private _ro!: ResizeObserver;

  @state()
  private _isStacked = false;

  /**
   * Sets default slot value to footer
   */
  @property({ type: String, reflect: true })
  slot = "footer";

  @property({ type: Array, reflect: false })
  actions: Action[] = [];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute("data-rounded", "bottom");

    // Observe parent size changes
    this._ro = new ResizeObserver(() => this._updateStacked());
    if (this.parentElement) {
      this._ro.observe(this.parentElement);
    }
  }

  updated(changedProps: Map<string, any>) {
    if (changedProps.has("actions")) {
      if (this.actions.length === 3) {
        this.classList.add(`${prefix}-workspace-shell-footer__three-buttons`);
      } else {
        this.classList.remove(
          `${prefix}-workspace-shell-footer__three-buttons`,
        );
      }
    }
    // Sync to host data attribute
    if (this._isStacked) {
      this.setAttribute("data-stacked", "");
    } else {
      this.removeAttribute("data-stacked");
    }
  }

  render() {
    const sorted = this._sortActions(this.actions);
    return html`
      ${sorted.map((action) => {
        return html`
          <cds-button
            kind=${action.kind}
            ?disabled=${action.disabled}
            size="2xl"
            @click=${() => this.handleAction(action)}
          >
            ${action.label}
            ${action.icon && iconLoader(action.icon, { slot: "icon" })}
          </cds-button>
        `;
      })}
    `;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
  }

  private handleAction(action: Action) {
    const init = {
      bubbles: true,
      composed: true,
      detail: action,
    };
    this.dispatchEvent(
      new CustomEvent(
        (this.constructor as typeof CDSAIChatWorkspaceShellFooter)
          .eventButtonClick,
        init,
      ),
    );
  }

  private _updateStacked() {
    const shouldStack = window.innerWidth < 671;

    if (shouldStack !== this._isStacked) {
      this._isStacked = shouldStack;

      // Force re-render so actions get sorted again
      this.requestUpdate();
    }
  }

  private _sortActions(actions: Action[]) {
    const rank = (action: Action) => {
      const kind = action.kind ?? "primary";
      return (
        {
          ghost: 1,
          "danger--ghost": 2,
          tertiary: 3,
          danger: 5,
          primary: 6,
        }[kind] ?? 4
      );
    };

    return [...actions].sort((a, b) => {
      const diff = rank(a) - rank(b);
      return this._isStacked ? -diff : diff;
    });
  }

  /**
   * The name of the custom event fired when footer buttons are clicked.
   */

  static get eventButtonClick() {
    return `${prefix}-workspace-shell-footer-clicked`;
  }
}

export { CDSAIChatWorkspaceShellFooter };
export default CDSAIChatWorkspaceShellFooter;
