/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * User-defined response renderer for the user-defined-responses example.
 *
 * Demonstrates: dispatching on `messageItem.user_defined.user_defined_type`
 * to pick a React component, and threading the conversation's
 * `activeResponseId` through so each card knows if it is the latest message.
 *
 * APIs exercised:
 *   - `RenderUserDefinedState`
 *   - `ChatInstance`
 *
 * Start reading at: `renderUserDefinedResponseFactory`.
 */

import { ChatInstance, RenderUserDefinedState } from "@carbon/ai-chat";
import React from "react";

import { CustomResponseExample } from "./CustomResponseExample";

// Factory pattern: closes over activeResponseId so every render call sees the
// current "latest message" id without prop-drilling through the chat surface.
function renderUserDefinedResponseFactory(activeResponseId?: string | null) {
  return function renderUserDefinedResponse(
    state: RenderUserDefinedState,
    _instance: ChatInstance,
  ) {
    const { messageItem } = state;

    if (messageItem) {
      // Card is "active" only when this message's id matches the conversation's activeResponseId.
      const isActive =
        Boolean(activeResponseId) && state.fullMessage?.id === activeResponseId;

      switch (messageItem.user_defined?.user_defined_type) {
        case "my_unique_identifier":
          return (
            <CustomResponseExample
              data={messageItem.user_defined as { type: string; text: string }}
              isLatestMessage={isActive}
              latestResponseId={activeResponseId ?? undefined}
            />
          );
        default:
          // Returning undefined lets the chat fall back to default rendering for unknown types.
          return undefined;
      }
    }
    return undefined;
  };
}

export { renderUserDefinedResponseFactory };
