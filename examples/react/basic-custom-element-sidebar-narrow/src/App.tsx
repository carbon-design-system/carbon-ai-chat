/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Custom element (Sidebar narrow)
 *
 * Demonstrates: rendering Carbon AI Chat as a narrow docked side panel. The
 * panel mounts `ChatCustomElement` with the library's shipped
 * `cds-aichat-sidebar` layout classes and overrides the
 * `--cds-aichat-sidebar-width` custom property to 320px — below the 360px
 * default — so the chat falls back to its compact responsive layout. This
 * example exists to show that sub-360px rendering. A host header bar carries a
 * toggle button that opens and closes the panel; the `VIEW_CHANGE` /
 * `VIEW_PRE_CHANGE` lifecycle hooks drive the slide-in and slide-out animation
 * so the chat only unmounts once the CSS transition ends.
 *
 * APIs exercised:
 *   - `ChatCustomElement` styled with the shipped sidebar-layout CSS
 *     (`@carbon/ai-chat/css/chat-sidebar-layout.css`)
 *   - The `--cds-aichat-sidebar-width` custom property, overridden to 320px
 *   - `ChatCustomElement` props `onViewChange` / `onViewPreChange`
 *   - `BusEventViewChange` / `BusEventViewPreChange` payloads
 *   - `ChatInstance.changeView` with `ViewType.MAIN_WINDOW` / `ViewType.LAUNCHER`
 *   - `PublicConfig.layout.corners` (`CornersType.SQUARE`)
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.messaging.customSendMessage` (see `./customSendMessage.ts`)
 *
 * Start reading at: the width override in `./App.css`, then `App()` and its
 * view-change handlers.
 */

import "@carbon/ai-chat/css/chat-sidebar-layout.css";
import "./App.css";
import {
  BusEventViewChange,
  BusEventViewPreChange,
  ChatCustomElement,
  ChatInstance,
  CornersType,
  PublicConfig,
  ViewType,
} from "@carbon/ai-chat";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "@carbon/styles/css/styles.css";
import AiLaunch20 from "@carbon/icons-react/es/AiLaunch.js";

import { customSendMessage } from "./customSendMessage";

// Hold the view transition long enough for the 240ms slide-out CSS transition
// to visibly finish before the chat unmounts.
const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const config: PublicConfig = {
  messaging: {
    // Wire a client-side mock so the example runs with no backend; swap this
    // for a real handler that calls your service in production.
    customSendMessage,
  },
  layout: {
    // Square corners let the chat sit flush inside the docked sidebar chrome
    // instead of showing the default rounded floating-window corners.
    corners: CornersType.SQUARE,
  },
  // Auto-open the conversation on mount so the sidebar is visible from first
  // paint; the header button can still toggle it closed afterwards.
  openChatByDefault: true,
};

function App() {
  const [instance, setInstance] = useState<ChatInstance | null>(null);
  // `sideBarOpen` is the resting open/closed state; `sideBarClosing` is the
  // transient state while the slide-out animation plays.
  const [sideBarOpen, setSideBarOpen] = useState(true);
  const [sideBarClosing, setSideBarClosing] = useState(false);
  // Guards the toggle button against re-entry while a `changeView` is still
  // resolving, so the animation cannot get stuck mid-transition.
  const [clickInProgress, setClickInProgress] = useState(false);

  // Capture the instance so the header button can drive `changeView`. The
  // button only renders once this is set.
  const onBeforeRender = (chatInstance: ChatInstance) => {
    setInstance(chatInstance);
  };

  const onViewChange = (event: BusEventViewChange, _instance: ChatInstance) => {
    if (event.newViewState.mainWindow) {
      // mainWindow is visible: the sidebar has reached its open resting state.
      setSideBarOpen(true);
    } else {
      // mainWindow is hidden: clear both flags to reach the closed resting state.
      setSideBarOpen(false);
      setSideBarClosing(false);
    }
  };

  const onViewPreChange = async (
    event: BusEventViewPreChange,
    _instance: ChatInstance,
  ) => {
    if (!event.newViewState.mainWindow) {
      // Apply the closing modifier so the slide-out transition starts while the
      // chat is still mounted, then hold the view change until it finishes.
      setSideBarClosing(true);
      await sleep(250);
    }
  };

  const handleHeaderButtonClick = async () => {
    if (!instance || clickInProgress) {
      return;
    }

    setClickInProgress(true);
    try {
      const state = instance.getState();
      if (state.viewState.mainWindow) {
        // Open now: LAUNCHER hides the mainWindow and slides the sidebar out.
        await instance.changeView(ViewType.LAUNCHER);
      } else {
        // Closed now: MAIN_WINDOW re-mounts the chat and slides the sidebar in.
        await instance.changeView(ViewType.MAIN_WINDOW);
      }
    } finally {
      setClickInProgress(false);
    }
  };

  // Build the host className from the shipped sidebar-layout classes: the
  // closing modifier wins while the animation plays, otherwise the closed
  // modifier applies once the panel is shut.
  let className = "cds-aichat-sidebar";
  if (sideBarClosing) {
    className += " cds-aichat-sidebar--closing";
  } else if (!sideBarOpen) {
    className += " cds-aichat-sidebar--closed";
  }

  return (
    <>
      <header className="app-header">
        <h1 className="app-header__title">
          Custom Element Sidebar Example (Narrow)
        </h1>
        {instance && (
          <button
            type="button"
            className="app-header__button"
            onClick={handleHeaderButtonClick}
            disabled={clickInProgress}
            aria-label="Toggle AI Chat"
          >
            <AiLaunch20 />
          </button>
        )}
      </header>
      <div className={className}>
        <ChatCustomElement
          className="chat-custom-element"
          {...config}
          onBeforeRender={onBeforeRender}
          onViewChange={onViewChange}
          onViewPreChange={onViewPreChange}
        />
      </div>
    </>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
