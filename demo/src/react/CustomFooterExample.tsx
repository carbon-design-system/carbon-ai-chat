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
import "./CustomFooterExample.css";

interface CustomFooterExampleProps {
  slotName: string;
  message: MessageResponse;
  messageItem: GenericItem;
  instance: ChatInstance;
  additionalData?: Record<string, unknown>;
}

function CustomFooterExample({
  //slotName,
  //message,
  messageItem,
  //instance,
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

  const handleRegenerate = () => alert("Regenerate response clicked");

  const handleShare = () => {
    const url = additionalData?.custom_action_url as string;
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="custom-footer-actions">
      {Boolean(additionalData?.allow_copy) && (
        <button
          type="button"
          className="custom-footer-button"
          onClick={handleCopy}
          title="Copy message text"
        >
          Copy
        </button>
      )}
      {Boolean(additionalData?.allow_regenerate) && (
        <button
          type="button"
          className="custom-footer-button"
          onClick={handleRegenerate}
          title="Regenerate response"
        >
          Regenerate
        </button>
      )}
      {Boolean(additionalData?.custom_action_url) && (
        <button
          type="button"
          className="custom-footer-button"
          onClick={handleShare}
          title="Share message"
        >
          Share
        </button>
      )}
    </div>
  );
}

export { CustomFooterExample };
