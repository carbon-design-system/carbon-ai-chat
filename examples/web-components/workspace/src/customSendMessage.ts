/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
  OptionItemPreference,
} from "@carbon/ai-chat";

/**
 * Sends the inventory type selection options to the user.
 */
function sendInventoryOptions(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.OPTION,
          title: "Select inventory type",
          description: "Choose which inventory view you would like to see.",
          preference: OptionItemPreference.BUTTON,
          options: [
            {
              label: "Excess Inventory",
              value: { input: { text: "Excess Inventory" } },
            },
            {
              label: "Current Inventory",
              value: { input: { text: "Current Inventory" } },
            },
            {
              label: "Outstanding Orders",
              value: { input: { text: "Outstanding Orders" } },
            },
          ],
        },
      ],
    },
  });
}

/**
 * Sends the excess inventory response with a preview card that opens the workspace panel.
 */
function sendExcessInventoryResponse(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "Here is a plan for optimizing excess inventory.",
        },
        {
          title: "Optimizing excess inventory",
          subtitle: `Created on: ${new Date().toLocaleDateString()}`,
          response_type: MessageResponseTypes.PREVIEW_CARD,
          workspace_id: crypto.randomUUID(),
          additional_data: {
            type: "inventory_report",
            data: "some additional data for the workspace",
          },
        },
      ],
    },
  });
}

/**
 * Sends the current inventory response with a simple text message.
 */
function sendCurrentInventoryResponse(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "Here is the current inventory status.",
        },
        {
          title: "Current inventory status",
          subtitle: `Created on: ${new Date().toLocaleDateString()}`,
          response_type: MessageResponseTypes.PREVIEW_CARD,
          workspace_id: crypto.randomUUID(),
          additional_data: {
            type: "inventory_status",
            data: "some additional data for the workspace",
          },
        },
      ],
    },
  });
}

/**
 * Sends the outstanding orders response with a user-defined card that has a toolbar and maximize action.
 */
function sendOutstandingOrdersResponse(instance: ChatInstance) {
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

  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "Here are your outstanding orders.",
        },
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: {
            user_defined_type: "outstanding_orders_card",
            workspace_id: crypto.randomUUID(),
            additional_data: {
              type: "outstanding_orders",
              orders: orders,
            },
          },
        },
      ],
    },
  });
}

async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  const userInput = request.input.text?.trim();

  // Handle option selections
  if (userInput === "Excess Inventory") {
    sendExcessInventoryResponse(instance);
  } else if (userInput === "Current Inventory") {
    sendCurrentInventoryResponse(instance);
  } else if (userInput === "Outstanding Orders") {
    sendOutstandingOrdersResponse(instance);
  } else {
    // Show options for any other input
    sendInventoryOptions(instance);
  }
}

export { customSendMessage };
