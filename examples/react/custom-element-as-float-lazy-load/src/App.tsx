/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/ai-chat/css/chat-float-layout.css";
import "@carbon/ai-chat/css/chat-launcher-layout.css";

import {
  BusEventViewChange,
  ChatInstance,
  PublicConfig,
  ViewType,
  readCarbonChatSession,
} from "@carbon/ai-chat";
import ChatShell from "@carbon/ai-chat-components/es/react/chat-shell.js";
import { AiLaunch } from "@carbon/icons-react";
import ChatButton from "@carbon/ai-chat-components/es/react/chat-button.js";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";

// Check once at page load whether the chat was open in the previous session.
// If so, auto-mount immediately (no launcher click required); otherwise wait.
const previousSession = readCarbonChatSession();
const chatWasPreviouslyOpen = previousSession?.viewState.mainWindow === true;

// ChatCustomElement is code-split and only downloaded when the launcher is
// first clicked. Until then, the page renders nothing but the launcher button.
// Adding a fake 3000 ms timeout here to make the lazy loading behavior more obvious
// when running on localhost. That timeout should be removed in a real implementation.
const LazyChatCustomElement = React.lazy(() =>
  new Promise((resolve) => setTimeout(resolve, 3000)).then(() =>
    import("@carbon/ai-chat").then((m) => ({ default: m.ChatCustomElement })),
  ),
);

type FloatPhase = "idle" | "opening" | "open" | "closing" | "closed";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  // Suppress the built-in launcher — our custom Button acts as the launcher.
  launcher: { isOn: false },
};

function App() {
  const [phase, setPhase] = useState<FloatPhase>(
    chatWasPreviouslyOpen ? "opening" : "idle",
  );
  const instanceRef = useRef<ChatInstance | null>(null);
  // Tracks whether the chat has ever been opened so we don't trigger the
  // closing animation on the initial VIEW_CHANGE(mainWindow: false) that fires
  // during chat boot.
  const hasEverOpenedRef = useRef(false);

  // ChatShell covers both loading phases inside the float container:
  //   1. While the bundle is downloading (Suspense is pending)
  //   2. While ChatCustomElement is initializing (before onAfterRender)
  // Once onAfterRender fires, chatReady flips and ChatShell goes away.
  const [chatReady, setChatReady] = useState(false);

  // When prefers-reduced-motion is set there is no CSS animation, so
  // animationend will never fire. Advance the phase immediately in that case.
  useEffect(() => {
    if (phase !== "opening" && phase !== "closing") {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(phase === "opening" ? "open" : "closed");
    }
  }, [phase]);

  function handleLauncherClick() {
    if (phase === "idle") {
      // First click: trigger the lazy load by mounting LazyChatCustomElement.
      setPhase("opening");
    } else if (phase === "closed" && instanceRef.current) {
      // Subsequent clicks: chat is already loaded; changeView triggers
      // onViewChange which advances the phase to "opening".
      void instanceRef.current.changeView(ViewType.MAIN_WINDOW);
    }
  }

  function onAfterRender(instance: ChatInstance) {
    instanceRef.current = instance;
    // Force main-window regardless of session state: either the user just
    // clicked our launcher, or we auto-loaded because they were previously in
    // the chat. Gate setChatReady until changeView resolves so ChatShell
    // doesn't fade before the chat has switched to the main window.
    void instance.changeView(ViewType.MAIN_WINDOW).then(() => {
      setChatReady(true);
    });
  }

  // Passed to LazyChatCustomElement to suppress its default behavior of
  // collapsing the container to 0×0 via cds-aichat--hidden (which conflicts
  // with our float CSS animations). We drive all visual state through phase
  // instead. hasEverOpenedRef guards against the initial boot
  // VIEW_CHANGE(mainWindow: false) that fires before the chat has ever opened.
  function onViewChange(event: BusEventViewChange) {
    if (event.newViewState.mainWindow) {
      hasEverOpenedRef.current = true;
      setPhase("opening");
    } else if (hasEverOpenedRef.current) {
      setPhase("closing");
    }
  }

  function getFloatClass(): string {
    switch (phase) {
      case "opening":
        // --open supplies position:fixed + dimensions; --opening adds the animation.
        return "cds-aichat-float--open cds-aichat-float--opening";
      case "open":
        return "cds-aichat-float--open";
      case "closing":
        // Keep --open so the widget stays positioned while the close animation plays.
        return "cds-aichat-float--open cds-aichat-float--closing";
      case "closed":
        return "cds-aichat-float--close";
      default:
        return "";
    }
  }

  function getLauncherClass(): string {
    // Hide the launcher while the float is opening, open, or closing.
    // visibility:hidden (from --hidden) preserves layout so the entrance
    // animation does not replay when the launcher reappears.
    const hidden = phase !== "idle" && phase !== "closed";
    return hidden
      ? "cds-aichat-launcher cds-aichat-launcher--hidden"
      : "cds-aichat-launcher";
  }

  function handleFloatAnimationEnd() {
    if (phase === "opening") {
      setPhase("open");
    } else if (phase === "closing") {
      setPhase("closed");
    }
  }

  return (
    <>
      {/* Custom launcher button — rendered immediately so the entrance animation
          plays on first mount. Hidden (not unmounted) when the float is open so
          the animation does not replay when the float closes again. */}
      <ChatButton
        className={getLauncherClass()}
        hasIconOnly
        iconDescription="Open chat"
        kind="primary"
        size="lg"
        onClick={handleLauncherClick}
      >
        <AiLaunch slot="icon" />
      </ChatButton>

      {/* Not mounted until the launcher is first clicked. Stays mounted after
          that so the lazy bundle is not discarded. */}
      {phase !== "idle" && (
        <>
          {/* Suspense fallback is null because ChatShell (below) covers the
              float area during both phases — bundle loading AND initialization.
              This mirrors the pattern in custom-element-lazy-load. */}
          <Suspense fallback={null}>
            <LazyChatCustomElement
              className={getFloatClass()}
              onAnimationEnd={handleFloatAnimationEnd}
              onAfterRender={onAfterRender}
              onViewChange={onViewChange}
              {...config}
            />
          </Suspense>

          {/* ChatShell sits at the same fixed position as LazyChatCustomElement,
              covering it during both loading phases. Once onAfterRender fires,
              chatReady flips and ChatShell unmounts. */}
          {!chatReady && (
            <ChatShell
              className="cds-aichat-float--open"
              showFrame
              aiEnabled
              cornerAll="round"
            />
          )}
        </>
      )}
    </>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
