/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  MessageResponseTypes,
  SystemMessageVariant,
} from "@carbon/ai-chat";
import { MARKDOWN } from "./constants";

function doSystemMessage(
  instance: ChatInstance,
  inline?: boolean,
  variant?: SystemMessageVariant,
) {
  if (inline) {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.SYSTEM,
            title: "This is a system message",
          },
          {
            response_type: MessageResponseTypes.TEXT,
            text: MARKDOWN,
          },
        ],
      },
    });
  }
  if (variant === "agent") {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.SYSTEM,
            title: "Agent joined the chat",
            variant: "agent",
          },
        ],
      },
    });
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: MARKDOWN,
          },
        ],
      },
    });
  }
  if (variant === "date") {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.SYSTEM,
            title: "Monday, June 14th 2025",
            variant: "date",
          },
        ],
      },
    });
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: MARKDOWN,
          },
        ],
      },
    });
  } else {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.SYSTEM,
            title: "This is a system message",
            variant: "default",
          },
        ],
      },
    });

    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: MARKDOWN,
          },
        ],
      },
    });
  }
}

export { doSystemMessage };
