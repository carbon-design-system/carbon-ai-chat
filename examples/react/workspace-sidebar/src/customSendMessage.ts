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
              data: "Outstanding orders data",
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
