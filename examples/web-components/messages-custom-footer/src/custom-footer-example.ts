/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Custom footer UI for the messages-custom-footer example.
 *
 * Demonstrates: a footer element rendered beneath an assistant message. It reads
 * `additionalData` (attached by the backend to the message's `custom_footer_slot`,
 * here an `allow_copy` flag) and renders a button that copies the message text.
 *
 * Created by: the `renderCustomMessageFooter` callback in `./main.ts`.
 */

import { GenericItem } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@carbon/web-components/es/components/icon-button/index.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Copy16 from "@carbon/icons/es/copy/16.js";

@customElement("custom-footer-example")
class CustomFooterExample extends LitElement {
  static styles = css`
    .custom-footer-actions {
      display: flex;
      gap: 0.25rem;
    }
  `;

  // The library sets these properties on the element it creates from the
  // render callback — `messageItem` is the assistant item, `additionalData` is
  // whatever the backend attached to the footer slot.
  @property({ type: Object })
  accessor messageItem!: GenericItem;

  @property({ type: Object })
  accessor additionalData: Record<string, unknown> | undefined = undefined;

  private handleCopy = () => {
    if (
      "text" in this.messageItem &&
      typeof this.messageItem.text === "string"
    ) {
      navigator.clipboard.writeText(this.messageItem.text);
    }
  };

  render() {
    // The copy button is gated on a flag from `additional_data`, showing how a
    // message controls its own footer.
    if (!this.additionalData?.allow_copy) {
      return null;
    }
    return html`
      <div class="custom-footer-actions">
        <cds-icon-button
          align="top-left"
          kind="ghost"
          size="sm"
          @click=${this.handleCopy}
        >
          <span slot="icon">${iconLoader(Copy16)}</span>
          <span slot="tooltip-content">Copy</span>
        </cds-icon-button>
      </div>
    `;
  }
}

export default CustomFooterExample;
