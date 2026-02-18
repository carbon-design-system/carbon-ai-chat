/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useState } from "react";
import { ChatInstance, PanelType } from "@carbon/ai-chat";
import WorkspaceShell, {
  WorkspaceShellHeader,
  WorkspaceShellBody,
} from "@carbon/ai-chat-components/es/react/workspace-shell.js";
import Toolbar from "@carbon/ai-chat-components/es/react/toolbar.js";
import Close16 from "@carbon/icons-react/es/Close.js";
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from "@carbon/react";
import "./OutstandingOrdersExample.css";

interface OutstandingOrdersExampleProps {
  location: string;
  instance: ChatInstance;
  workspaceId?: string;
  additionalData?: any;
}

export function OutstandingOrdersExample({
  location,
  instance,
  workspaceId,
  additionalData,
}: OutstandingOrdersExampleProps) {
  console.log("OutstandingOrdersExample rendered", {
    location,
    workspaceId,
    additionalData,
  });

  // Get orders from additionalData, fallback to empty array
  const orders = additionalData?.orders || [];

  const panel = instance.customPanels?.getPanel(PanelType.WORKSPACE);

  const handleClose = () => {
    panel?.close();
  };

  const [toolbarActions] = useState([
    {
      id: "close",
      text: "Close",
      fixed: true,
      icon: Close16,
      onClick: handleClose,
    },
  ]);

  return (
    <WorkspaceShell>
      <Toolbar slot="toolbar" actions={toolbarActions} overflow>
        <div slot="title" data-fixed>
          Outstanding Orders
        </div>
      </Toolbar>
      <WorkspaceShellHeader
        titleText="Outstanding Orders"
        subTitleText={`Total: ${orders.length} orders`}
      >
        <div slot="header-description">
          View and manage all outstanding orders. This workspace displays the
          complete order list with details including customer information,
          product details, quantities, status, and amounts.
        </div>
      </WorkspaceShellHeader>
      <WorkspaceShellBody>
        <TableContainer
          title="Order Details"
          description="Complete list of all outstanding orders."
        >
          <Table size="md" useZebraStyles>
            <TableHead>
              <TableRow>
                <TableHeader>Order ID</TableHeader>
                <TableHeader>Customer</TableHeader>
                <TableHeader>Product</TableHeader>
                <TableHeader>Quantity</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Order Date</TableHeader>
                <TableHeader>Amount</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell>{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>{order.product}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>{order.status}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell>{order.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </WorkspaceShellBody>
    </WorkspaceShell>
  );
}

// Made with Bob
