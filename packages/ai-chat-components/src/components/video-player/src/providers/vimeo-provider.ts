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
 * Vimeo player implementation adapted from:
 * https://github.com/cookpete/react-player/blob/v2.15.1/src/players/Vimeo.js
 */

import { BaseProvider, ProviderConfig } from "./base-provider.js";
import { ScriptLoader } from "../../../shared/media-utils/script-loader.js";

const SDK_URL = "https://player.vimeo.com/api/player.js";

// Declare Vimeo Player API types
declare global {
  interface Window {
    Vimeo: any;
  }
}

/**
 * Clean Vimeo URL by removing management paths
 */
function cleanUrl(url: string): string {
  return url.replace("/manage/videos", "");
}

/**
 * Provider for Vimeo videos using the Vimeo Player API
 */
export class VimeoProvider extends BaseProvider {
  private player: any = null;
  private playerContainer: HTMLDivElement | null = null;
  private isReady = false;

  /**
   * Initialize the provider and load Vimeo Player API
   */
  async init(container: HTMLElement, config: ProviderConfig): Promise<void> {
    await super.init(container, config);

    if (!this.container) {
      throw new Error("Container element is required");
    }

    // Create container for Vimeo player
    this.playerContainer = document.createElement("div");
    this.playerContainer.style.width = "100%";
    this.playerContainer.style.height = "100%";
    this.playerContainer.style.position = "absolute";
    this.playerContainer.style.top = "0";
    this.playerContainer.style.left = "0";
    this.container.appendChild(this.playerContainer);

    // Load Vimeo Player API
    await this.loadVimeoAPI();
  }

  /**
   * Load the Vimeo Player API script
   */
  private async loadVimeoAPI(): Promise<void> {
    if (window.Vimeo && window.Vimeo.Player) {
      return Promise.resolve();
    }

    await ScriptLoader.load(SDK_URL);

    // Wait for Vimeo to be available
    return new Promise((resolve, reject) => {
      const checkVimeo = () => {
        if (window.Vimeo && window.Vimeo.Player) {
          resolve();
        } else {
          setTimeout(checkVimeo, 100);
        }
      };
      checkVimeo();

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!window.Vimeo || !window.Vimeo.Player) {
          reject(new Error("Vimeo Player API failed to load"));
        }
      }, 5000);
    });
  }

  /**
   * Load a Vimeo video URL
   */
  async load(url: string): Promise<void> {
    if (!this.playerContainer) {
      throw new Error("Player container not initialized");
    }

    // Wait for API to be ready
    if (!window.Vimeo || !window.Vimeo.Player) {
      await this.loadVimeoAPI();
    }

    const cleanedUrl = cleanUrl(url);

    try {
      // Create new player
      this.player = new window.Vimeo.Player(this.playerContainer, {
        url: cleanedUrl,
        autoplay: this.config.playing || false,
        controls: true,
        playsinline: true,
      });

      // Wait for player to be ready
      await this.player.ready();

      // Style the iframe
      const iframe = this.playerContainer.querySelector("iframe");
      if (iframe) {
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.position = "absolute";
        iframe.style.top = "0";
        iframe.style.left = "0";

        // Set ARIA label if provided
        if (this.config.ariaLabel) {
          iframe.setAttribute("aria-label", this.config.ariaLabel);
        }
      }

      // Set up event listeners
      this.player.on("loaded", () => {
        this.isReady = true;
        this.triggerReady();
      });

      this.player.on("play", () => {
        this.triggerPlay();
      });

      this.player.on("pause", () => {
        this.triggerPause();
      });

      this.player.on("ended", () => {
        this.triggerPause();
      });

      this.player.on("error", (error: any) => {
        this.triggerError(
          new Error(`Vimeo error: ${error.message || "Unknown error"}`),
        );
      });
    } catch (error) {
      this.triggerError(
        new Error(
          `Failed to load Vimeo video: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
    }
  }

  /**
   * Start or resume playback
   */
  play(): void {
    if (this.player && this.isReady) {
      this.player.play().catch((error: any) => {
        console.warn("Vimeo play was prevented:", error);
      });
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.player && this.isReady) {
      this.player.pause().catch((error: any) => {
        console.warn("Vimeo pause failed:", error);
      });
    }
  }

  /**
   * Clean up the provider
   */
  destroy(): void {
    if (this.player) {
      this.player.destroy().catch((error: any) => {
        console.warn("Vimeo destroy failed:", error);
      });
      this.player = null;
    }
    this.playerContainer = null;
    this.isReady = false;
    super.destroy();
  }
}

// Made with Bob
