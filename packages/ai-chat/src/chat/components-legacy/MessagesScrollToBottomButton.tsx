/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ChatButton, {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_SIZE,
} from "@carbon/ai-chat-components/es/react/chat-button.js";
import React from "react";
import { MountChildrenOnDelay } from "../components/util/MountChildrenOnDelay";

interface MessagesScrollToBottomButtonProps {
  ariaLabel: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function MessagesScrollToBottomButton({
  ariaLabel,
  icon,
  onClick,
}: MessagesScrollToBottomButtonProps) {
  return (
    <MountChildrenOnDelay>
      <div className="cds-aichat__scroll-to-bottom">
        <ChatButton
          className="cds-aichat__scroll-to-bottom-button"
          size={CHAT_BUTTON_SIZE.SMALL}
          kind={CHAT_BUTTON_KIND.SECONDARY}
          aria-label={ariaLabel}
          onClick={onClick}
        >
          {icon}
        </ChatButton>
      </div>
    </MountChildrenOnDelay>
  );
}

export { MessagesScrollToBottomButton };
