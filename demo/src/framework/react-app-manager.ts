/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { createRoot, Root } from "react-dom/client";
import type { PublicConfig, ChatInstance } from "@carbon/ai-chat";
import { DemoApp } from "../react/DemoApp";
import type { Settings } from "./types";
import type { SetChatConfigModeState } from "./set-chat-config-manager";

/**
 * Manages React app rendering and lifecycle.
 *
 * This manager handles the React 18 rendering system using createRoot for the demo
 * application. It manages the React root instance lifecycle and handles special
 * rendering logic for setChatConfig mode states.
 */
export class ReactAppManager {
  /** React 18 root instance for rendering the demo app */
  private root?: Root;

  /**
   * Render the React demo app with current configuration.
   *
   * This method handles the React rendering lifecycle including root creation,
   * setChatConfig mode state handling, and configuration passing to the DemoApp
   * component. It prevents chat rendering when in setChatConfig mode without
   * a valid configuration.
   */
  async renderReactApp(
    config: PublicConfig,
    settings: Settings,
    setChatConfigState: SetChatConfigModeState,
    onChatInstanceReady: (instance: ChatInstance) => void,
  ): Promise<void> {
    const container = document.querySelector("#root") as HTMLElement;

    // Create root only once to avoid memory leaks
    if (!this.root) {
      this.root = createRoot(container);
    }

    // Don't render chat if in setChatConfig mode without config
    if (
      setChatConfigState.isSetChatConfigMode &&
      !setChatConfigState.hasReceivedSetChatConfig
    ) {
      // Only render empty div if we haven't already rendered it
      this.root.render(React.createElement("div")); // Render empty div
      return;
    }

    // Render the demo app with current configuration
    this.root.render(
      React.createElement(DemoApp, {
        config,
        settings,
        onChatInstanceReady,
      }),
    );

    // Wait for React to complete the render
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Clean up React root when component is destroyed.
   *
   * Properly unmounts the React application and clears the root reference
   * to prevent memory leaks when the demo component is destroyed.
   */
  destroy(): void {
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
  }
}
