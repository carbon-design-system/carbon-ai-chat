/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, MessageResponse, GenericItem } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("custom-footer-example")
export class CustomFooterExample extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .custom-footer-actions {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 0;
      margin-top: 0.5rem;
      border-top: 1px solid var(--cds-border-subtle-01, #e0e0e0);
    }

    .custom-footer-button {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1.125rem;
      border: 1px solid var(--cds-button-tertiary, #0f62fe);
      background-color: transparent;
      color: var(--cds-button-tertiary, #0f62fe);
      cursor: pointer;
      border-radius: 0;
      transition: background-color 70ms cubic-bezier(0.2, 0, 0.38, 0.9);
    }

    .custom-footer-button:hover {
      background-color: var(--cds-button-tertiary-hover, #0353e9);
      color: var(--cds-text-on-color, #ffffff);
    }

    .custom-footer-button:active {
      background-color: var(--cds-button-tertiary-active, #002d9c);
      color: var(--cds-text-on-color, #ffffff);
    }

    .custom-footer-button:focus {
      outline: 2px solid var(--cds-focus, #0f62fe);
      outline-offset: -2px;
    }
  `;

  @property({ type: String })
  accessor slotName: string = "";

  @property({ type: Object })
  accessor message!: MessageResponse;

  @property({ type: Object })
  accessor messageItem!: GenericItem;

  @property({ type: Object })
  accessor instance!: ChatInstance;

  @property({ type: Object })
  accessor additionalData: Record<string, unknown> | undefined = undefined;

  connectedCallback() {
    super.connectedCallback();
    console.log(
      "[CustomFooterExample] connectedCallback - element added to DOM",
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    console.log(
      "[CustomFooterExample] disconnectedCallback - element removed from DOM",
    );
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    console.log(
      "[CustomFooterExample] updated - properties changed:",
      Array.from(changedProperties.keys()),
    );
  }

  private handleCopy = () => {
    // Extract text from the message item based on its type
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

  private handleRegenerate = () => {
    // Get the original request from the message history
    const requestId = this.message.request_id;
    if (requestId) {
      // In a real implementation, you would retrieve the original request
      // For demo purposes, we'll just log it
      console.log("Regenerate request for:", requestId);
      // You could also use instance.send() with the original input if available
    }
  };

  private handleShare = () => {
    const url = this.additionalData?.custom_action_url as string;
    if (url) {
      window.open(url, "_blank");
    }
  };

  render() {
    console.log("[CustomFooterExample] Rendering with:", {
      slotName: this.slotName,
      additionalData: this.additionalData,
      allow_copy: this.additionalData?.allow_copy,
      allow_regenerate: this.additionalData?.allow_regenerate,
      custom_action_url: this.additionalData?.custom_action_url,
      hasMessage: !!this.message,
      hasMessageItem: !!this.messageItem,
      hasInstance: !!this.instance,
    });

    return html`
      <div class="custom-footer-actions">
        <p style="color: red; font-weight: bold;">CUSTOM FOOTER TEST</p>
        ${this.additionalData?.allow_copy
          ? html`
              <button
                class="custom-footer-button"
                @click=${this.handleCopy}
                title="Copy message text"
              >
                Copy
              </button>
            `
          : null}
        ${this.additionalData?.allow_regenerate
          ? html`
              <button
                class="custom-footer-button"
                @click=${this.handleRegenerate}
                title="Regenerate response"
              >
                Regenerate
              </button>
            `
          : null}
        ${this.additionalData?.custom_action_url
          ? html`
              <button
                class="custom-footer-button"
                @click=${this.handleShare}
                title="Share message"
              >
                Share
              </button>
            `
          : null}
      </div>
    `;
  }
}

export default CustomFooterExample;
