/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Custom element (lazy load) (React)
 *
 * Demonstrates: code-splitting `ChatCustomElement` with `React.lazy` and
 * using `<cds-aichat-shell>` (via the `ChatShell` React wrapper) as a
 * crossfade fallback covering both the bundle download and the chat's
 * own initialization. The example purposely adds a 3-second delay so the
 * crossfade is visible.
 *
 * APIs exercised:
 *   - `React.lazy` + `Suspense` to defer the chat bundle
 *   - `ChatShell` (overlay shown during bundle + init)
 *   - `PublicConfig.launcher.isOn` + `header.hideMinimizeButton`
 *     (load-skeleton-crossfade-specific variances)
 *
 * Start reading at: `LazyChatCustomElement` below and `App()`.
 */

import { PublicConfig } from "@carbon/ai-chat";
import ChatShell from "@carbon/ai-chat-components/es/react/chat-shell.js";
import React, { Suspense, useState } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";

// Artificial delay makes the lazy-load + crossfade phases observable on localhost.
// Replace with a real production implementation (drop the timeout).
const LazyChatCustomElement = React.lazy(() =>
  new Promise((resolve) => setTimeout(resolve, 3000)).then(() =>
    import("@carbon/ai-chat").then((m) => ({ default: m.ChatCustomElement })),
  ),
);

const config: PublicConfig = {
  messaging: {
    // Replace with a real production implementation.
    customSendMessage,
  },
  layout: {
    // Removes the chat's default frame so the embedded element fills its host without a chrome border.
    showFrame: false,
  },
  // Auto-opens the chat on load since the embedded layout has no launcher to toggle it.
  openChatByDefault: true,
  // Disables the floating launcher because this example embeds the chat inline rather than as a pop-out widget.
  launcher: { isOn: false },
  // Embedded layout has no parent panel to minimize into, so the minimize affordance is hidden.
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
