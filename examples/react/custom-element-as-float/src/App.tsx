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
  CarbonTheme,
  ChatCustomElement,
  ChatInstance,
  PublicConfig,
  ViewType,
} from "@carbon/ai-chat";
import { AiLaunch } from "@carbon/icons-react";
import ChatButton from "@carbon/ai-chat-components/es/react/chat-button.js";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";

type FloatPhase = "idle" | "opening" | "open" | "closing" | "closed";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  // Suppress the built-in launcher — our custom ChatButton acts as the launcher.
  launcher: { isOn: false },
  injectCarbonTheme: CarbonTheme.WHITE,
};

function App() {
  const [phase, setPhase] = useState<FloatPhase>("idle");
  // The launcher is not shown until onAfterRender fires, so instanceRef.current
  // is always set when handleLauncherClick is called.
  const [chatReady, setChatReady] = useState(false);
  const instanceRef = useRef<ChatInstance | null>(null);
  // Tracks whether the chat has ever been opened so we don't trigger the
  // closing animation on the initial VIEW_CHANGE(mainWindow: false) that fires
  // during chat boot.
  const hasEverOpenedRef = useRef(false);

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
    if (instanceRef.current) {
      void instanceRef.current.changeView(ViewType.MAIN_WINDOW);
    }
  }

  function onAfterRender(instance: ChatInstance) {
    instanceRef.current = instance;
    setChatReady(true);
  }

  // Passed to ChatCustomElement to suppress its default behavior of collapsing
  // the container to 0×0 via cds-aichat--hidden (which conflicts with our float
  // CSS animations). We drive all visual state through phase instead.
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
      case "idle":
      case "closed":
      default:
        return "cds-aichat-float--close";
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
      {/* ChatCustomElement renders immediately and begins initializing.
          The float container is hidden (cds-aichat-float--close) until the
          user first opens it. onViewChange drives phase transitions and
          suppresses ChatCustomElement's default cds-aichat--hidden behavior. */}
      <ChatCustomElement
        className={getFloatClass()}
        onAnimationEnd={handleFloatAnimationEnd}
        onAfterRender={onAfterRender}
        onViewChange={onViewChange}
        {...config}
      />

      {/* Launcher is not rendered until onAfterRender fires, guaranteeing
          instanceRef.current is set before handleLauncherClick can be called. */}
      {chatReady && (
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
      )}
    </>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
