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
import type { ChatInstance } from "@carbon/ai-chat";
import { PanelType } from "@carbon/ai-chat";
import "@carbon/ai-chat-components/es/components/workspace-shell/index.js";
import "@carbon/ai-chat-components/es/components/toolbar/index.js";
import "@carbon/web-components/es/components/data-table/table.js";
import "@carbon/web-components/es/components/data-table/table-head.js";
import "@carbon/web-components/es/components/data-table/table-header-row.js";
import "@carbon/web-components/es/components/data-table/table-header-cell.js";
import "@carbon/web-components/es/components/data-table/table-body.js";
import "@carbon/web-components/es/components/data-table/table-row.js";
import "@carbon/web-components/es/components/data-table/table-cell.js";
import "@carbon/web-components/es/components/data-table/table-header-title.js";
import "@carbon/web-components/es/components/data-table/table-header-description.js";
import Close16 from "@carbon/icons/es/close/16.js";

@customElement("outstanding-orders-example")
export class OutstandingOrdersExample extends LitElement {
  static styles = css`
    [slot="workspacePanelElement"] {
      block-size: 100%;
    }
  `;

  @property({ type: String })
  accessor location = "";

  @property({ type: Object })
  accessor instance: ChatInstance | undefined;

  @property({ type: String })
  accessor workspaceId: string | undefined;

  @property({ type: Object })
  accessor additionalData: any;

  @property({ type: Array })
  accessor toolbarActions: any[] = [
    {
      text: "Close",
      fixed: true,
      icon: Close16,
      size: "md",
      onClick: this.handleClose.bind(this),
    },
  ];

  connectedCallback() {
    super.connectedCallback();
    console.log("OutstandingOrdersExample rendered", {
      location: this.location,
      workspaceId: this.workspaceId,
      additionalData: this.additionalData,
    });
  }

  handleClose() {
    const panel = this.instance?.customPanels?.getPanel(PanelType.WORKSPACE);
    panel?.close();
  }

  render() {
    // Get orders from additionalData, fallback to empty array
    const orders = this.additionalData?.orders || [];

    return html`
      <cds-aichat-workspace-shell>
        <cds-aichat-toolbar
          slot="toolbar"
          overflow
          .actions=${this.toolbarActions}
        >
          <div slot="title" data-fixed>Outstanding Orders</div>
        </cds-aichat-toolbar>
        <cds-aichat-workspace-shell-header
          title-text="Outstanding Orders"
          subtitle-text="Total: ${orders.length} orders"
        >
          <div slot="header-description">
            View and manage all outstanding orders. This workspace displays the
            complete order list with details including customer information,
            product details, quantities, status, and amounts.
          </div>
        </cds-aichat-workspace-shell-header>
        <cds-aichat-workspace-shell-body>
          <cds-table>
            <cds-table-header-title slot="title"
              >Order Details</cds-table-header-title
            >
            <cds-table-header-description slot="description">
              Complete list of all outstanding orders.
            </cds-table-header-description>
            <cds-table-head>
              <cds-table-header-row>
                <cds-table-header-cell>Order ID</cds-table-header-cell>
                <cds-table-header-cell>Customer</cds-table-header-cell>
                <cds-table-header-cell>Product</cds-table-header-cell>
                <cds-table-header-cell>Quantity</cds-table-header-cell>
                <cds-table-header-cell>Status</cds-table-header-cell>
                <cds-table-header-cell>Order Date</cds-table-header-cell>
                <cds-table-header-cell>Amount</cds-table-header-cell>
              </cds-table-header-row>
            </cds-table-head>
            <cds-table-body>
              ${orders.map(
                (order: any) => html`
                  <cds-table-row>
                    <cds-table-cell>${order.id}</cds-table-cell>
                    <cds-table-cell>${order.customer}</cds-table-cell>
                    <cds-table-cell>${order.product}</cds-table-cell>
                    <cds-table-cell>${order.quantity}</cds-table-cell>
                    <cds-table-cell>${order.status}</cds-table-cell>
                    <cds-table-cell>${order.date}</cds-table-cell>
                    <cds-table-cell>${order.amount}</cds-table-cell>
                  </cds-table-row>
                `,
              )}
            </cds-table-body>
          </cds-table>
        </cds-aichat-workspace-shell-body>
      </cds-aichat-workspace-shell>
    `;
  }
}

// Made with Bob
