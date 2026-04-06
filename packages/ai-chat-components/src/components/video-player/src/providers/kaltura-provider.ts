/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Portions of this code are derived from react-player
 * Copyright (c) 2017 Pete Cook
 * Licensed under the MIT License
 * https://github.com/cookpete/react-player/blob/v2.15.1/LICENSE
 *
 * Kaltura player implementation adapted from:
 * https://github.com/cookpete/react-player/blob/v2.15.1/src/players/Kaltura.js
 */

import { BaseProvider, ProviderConfig } from "./base-provider.js";
import { ScriptLoader } from "../../../shared/media-utils/script-loader.js";

const SDK_URL = "https://cdn.embed.ly/player-0.1.0.min.js";

// Declare player.js API types
declare global {
  interface Window {
    playerjs: any;
  }
}

/**
 * Provider for Kaltura videos using the player.js API
 * Kaltura uses the player.js standard for iframe communication
 */
export class KalturaProvider extends BaseProvider {
  private player: any = null;
  private iframe: HTMLIFrameElement | null = null;
  private isReady = false;

  /**
   * Update aria attributes based on state
   */
  protected updateAriaAttributes(
    element: HTMLElement,
    state: "loading" | "ready" | "error",
  ): void {
    element.setAttribute("aria-label", this.getStateLabel(state));
    element.setAttribute("aria-busy", state === "loading" ? "true" : "false");
  }

  /**
   * Initialize the provider and create the iframe
   */
  async init(container: HTMLElement, config: ProviderConfig): Promise<void> {
    await super.init(container, config);

    if (!this.container) {
      throw new Error("Container element is required");
    }

    // Create iframe for Kaltura player
    this.iframe = document.createElement("iframe");
    this.iframe.style.width = "100%";
    this.iframe.style.height = "100%";
    this.iframe.style.position = "absolute";
    this.iframe.style.top = "0";
    this.iframe.style.left = "0";
    this.iframe.style.border = "none";
    this.iframe.setAttribute("frameborder", "0");
    this.iframe.setAttribute("scrolling", "no");
    this.iframe.setAttribute("allow", "encrypted-media; autoplay; fullscreen;");
    this.iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-downloads allow-forms allow-popups allow-same-origin",
    );
    this.iframe.setAttribute("referrer-policy", "origin");
    this.iframe.setAttribute("role", "application");

    // Set initial ARIA attributes for loading state
    if (config.ariaLabel) {
      this.updateAriaAttributes(this.iframe, "loading");
    }

    this.container.appendChild(this.iframe);

    // Load player.js API
    await this.loadPlayerJS();
  }

  /**
   * Load the player.js API script
   */
  private async loadPlayerJS(): Promise<void> {
    if (window.playerjs && window.playerjs.Player) {
      return Promise.resolve();
    }

    await ScriptLoader.load(SDK_URL);

    // Wait for playerjs to be available
    return new Promise((resolve, reject) => {
      const checkPlayerJS = () => {
        if (window.playerjs && window.playerjs.Player) {
          resolve();
        } else {
          setTimeout(checkPlayerJS, 100);
        }
      };
      checkPlayerJS();

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!window.playerjs || !window.playerjs.Player) {
          reject(new Error("player.js API failed to load"));
        }
      }, 5000);
    });
  }

  /**
   * Load a Kaltura video URL
   */
  async load(url: string): Promise<void> {
    if (!this.iframe) {
      throw new Error("Iframe not initialized");
    }

    // Wait for API to be ready
    if (!window.playerjs || !window.playerjs.Player) {
      await this.loadPlayerJS();
    }

    // Set iframe src
    this.iframe.src = url;

    // Wait for iframe to load
    await new Promise<void>((resolve) => {
      if (this.iframe) {
        this.iframe.onload = () => resolve();
      }
    });

    // Create player.js instance
    this.player = new window.playerjs.Player(this.iframe);

    // Set up ready handler
    this.player.on("ready", () => {
      // Arbitrary timeout required for event listeners to work
      setTimeout(() => {
        if (this.iframe) {
          this.updateAriaAttributes(this.iframe, "ready");
        }
        this.isReady = true;
        this.addListeners();
        this.triggerReady();
      }, 500);
    });
  }

  /**
   * Add event listeners to the player
   */
  private addListeners(): void {
    if (!this.player) {
      return;
    }

    this.player.on("play", () => {
      this.triggerPlay();
    });

    this.player.on("pause", () => {
      this.triggerPause();
    });

    this.player.on("ended", () => {
      this.triggerPause();
    });

    this.player.on("error", (_error: any) => {
      if (this.iframe) {
        this.updateAriaAttributes(this.iframe, "error");
      }
      // Use the generic error message from config
      this.triggerError(
        new Error(this.config.errorMessage || "Failed to load video"),
      );
    });

    this.player.on("timeupdate", (_data: any) => {
      // Track time updates if needed in the future
    });
  }

  /**
   * Start or resume playback
   */
  play(): void {
    if (this.player && this.isReady) {
      this.player.play();
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.player && this.isReady) {
      this.player.pause();
    }
  }

  /**
   * Clean up the provider
   */
  destroy(): void {
    if (this.player) {
      // player.js doesn't have a destroy method
      // Just remove event listeners by setting player to null
      this.player = null;
    }
    this.iframe = null;
    this.isReady = false;
    super.destroy();
  }
}

// Made with Bob
