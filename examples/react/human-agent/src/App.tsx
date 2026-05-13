/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Human agent (React)
 *
 * Demonstrates: handing the conversation off to a live agent through
 * `serviceDeskFactory`, including the `useMemo` pattern that keeps the
 * factory reference stable so the active session is not torn down on every
 * render.
 *
 * APIs exercised:
 *   - `ChatCustomElement`
 *   - `PublicConfig.serviceDeskFactory`
 *   - `ServiceDesk` (see `./mockServiceDesk.ts`)
 *
 * Start reading at: `Chat()` and the memoized `serviceDeskFactory`.
 */

import {
  ChatCustomElement,
  PublicConfig,
  ServiceDesk,
  ServiceDeskFactoryParameters,
} from "@carbon/ai-chat";
import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { MockServiceDesk } from "./mockServiceDesk";
import "@carbon/styles/css/styles.css";

function Chat() {
  // Memoize so the same factory reference is reused across renders;
  // a new reference would tear down and re-create the active service desk session.
  const serviceDeskFactory = useMemo(() => {
    const factory = (parameters: ServiceDeskFactoryParameters) => {
      // Replace with a real production implementation.
      return Promise.resolve(new MockServiceDesk(parameters) as ServiceDesk);
    };
    return factory;
  }, []);

  const config: PublicConfig = useMemo(
    () => ({
      messaging: {
        customSendMessage,
      },
      serviceDeskFactory,
      layout: {
        // Disable the default chrome frame so the host page controls layout.
        showFrame: false,
      },
      // Auto-open on load so the human-agent flow is immediately visible.
      openChatByDefault: true,
    }),
    [serviceDeskFactory],
  );

  return <ChatCustomElement className="chat-custom-element" {...config} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<Chat />);
