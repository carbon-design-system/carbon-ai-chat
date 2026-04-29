/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the workspace-sidebar example.
 *
 * Demonstrates: a `messaging.customSendMessage` hook that branches on free-text
 * input and pushes deterministic responses (`OPTION`, `PREVIEW_CARD`, and a
 * `USER_DEFINED` outstanding-orders card) back through `instance.messaging.addMessage`,
 * each carrying a `workspace_id` plus `additional_data.type` payload that the
 * workspace panel later renders.
 *
 * APIs exercised:
 *   - `messaging.customSendMessage`
 *   - `instance.messaging.addMessage`
 *   - `MessageResponseTypes.OPTION`
 *   - `MessageResponseTypes.TEXT`
 *   - `MessageResponseTypes.PREVIEW_CARD`
 *   - `MessageResponseTypes.USER_DEFINED`
 *   - `OptionItemPreference.BUTTON`
 *
 * Start reading at: `customSendMessage`.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
  OptionItemPreference,
} from "@carbon/ai-chat";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

/**
 * Sends the inventory type selection options to the user.
 */
function sendInventoryOptions(instance: ChatInstance) {
  // addMessage in response to free-text input: surface the canonical option list so the rest of the demo is reachable from any prompt.
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
  // addMessage in response to the "Excess Inventory" option: emits a PREVIEW_CARD whose maximize gesture will route to the inventory_report workspace.
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
          workspace_id: uuid(),
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
  // addMessage in response to the "Current Inventory" option: emits a PREVIEW_CARD whose maximize gesture will route to the inventory_status workspace.
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
          workspace_id: uuid(),
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
  // addMessage in response to the "Outstanding Orders" option: emits a USER_DEFINED card so the host can render its own toolbar and maximize affordance.
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
            workspace_id: uuid(),
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

// Replace with a real production implementation.
async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  const userInput = request.input.text?.trim();

  // Exact-match dispatch on the option label text — the option values above feed back the literal label so this branch is reachable.
  if (userInput === "Excess Inventory") {
    sendExcessInventoryResponse(instance);
  } else if (userInput === "Current Inventory") {
    sendCurrentInventoryResponse(instance);
  } else if (userInput === "Outstanding Orders") {
    sendOutstandingOrdersResponse(instance);
  } else {
    // Any other input falls back to the option picker so the user can always recover.
    sendInventoryOptions(instance);
  }
}

export { customSendMessage };
