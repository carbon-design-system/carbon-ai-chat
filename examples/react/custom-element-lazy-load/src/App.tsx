/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { PublicConfig } from "@carbon/ai-chat";
import ChatShell from "@carbon/ai-chat-components/es/react/chat-shell.js";
import React, { Suspense, useState } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";

// Adding a fake 3000ms timeout here to make the lazy loading behavior obvious when running on localhost.
// That timeout should be removed in a real implementation.
const LazyChatCustomElement = React.lazy(() =>
  new Promise((resolve) => setTimeout(resolve, 3000)).then(() =>
    import("@carbon/ai-chat").then((m) => ({ default: m.ChatCustomElement })),
  ),
);

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    showFrame: false,
  },
  openChatByDefault: true,
  launcher: { isOn: false },
  header: { hideMinimizeButton: true },
};

function App() {
  const [chatReady, setChatReady] = useState(false);

  return (
    <>
      {/* Suspense handles bundle loading only. Its fallback is null because a
          separate ChatShell overlay (below) covers the viewport during both
          phases — bundle loading AND chat initialization.

          Standard Suspense/fallback can't cover initialization: ChatCustomElement
          must render to start initializing (booting services, performing the
          initial view change), so it can never throw a Promise before it's ready.
          Instead, onAfterRender fires once initialization is complete, at which
          point we remove the fallback. */}
      <Suspense fallback={null}>
        <LazyChatCustomElement
          className="chat-custom-element"
          onAfterRender={() => setChatReady(true)}
          {...config}
        />
      </Suspense>

      {/* ChatShell covers the viewport as a fixed overlay for both loading phases:
          while the bundle downloads (Suspense) and while ChatCustomElement boots
          (onAfterRender). Once onAfterRender fires, chatReady flips and the overlay
          unmounts. */}
      {!chatReady && (
        <ChatShell
          className="chat-custom-element chat-custom-element-loading"
          aiEnabled
        />
      )}
    </>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
