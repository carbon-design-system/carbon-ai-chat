/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Dispatch a `user_defined` response item to its renderer component.
 *
 * The chat calls this for every user_defined item it encounters; we switch on
 * `user_defined_type` and return the matching React subtree (or `undefined` to
 * let the chat skip the item).
 */

import { RenderUserDefinedState } from "@carbon/ai-chat";
import React from "react";

import { StepsCard, StepsCardData } from "./StepsCard";

function renderUserDefinedResponse(state: RenderUserDefinedState) {
  const { messageItem } = state;
  if (!messageItem) {
    return undefined;
  }

  switch (messageItem.user_defined?.user_defined_type) {
    case "steps_card":
      return (
        <StepsCard
          data={messageItem.user_defined as unknown as StepsCardData}
        />
      );
    default:
      return undefined;
  }
}

export { renderUserDefinedResponse };
