/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { ChatInstance, MessageResponse, GenericItem } from "@carbon/ai-chat";
import { IconButton } from "@carbon/react";

// Using @carbon/icons-react for all icons
import Copy16 from "@carbon/icons-react/es/Copy.js";
import Export16 from "@carbon/icons-react/es/Export.js";

interface CustomFooterExampleProps {
  slotName: string;
  message: MessageResponse;
  messageItem: GenericItem;
  instance: ChatInstance;
  additionalData?: Record<string, unknown>;
}

function CustomFooterExample({
  messageItem,
  additionalData,
}: CustomFooterExampleProps) {
  const handleCopy = () => {
    let textToCopy = "";
    if ("text" in messageItem && typeof messageItem.text === "string") {
      textToCopy = messageItem.text;
    }
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
    }
  };

  const handleShare = () => {
    const url = additionalData?.custom_action_url as string;
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="custom-footer-actions">
      {Boolean(additionalData?.allow_copy) && (
        <IconButton
          className="custom-footer-button"
          align="top-left"
          kind="ghost"
          label="Copy"
          size="sm"
          onClick={handleCopy}
        >
          <Copy16 />
        </IconButton>
      )}
      {Boolean(additionalData?.custom_action_url) && (
        <IconButton
          className="custom-footer-button"
          align="top-left"
          kind="ghost"
          label="Share"
          size="sm"
          onClick={handleShare}
        >
          <Export16 />
        </IconButton>
      )}
    </div>
  );
}

export { CustomFooterExample };
