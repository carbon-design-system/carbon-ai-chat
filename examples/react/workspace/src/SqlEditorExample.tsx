/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./WorkspaceWriteableElementExample.css";
import React, { useState } from "react";
import { ChatInstance, PanelType } from "@carbon/ai-chat";
import WorkspaceShell, {
  WorkspaceShellHeader,
  WorkspaceShellBody,
  WorkspaceShellFooter,
} from "@carbon/ai-chat-components/es/react/workspace-shell.js";
import Toolbar from "@carbon/ai-chat-components/es/react/toolbar.js";
import CodeSnippet from "@carbon/ai-chat-components/es/react/code-snippet.js";
import Close16 from "@carbon/icons-react/es/Close.js";

interface SqlEditorExampleProps {
  instance?: ChatInstance;
  workspaceId?: string;
  additionalData?: any;
}

const SQL_CONTENT = `-- Order Analytics Report
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

export function SqlEditorExample({
  instance,
  workspaceId,
  additionalData,
}: SqlEditorExampleProps) {
  const [sqlContent, setSqlContent] = useState(SQL_CONTENT);
  const [_hasChanges, setHasChanges] = useState(false);

  const handleClose = () => {
    const panel = instance?.customPanels?.getPanel(PanelType.WORKSPACE);
    panel?.close();
  };

  const handleContentChange = (event: any) => {
    setSqlContent(event.detail.content);
    setHasChanges(true);
  };

  const handleWorkspaceFooterClick = (event: any) => {
    const { id } = event.detail;
    switch (id) {
      case "save":
        console.log("Saving SQL query:", sqlContent);
        alert("SQL query saved successfully!");
        setHasChanges(false);
        break;
      case "cancel":
        handleClose();
        break;
      default:
        return;
    }
  };

  const toolbarActions = [
    {
      text: "Close",
      fixed: true,
      icon: Close16,
      size: "md" as const,
      onClick: handleClose,
    },
  ];

  const footerActions = [
    {
      id: "cancel",
      label: "Cancel",
      kind: "secondary" as const,
    },
    {
      id: "save",
      label: "Save Query",
      kind: "primary" as const,
    },
  ];

  React.useEffect(() => {
    console.log("SqlEditorExample rendered", {
      workspaceId,
      additionalData,
    });
  }, [workspaceId, additionalData]);

  return (
    <WorkspaceShell>
      <Toolbar slot="toolbar" overflow actions={toolbarActions}>
        <div slot="title" data-fixed>
          SQL Query Editor
        </div>
      </Toolbar>
      <WorkspaceShellHeader
        titleText="Order Analytics Query"
        subtitleText="Edit and execute SQL queries"
      >
        <div slot="header-description">
          This workspace demonstrates the code-snippet component in full-height
          mode. The editor fills the available space and provides a scrollbar
          when content exceeds the container height. Perfect for editing mode
          scenarios.
        </div>
      </WorkspaceShellHeader>
      <WorkspaceShellBody>
        <div className="sql-editor-container">
          <CodeSnippet
            editable
            language="sql"
            highlight
            maxCollapsedNumberOfRows={0}
            maxExpandedNumberOfRows={0}
            onContentChange={handleContentChange}
            className="sql-editor-snippet"
          >
            {sqlContent}
          </CodeSnippet>
        </div>
      </WorkspaceShellBody>
      <style>{`
        .sql-editor-container {
          display: flex;
          flex-direction: column;
          block-size: 100%;
        }
        .sql-editor-snippet {
          flex: 1;
          min-block-size: 0;
        }
      `}</style>
      <WorkspaceShellFooter
        actions={footerActions}
        onCdsAichatWorkspaceShellFooterClicked={handleWorkspaceFooterClick}
      />
    </WorkspaceShell>
  );
}

// Made with Bob
