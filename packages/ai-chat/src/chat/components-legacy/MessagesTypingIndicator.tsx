/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from "classnames";
import Processing from "@carbon/ai-chat-components/es/react/processing.js";
import React from "react";
import { AriaLiveMessage } from "../components/aria/AriaLiveMessage";
import { CarbonTheme } from "../../types/config/PublicConfig";

interface MessagesTypingIndicatorProps {
  carbonTheme: CarbonTheme;
  index: number;
  isTypingMessage?: string;
  isVisible: boolean;
  processingLabel: string;
  statusMessage?: string;
}

function MessagesTypingIndicator({
  carbonTheme,
  index,
  isTypingMessage,
  isVisible,
  processingLabel,
  statusMessage,
}: MessagesTypingIndicatorProps) {
  return (
    <div
      className={cx(
        `cds-aichat--message cds-aichat--message-${index} cds-aichat--message--last-message`,
        { "cds-aichat--typing-indicator--hidden": !isVisible },
      )}
    >
      <div className="cds-aichat--message--padding">
        {isVisible && isTypingMessage && (
          <AriaLiveMessage message={isTypingMessage} />
        )}
        <div className="cds-aichat--assistant-message">
          <div className="cds-aichat--received cds-aichat--received--loading cds-aichat--message-vertical-padding">
            <div className="cds-aichat--received--inner">
              <div className="cds-aichat--processing">
                <Processing
                  className="cds-aichat--processing-component"
                  loop
                  carbonTheme={carbonTheme}
                  aria-label={processingLabel}
                />{" "}
                <div className="cds-aichat--processing-label">
                  {statusMessage}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { MessagesTypingIndicator };
