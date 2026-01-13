/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, RenderUserDefinedState } from "@carbon/ai-chat";
import React from "react";

import { CustomResponseExample } from "./CustomResponseExample";

function renderUserDefinedResponseFactory(activeResponseId?: string | null) {
  return function renderUserDefinedResponse(
    state: RenderUserDefinedState,
    _instance: ChatInstance,
  ) {
    const { messageItem } = state;

    if (!messageItem) {
      return undefined;
    }

    const isLatest =
      Boolean(activeResponseId) && state.fullMessage?.id === activeResponseId;

    switch (messageItem.user_defined?.user_defined_type) {
      case "my_unique_identifier":
        return (
          <CustomResponseExample
            data={messageItem.user_defined as { type: string; text: string }}
            isLatestMessage={isLatest}
            latestResponseId={activeResponseId ?? undefined}
          />
        );
      default:
        return undefined;
    }
  };
}

export { renderUserDefinedResponseFactory };
