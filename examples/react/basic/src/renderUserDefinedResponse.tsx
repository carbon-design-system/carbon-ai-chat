/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
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
