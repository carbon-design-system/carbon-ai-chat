/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { ChatInstance } from "@carbon/ai-chat";
import { PanelType } from "@carbon/ai-chat";
import "@carbon/ai-chat-components/es/components/workspace-shell/index.js";
import "@carbon/ai-chat-components/es/components/code-snippet/index.js";
import "@carbon/ai-chat-components/es/components/toolbar/index.js";
import Close16 from "@carbon/icons/es/close/16.js";

@customElement("sql-editor-example")
export class SqlEditorExample extends LitElement {
  static styles = css`
    .sql-editor-container {
      display: flex;
      flex-direction: column;
      block-size: 100%;
    }

    cds-aichat-code-snippet {
      flex: 1;
      min-block-size: 0;
    }
  `;

  @property({ type: Object })
  accessor instance: ChatInstance | undefined;

  @property({ type: String })
  accessor workspaceId: string | undefined;

  @property({ type: Object })
  accessor additionalData: any;

  @state()
  accessor sqlContent: string = `-- Order Analytics Report
-- Analyzes purchasing patterns and outstanding orders

WITH customer_orders AS (
  SELECT 
    c.customer_id,
    c.customer_name,
    c.email,
    c.region,
    COUNT(DISTINCT o.order_id) as total_orders,
    SUM(o.total_amount) as total_spent,
    AVG(o.total_amount) as avg_order_value,
    MAX(o.order_date) as last_order_date
  FROM customers c
  LEFT JOIN orders o ON c.customer_id = o.customer_id
  WHERE o.order_status IN ('pending', 'processing', 'shipped')
    AND o.order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 90 DAY)
  GROUP BY c.customer_id, c.customer_name, c.email, c.region
),
product_performance AS (
  SELECT 
    p.product_id,
    p.product_name,
    p.category,
    COUNT(DISTINCT oi.order_id) as times_ordered,
    SUM(oi.quantity) as total_quantity_sold,
    SUM(oi.quantity * oi.unit_price) as total_revenue,
    AVG(oi.unit_price) as avg_selling_price
  FROM products p
  INNER JOIN order_items oi ON p.product_id = oi.product_id
  INNER JOIN orders o ON oi.order_id = o.order_id
  WHERE o.order_status != 'cancelled'
    AND o.order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 90 DAY)
  GROUP BY p.product_id, p.product_name, p.category
),
inventory_status AS (
  SELECT 
    i.product_id,
    i.warehouse_location,
    i.quantity_on_hand,
    i.reorder_level,
    i.reorder_quantity,
    CASE 
      WHEN i.quantity_on_hand <= i.reorder_level THEN 'Low Stock'
      WHEN i.quantity_on_hand <= (i.reorder_level * 1.5) THEN 'Medium Stock'
      ELSE 'Adequate Stock'
    END as stock_status
  FROM inventory i
)

SELECT 
  co.customer_name,
  co.email,
  co.region,
  co.total_orders,
  co.total_spent,
  co.avg_order_value,
  co.last_order_date,
  pp.product_name,
  pp.category,
  pp.times_ordered,
  pp.total_quantity_sold,
  pp.total_revenue,
  ist.warehouse_location,
  ist.quantity_on_hand,
  ist.stock_status
FROM customer_orders co
CROSS JOIN product_performance pp
LEFT JOIN inventory_status ist ON pp.product_id = ist.product_id
WHERE co.total_orders > 0
  AND pp.total_revenue > 1000
ORDER BY co.total_spent DESC, pp.total_revenue DESC
LIMIT 100;`;

  @state()
  accessor hasChanges: boolean = false;

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

  @property({ type: Array })
  accessor footerActions: any[] = [
    {
      id: "cancel",
      label: "Cancel",
      kind: "secondary",
    },
    {
      id: "save",
      label: "Save Query",
      kind: "primary",
    },
  ];

  connectedCallback() {
    super.connectedCallback();
    console.log("SqlEditorExample rendered", {
      workspaceId: this.workspaceId,
      additionalData: this.additionalData,
    });
  }

  handleClose() {
    const panel = this.instance?.customPanels?.getPanel(PanelType.WORKSPACE);
    panel?.close();
  }

  handleContentChange(event: CustomEvent) {
    this.sqlContent = event.detail.content;
    this.hasChanges = true;
  }

  handleWorkspaceFooterClick(event: any) {
    const { id } = event.detail;
    switch (id) {
      case "save":
        console.log("Saving SQL query:", this.sqlContent);
        alert("SQL query saved successfully!");
        this.hasChanges = false;
        break;
      case "cancel":
        this.handleClose();
        break;
      default:
        return;
    }
  }

  render() {
    return html`
      <cds-aichat-workspace-shell>
        <cds-aichat-toolbar
          slot="toolbar"
          overflow
          .actions=${this.toolbarActions}
        >
          <div slot="title" data-fixed>SQL Query Editor</div>
        </cds-aichat-toolbar>
        <cds-aichat-workspace-shell-header
          title-text="Order Analytics Query"
          subtitle-text="Edit and execute SQL queries"
        >
          <div slot="header-description">
            This workspace demonstrates the code-snippet component in
            full-height mode. The editor fills the available space and provides
            a scrollbar when content exceeds the container height. Perfect for
            editing mode scenarios.
          </div>
        </cds-aichat-workspace-shell-header>
        <cds-aichat-workspace-shell-body>
          <div class="sql-editor-container">
            <cds-aichat-code-snippet
              editable
              language="sql"
              highlight
              max-collapsed-number-of-rows="0"
              max-expanded-number-of-rows="0"
              @content-change=${this.handleContentChange}
            >
              ${this.sqlContent}
            </cds-aichat-code-snippet>
          </div>
        </cds-aichat-workspace-shell-body>

        <cds-aichat-workspace-shell-footer
          .actions=${this.footerActions}
          @cds-aichat-workspace-shell-footer-clicked=${this
            .handleWorkspaceFooterClick}
        >
        </cds-aichat-workspace-shell-footer>
      </cds-aichat-workspace-shell>
    `;
  }
}

// Made with Bob
