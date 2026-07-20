/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { RenderUserDefinedState } from "@carbon/ai-chat";
import React from "react";

import {
  ReasoningSummaryCard,
  ReasoningSummaryData,
} from "./ReasoningSummaryCard";

function renderUserDefinedResponse(state: RenderUserDefinedState) {
  const { messageItem } = state;
  if (!messageItem) {
    return undefined;
  }

  switch (messageItem.user_defined?.user_defined_type) {
    case "reasoning_summary":
      return (
        <ReasoningSummaryCard
          data={messageItem.user_defined as ReasoningSummaryData}
        />
      );
    default:
      return undefined;
  }
}

export { renderUserDefinedResponse };
