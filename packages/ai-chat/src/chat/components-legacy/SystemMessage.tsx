/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import {
  Message,
  MessageResponseTypes,
  SystemMessageItem,
} from "../../types/messaging/Messages";
import { isResponse } from "../utils/messageUtils";

interface SystemMessageProps {
  message: Message;
  /**
   * If true, renders as standalone (no bubble). If false, renders inline within a message bubble.
   */
  standalone?: boolean;
}

/**
 * Component for rendering system messages. Can render either standalone (centered, no bubble)
 * or inline (within a message bubble).
 */
function SystemMessage({ message, standalone = true }: SystemMessageProps) {
  if (!isResponse(message)) {
    return null;
  }

  // System message response
  const systemItems = message.output.generic.filter(
    (item) => item.response_type === MessageResponseTypes.SYSTEM,
  ) as SystemMessageItem[];

  if (systemItems.length === 0) {
    return null;
  }

  // If multiple system messages, join them with a separator
  const title = systemItems.map((item) => item.title).join(" • ");

  const className = standalone
    ? "cds-aichat--system-message-standalone"
    : "cds-aichat--system-message-inline";

  return (
    <div className={className} role="status" aria-live="polite">
      <div className={`${className}-text`}>{title}</div>
    </div>
  );
}

export { SystemMessage };
