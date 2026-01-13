/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import { PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("demo-chat-feedback-switcher")
export class DemoChatFeedbackSwitcher extends LitElement {
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

    console.log("newConfig", newConfig);

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: newConfig,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    const checked = customEvent.detail.checked;

    console.log("feedback", checked);

    this._updateConfig({ persistFeedback: checked });
  };

  render() {
    const persistFeedback = this.config.persistFeedback ?? false;

    return html` <div class="section">
      <cds-checkbox
        ?checked=${persistFeedback}
        @cds-checkbox-changed=${this._onChanged}
      >
        Persist feedback
      </cds-checkbox>
    </div>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-chat-feedback-switcher": DemoChatFeedbackSwitcher;
  }
}
