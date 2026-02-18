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
              {orders.map((order) => (
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
