/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { useSelector } from "../../../hooks/useSelector";
import { AppState } from "../../../../types/state/AppState";
import {
  Message,
  MessageResponseTypes,
  SystemMessageItem,
  SystemMessageVariant,
} from "../../../../types/messaging/Messages";
import { isResponse } from "../../../utils/messageUtils";

interface SystemMessageProps {
  /**
   * The message to display. Optional because `responseStopped` mode renders
   * without a message object.
   */
  message?: Message;
  /**
   * If true, renders as standalone (no bubble). If false, renders inline within a message bubble.
   */
  standalone?: boolean;
  /**
   * If true, renders the "response stopped" indicator instead of a system message.
   */
  responseStopped?: boolean;
}

/**
 * Component for rendering system messages. Can render either standalone (centered
 * outside of message bubble)
 * or inline (within a message bubble).
 */
function SystemMessage({
  message,
  standalone = true,
  responseStopped = false,
}: SystemMessageProps) {
  const messages_responseStopped = useSelector(
    (state: AppState) => state.languagePack.messages_responseStopped,
  );

  if (responseStopped) {
    return (
      <div className="cds-aichat--system-message-response-stopped">
        {messages_responseStopped}
      </div>
    );
  }

  if (!message || !isResponse(message)) {
    return null;
  }

  // System message response - find the single system message item
  const systemItem = message.output.generic.find(
    (item) => item.response_type === MessageResponseTypes.SYSTEM,
  ) as SystemMessageItem | undefined;

  if (!systemItem) {
    return null;
  }

  const title = systemItem.title;
  const variant: SystemMessageVariant = systemItem.variant ?? "default";

  const className = standalone
    ? "cds-aichat--system-message-standalone"
    : "cds-aichat--system-message-inline";

  // `date` / `agent` apply only to standalone system lines; inline always uses default styling
  const variantClassName = standalone
    ? variant === "date"
      ? `${className}--date`
      : variant === "agent"
        ? `${className}--agent`
        : ""
    : "";

  return (
    <div
      className={`${className} ${variantClassName}`}
      role="status"
      aria-live="polite"
    >
      <div className={`${className}-text`}>{title}</div>
    </div>
  );
}

export { SystemMessage };
