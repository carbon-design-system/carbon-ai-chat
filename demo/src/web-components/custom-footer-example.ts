/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { GenericItem } from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@carbon/web-components/es/components/icon-button/index.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Copy16 from "@carbon/icons/es/copy/16.js";
import Export16 from "@carbon/icons/es/export/16.js";

@customElement("custom-footer-example")
class CustomFooterExample extends LitElement {
  @property({ type: Object })
  accessor messageItem!: GenericItem;

  @property({ type: Object })
  accessor additionalData: Record<string, unknown> | undefined = undefined;

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  private handleCopy = () => {
    let textToCopy = "";
    if (
      "text" in this.messageItem &&
      typeof this.messageItem.text === "string"
    ) {
      textToCopy = this.messageItem.text;
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
    }
  };

  private handleShare = () => {
    const url = this.additionalData?.custom_action_url as string;
    if (url) {
      window.open(url, "_blank");
    }
  };

  render() {
    return html`
      <div class="custom-footer-actions">
        ${this.additionalData?.allow_copy
          ? html`
              <cds-icon-button
                class="custom-footer-button"
                align="top-left"
                kind="ghost"
                role="button"
                size="sm"
                @click=${this.handleCopy}
              >
                <span slot="icon">${iconLoader(Copy16)}</span>
                <span slot="tooltip-content">Copy</span>
              </cds-icon-button>
            `
          : null}
        ${this.additionalData?.custom_action_url
          ? html`
              <cds-icon-button
                class="custom-footer-button"
                align="top-left"
                kind="ghost"
                role="button"
                size="sm"
                @click=${this.handleShare}
              >
                <span slot="icon">${iconLoader(Export16)}</span>
                <span slot="tooltip-content">Share</span>
              </cds-icon-button>
            `
          : null}
      </div>
    `;
  }
}

export default CustomFooterExample;
