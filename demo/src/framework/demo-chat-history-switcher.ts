/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import { PublicConfig, ChatInstance, PanelType } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@carbon/web-components/es/components/button/index.js";

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

    cds-button {
      margin-top: 0.5rem;
    }
  `;

  @property({ type: Object })
  accessor config!: PublicConfig;

  @property({ type: Object })
  accessor instance: ChatInstance | undefined = undefined;

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

  private _onStartClosedChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    const checked = customEvent.detail.checked;

    this._updateConfig({
      history: {
        ...this.config.history,
        startClosed: checked,
      },
    });
  };

  private _onToggleHistoryClick = async () => {
    if (this.instance?.customPanels) {
      try {
        const historyPanel = this.instance.customPanels.getPanel(
          PanelType.HISTORY,
        );
        const isOpen = this.instance.getState().customPanels.history.isOpen;

        if (isOpen) {
          await historyPanel.close();
        } else {
          await historyPanel.open();
        }
      } catch (error) {
        console.error("Failed to toggle history panel:", error);
      }
    }
  };

  render() {
    const showHistory = this.config.history?.isOn ?? false;
    const showMobileMenu = this.config.history?.showMobileMenu ?? true;
    const startClosed = this.config.history?.startClosed ?? false;

    return html` <div class="section">
      <cds-checkbox
        ?checked=${showHistory}
        @cds-checkbox-changed=${this._onHistoryChanged}
      >
        Enable chat history
      </cds-checkbox>
      <cds-checkbox
        ?checked=${showMobileMenu}
        ?disabled=${!showHistory}
        @cds-checkbox-changed=${this._onMobileMenuChanged}
      >
        Show mobile menu
      </cds-checkbox>
      <cds-checkbox
        ?checked=${startClosed}
        ?disabled=${!showHistory}
        @cds-checkbox-changed=${this._onStartClosedChanged}
      >
        Start closed & preserve state across desktop/mobile
      </cds-checkbox>
      <cds-button
        kind="secondary"
        ?disabled=${!this.instance}
        @click=${this._onToggleHistoryClick}
      >
        Toggle history (external action)
      </cds-button>
    </div>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-chat-history-switcher": DemoChatHistorySwitcher;
  }
}
