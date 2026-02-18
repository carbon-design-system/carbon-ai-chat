/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useState } from "react";
import Card from "@carbon/ai-chat-components/es/react/card.js";
import Toolbar from "@carbon/ai-chat-components/es/react/toolbar.js";
import Maximize16 from "@carbon/icons-react/es/Maximize.js";
import "./OutstandingOrdersCard.css";

interface OutstandingOrdersCardProps {
  workspaceId: string;
  onMaximize: () => void;
}

export function OutstandingOrdersCard({
  workspaceId,
  onMaximize,
}: OutstandingOrdersCardProps) {
  const handleMaximize = () => {
    console.log("Maximize clicked, opening workspace with ID:", workspaceId);
    onMaximize();
  };

  const [toolbarActions] = useState([
    {
      text: "Maximize",
      icon: Maximize16,
      size: "sm",
      onClick: handleMaximize,
    },
  ]);

  return (
    <Card>
      <div slot="header">
        <Toolbar overflow actions={toolbarActions}>
          <div slot="title">Outstanding Orders</div>
        </Toolbar>
      </div>
      <div slot="body" className="outstanding-orders-card-body">
        <p className="outstanding-orders-card-summary">
          You have 25 outstanding orders across multiple customers and products.
        </p>
        <div className="outstanding-orders-card-preview">
          <div className="preview-row">
            <span className="preview-label">Recent Orders:</span>
            <span className="preview-value">ORD-1025, ORD-1024, ORD-1023</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Total Value:</span>
            <span className="preview-value">$78,425.00</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Status:</span>
            <span className="preview-value">
              8 Pending, 7 Processing, 6 Shipped, 4 Delivered
            </span>
          </div>
        </div>
        <p className="outstanding-orders-card-hint">
          Click the maximize button to view all orders in detail.
        </p>
      </div>
    </Card>
  );
}

// Made with Bob
