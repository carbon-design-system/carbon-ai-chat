/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import { PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("demo-chat-history-switcher")
export class DemoChatHistorySwitcher extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .section {
      margin-bottom: 1rem;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    cds-checkbox {
      margin-bottom: 0.5rem;
    }
  `;

  @property({ type: Object })
  accessor config!: PublicConfig;

  private _updateConfig(updates: Partial<PublicConfig>) {
    const newConfig = {
      ...this.config,
      ...updates,
    };

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: newConfig,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onHistoryChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    const checked = customEvent.detail.checked;

    this._updateConfig({
      history: {
        ...this.config.history,
        isOn: checked,
      },
    });
  };

  private _onMobileMenuChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    const checked = customEvent.detail.checked;

    this._updateConfig({
      history: {
        ...this.config.history,
        showMobileMenu: checked,
      },
    });
  };

  render() {
    const showHistory = this.config.history?.isOn ?? false;
    const showMobileMenu = this.config.history?.showMobileMenu ?? true;

    return html` <div class="section">
      <cds-checkbox
        ?checked=${showHistory}
        @cds-checkbox-changed=${this._onHistoryChanged}
      >
        Show chat history
      </cds-checkbox>
      <cds-checkbox
        ?checked=${showMobileMenu}
        ?disabled=${!showHistory}
        @cds-checkbox-changed=${this._onMobileMenuChanged}
      >
        Show mobile menu
      </cds-checkbox>
    </div>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-chat-history-switcher": DemoChatHistorySwitcher;
  }
}
