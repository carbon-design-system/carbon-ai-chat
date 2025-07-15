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

function renderUserDefinedResponse(
  state: RenderUserDefinedState,
  instance: ChatInstance
) {
  const { messageItem } = state;
  // The event here will contain details for each user defined response that needs to be rendered.
  // If you need to access data from the parent component, you could define this function there instead.

  if (messageItem) {
    switch (messageItem.user_defined?.user_defined_type) {
      case "my_unique_identifier":
        return (
          <CustomResponseExample
            data={messageItem.user_defined as { type: string; text: string }}
          />
        );
      default:
        return undefined;
    }
  }
  return undefined;
}

export { renderUserDefinedResponse };
