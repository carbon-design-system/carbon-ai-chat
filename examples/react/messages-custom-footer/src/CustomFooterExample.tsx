/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Custom footer UI for the messages-custom-footer example.
 *
 * Demonstrates: a footer rendered beneath an assistant message. It reads the
 * `additionalData` the backend attached to the message's `custom_footer_slot`
 * (here an `allow_copy` flag) and renders a button that copies the message text.
 *
 * Rendered by: the `renderCustomMessageFooter` render prop in `./App.tsx`.
 */

import { ChatInstance, GenericItem, MessageResponse } from "@carbon/ai-chat";
import { Copy } from "@carbon/icons-react";
import { IconButton } from "@carbon/react";
import React from "react";

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
    // `messageItem` is the assistant item the footer hangs off of, so its
    // `text` is what the user expects the copy button to put on the clipboard.
    if ("text" in messageItem && typeof messageItem.text === "string") {
      navigator.clipboard.writeText(messageItem.text);
    }
  };

  // The copy button is gated on a flag the backend put in `additional_data`,
  // showing how a message controls its own footer.
  if (!additionalData?.allow_copy) {
    return null;
  }

  return (
    <div className="custom-footer-actions">
      <IconButton
        className="custom-footer-button"
        kind="ghost"
        size="sm"
        label="Copy"
        onClick={handleCopy}
      >
        <Copy />
      </IconButton>
    </div>
  );
}

export { CustomFooterExample };
