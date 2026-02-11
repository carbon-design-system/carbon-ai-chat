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

// Generate 25 rows of dummy order data
const orders = [
  {
    id: "ORD-1001",
    customer: "Acme Corp",
    product: "Widget A",
    quantity: 150,
    status: "Pending",
    date: "2026-02-01",
    amount: "$1,500.00",
  },
  {
    id: "ORD-1002",
    customer: "TechStart Inc",
    product: "Gadget B",
    quantity: 75,
    status: "Shipped",
    date: "2026-02-02",
    amount: "$2,250.00",
  },
  {
    id: "ORD-1003",
    customer: "Global Solutions",
    product: "Component C",
    quantity: 200,
    status: "Processing",
    date: "2026-02-03",
    amount: "$4,000.00",
  },
  {
    id: "ORD-1004",
    customer: "Innovate LLC",
    product: "Device D",
    quantity: 50,
    status: "Pending",
    date: "2026-02-04",
    amount: "$1,750.00",
  },
  {
    id: "ORD-1005",
    customer: "MegaMart",
    product: "Product E",
    quantity: 300,
    status: "Shipped",
    date: "2026-02-05",
    amount: "$6,000.00",
  },
  {
    id: "ORD-1006",
    customer: "SmartTech Co",
    product: "Widget A",
    quantity: 125,
    status: "Delivered",
    date: "2026-02-06",
    amount: "$1,250.00",
  },
  {
    id: "ORD-1007",
    customer: "Enterprise Systems",
    product: "Gadget B",
    quantity: 90,
    status: "Processing",
    date: "2026-02-07",
    amount: "$2,700.00",
  },
  {
    id: "ORD-1008",
    customer: "Digital Dynamics",
    product: "Component C",
    quantity: 175,
    status: "Pending",
    date: "2026-02-08",
    amount: "$3,500.00",
  },
  {
    id: "ORD-1009",
    customer: "Future Industries",
    product: "Device D",
    quantity: 60,
    status: "Shipped",
    date: "2026-02-09",
    amount: "$2,100.00",
  },
  {
    id: "ORD-1010",
    customer: "Quantum Corp",
    product: "Product E",
    quantity: 250,
    status: "Processing",
    date: "2026-02-10",
    amount: "$5,000.00",
  },
  {
    id: "ORD-1011",
    customer: "Nexus Trading",
    product: "Widget A",
    quantity: 100,
    status: "Delivered",
    date: "2026-01-28",
    amount: "$1,000.00",
  },
  {
    id: "ORD-1012",
    customer: "Apex Solutions",
    product: "Gadget B",
    quantity: 80,
    status: "Pending",
    date: "2026-01-29",
    amount: "$2,400.00",
  },
  {
    id: "ORD-1013",
    customer: "Vertex Inc",
    product: "Component C",
    quantity: 220,
    status: "Shipped",
    date: "2026-01-30",
    amount: "$4,400.00",
  },
  {
    id: "ORD-1014",
    customer: "Pinnacle Group",
    product: "Device D",
    quantity: 45,
    status: "Processing",
    date: "2026-01-31",
    amount: "$1,575.00",
  },
  {
    id: "ORD-1015",
    customer: "Summit Enterprises",
    product: "Product E",
    quantity: 280,
    status: "Pending",
    date: "2026-02-01",
    amount: "$5,600.00",
  },
  {
    id: "ORD-1016",
    customer: "Horizon Tech",
    product: "Widget A",
    quantity: 135,
    status: "Shipped",
    date: "2026-02-02",
    amount: "$1,350.00",
  },
  {
    id: "ORD-1017",
    customer: "Zenith Corp",
    product: "Gadget B",
    quantity: 95,
    status: "Delivered",
    date: "2026-02-03",
    amount: "$2,850.00",
  },
  {
    id: "ORD-1018",
    customer: "Catalyst Systems",
    product: "Component C",
    quantity: 190,
    status: "Processing",
    date: "2026-02-04",
    amount: "$3,800.00",
  },
  {
    id: "ORD-1019",
    customer: "Momentum LLC",
    product: "Device D",
    quantity: 70,
    status: "Pending",
    date: "2026-02-05",
    amount: "$2,450.00",
  },
  {
    id: "ORD-1020",
    customer: "Velocity Inc",
    product: "Product E",
    quantity: 310,
    status: "Shipped",
    date: "2026-02-06",
    amount: "$6,200.00",
  },
  {
    id: "ORD-1021",
    customer: "Synergy Partners",
    product: "Widget A",
    quantity: 110,
    status: "Processing",
    date: "2026-02-07",
    amount: "$1,100.00",
  },
  {
    id: "ORD-1022",
    customer: "Fusion Enterprises",
    product: "Gadget B",
    quantity: 85,
    status: "Pending",
    date: "2026-02-08",
    amount: "$2,550.00",
  },
  {
    id: "ORD-1023",
    customer: "Nexus Global",
    product: "Component C",
    quantity: 205,
    status: "Delivered",
    date: "2026-02-09",
    amount: "$4,100.00",
  },
  {
    id: "ORD-1024",
    customer: "Vanguard Corp",
    product: "Device D",
    quantity: 55,
    status: "Shipped",
    date: "2026-02-10",
    amount: "$1,925.00",
  },
  {
    id: "ORD-1025",
    customer: "Titan Industries",
    product: "Product E",
    quantity: 290,
    status: "Processing",
    date: "2026-02-11",
    amount: "$5,800.00",
  },
];

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
                (order) => html`
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
