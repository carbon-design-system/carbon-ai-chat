/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@carbon/ai-chat-components/es/components/card/index.js";
import "@carbon/ai-chat-components/es/components/toolbar/index.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";

@customElement("outstanding-orders-card")
export class OutstandingOrdersCard extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .outstanding-orders-card-body {
      padding: 1rem;
    }

    .card-summary {
      margin-bottom: 1rem;
      color: #161616;
      font-weight: 500;
    }

    .card-preview {
      background: #f4f4f4;
      padding: 0.75rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .preview-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .preview-row:last-child {
      margin-bottom: 0;
    }

    .preview-label {
      font-weight: 600;
      color: #525252;
    }

    .preview-value {
      color: #161616;
    }

    .card-hint {
      margin: 0;
      font-size: 0.875rem;
      color: #525252;
      font-style: italic;
    }
  `;

  @property({ type: String })
  accessor workspaceId = "";

  @property({ type: Object })
  accessor additionalData: any;

  @property({ type: Function })
  accessor onMaximize: (() => void) | undefined;

  @property({ type: Array })
  accessor toolbarActions: any[] = [
    {
      text: "Maximize",
      icon: Maximize16,
      size: "md",
      onClick: this.handleMaximize.bind(this),
    },
  ];

  private handleMaximize() {
    console.log(
      "Maximize clicked, opening workspace with ID:",
      this.workspaceId,
    );
    if (this.onMaximize) {
      this.onMaximize();
    }
  }

  render() {
    return html`
      <cds-aichat-card>
        <div slot="header">
          <cds-aichat-toolbar overflow .actions=${this.toolbarActions}>
            <div slot="title">Outstanding Orders</div>
          </cds-aichat-toolbar>
        </div>
        <div slot="body" class="outstanding-orders-card-body">
          <p class="card-summary">
            You have 25 outstanding orders across multiple customers and
            products.
          </p>
          <div class="card-preview">
            <div class="preview-row">
              <span class="preview-label">Recent Orders:</span>
              <span class="preview-value">ORD-1025, ORD-1024, ORD-1023</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">Total Value:</span>
              <span class="preview-value">$78,425.00</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">Status:</span>
              <span class="preview-value">
                8 Pending, 7 Processing, 6 Shipped, 4 Delivered
              </span>
            </div>
          </div>
          <p class="card-hint">
            Click the maximize button to view all orders in detail.
          </p>
        </div>
      </cds-aichat-card>
    `;
  }
}

// Made with Bob
