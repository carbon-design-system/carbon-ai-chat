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
 * SoundCloud player implementation adapted from:
 * https://github.com/cookpete/react-player/blob/v2.15.1/src/players/SoundCloud.js
 */

import { BaseProvider, ProviderConfig } from "./base-provider.js";
import { ScriptLoader } from "../../../shared/media-utils/script-loader.js";

const SDK_URL = "https://w.soundcloud.com/player/api.js";

// Declare SoundCloud Widget API types
declare global {
  interface Window {
    SC: any;
  }
}

/**
 * Provider for SoundCloud audio using the SoundCloud Widget API
 */
export class SoundCloudProvider extends BaseProvider {
  private player: any = null;
  private iframe: HTMLIFrameElement | null = null;
  private isReady = false;
  private duration = 0;
  private currentTime = 0;

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

    // Create iframe for SoundCloud player
    this.iframe = document.createElement("iframe");
    this.iframe.setAttribute("frameborder", "0");
    this.iframe.setAttribute("allow", "autoplay");
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

    // Load SoundCloud Widget API
    await this.loadSoundCloudAPI();
  }

  /**
   * Load the SoundCloud Widget API script
   */
  private async loadSoundCloudAPI(): Promise<void> {
    if (window.SC && window.SC.Widget) {
      return Promise.resolve();
    }

    await ScriptLoader.load(SDK_URL);

    // Wait for SC to be available
    return new Promise((resolve, reject) => {
      const checkSC = () => {
        if (window.SC && window.SC.Widget) {
          resolve();
        } else {
          setTimeout(checkSC, 100);
        }
      };
      checkSC();

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!window.SC || !window.SC.Widget) {
          reject(new Error(this.config.errorMessage));
        }
      }, 5000);
    });
  }

  /**
   * Load a SoundCloud audio URL
   */
  async load(url: string): Promise<void> {
    if (!this.iframe) {
      throw new Error("Iframe not initialized");
    }

    // Wait for API to be ready
    if (!window.SC || !window.SC.Widget) {
      await this.loadSoundCloudAPI();
    }

    const { SC } = window;
    const { PLAY, PLAY_PROGRESS, PAUSE, FINISH, ERROR } = SC.Widget.Events;

    // Set iframe src
    this.iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`;

    // Wait for iframe to load
    await new Promise<void>((resolve) => {
      if (this.iframe) {
        this.iframe.onload = () => resolve();
      }
    });

    // Create widget
    this.player = SC.Widget(this.iframe);

    // Bind events
    this.player.bind(PLAY, () => {
      this.triggerPlay();
    });

    this.player.bind(PAUSE, () => {
      // Check if we're at the end to avoid firing pause before ended
      const remaining = this.duration - this.currentTime;
      if (remaining >= 0.05) {
        this.triggerPause();
      }
    });

    this.player.bind(PLAY_PROGRESS, (e: any) => {
      this.currentTime = e.currentPosition / 1000;
    });

    this.player.bind(FINISH, () => {
      this.triggerPause();
    });

    this.player.bind(ERROR, (_e: any) => {
      if (this.iframe) {
        this.updateAriaAttributes(this.iframe, "error");
      }
      // Use the generic error message from config
      this.triggerError(new Error(this.config.errorMessage));
    });

    // Load the track and get duration
    this.player.load(url, {
      auto_play: this.config.playing || false,
      callback: () => {
        this.player.getDuration((duration: number) => {
          this.duration = duration / 1000;
          this.isReady = true;
          if (this.iframe) {
            this.updateAriaAttributes(this.iframe, "ready");
          }
          this.triggerReady();
        });
      },
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
      // SoundCloud widget doesn't have a destroy method
      // Just unbind events
      if (window.SC && window.SC.Widget && window.SC.Widget.Events) {
        const { PLAY, PLAY_PROGRESS, PAUSE, FINISH, ERROR } =
          window.SC.Widget.Events;
        this.player.unbind(PLAY);
        this.player.unbind(PLAY_PROGRESS);
        this.player.unbind(PAUSE);
        this.player.unbind(FINISH);
        this.player.unbind(ERROR);
      }
      this.player = null;
    }
    this.iframe = null;
    this.isReady = false;
    super.destroy();
  }
}

// Made with Bob
