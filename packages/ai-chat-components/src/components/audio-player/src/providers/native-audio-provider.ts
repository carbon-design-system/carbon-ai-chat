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
 * Native file player implementation adapted from:
 * https://github.com/cookpete/react-player/blob/v2.15.1/src/players/FilePlayer.js
 */

import { BaseProvider, ProviderConfig } from "./base-provider.js";

/**
 * Provider for native HTML5 audio files
 * Supports: mp3, wav, ogg, m4a, aac, etc.
 */
export class NativeAudioProvider extends BaseProvider {
  private audioElement: HTMLAudioElement | null = null;

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
   * Initialize the provider and create the audio element
   */
  async init(container: HTMLElement, config: ProviderConfig): Promise<void> {
    await super.init(container, config);

    if (!this.container) {
      throw new Error("Container element is required");
    }

    // Create audio element
    this.audioElement = document.createElement("audio");
    this.audioElement.controls = true;
    this.audioElement.setAttribute("controlsList", "nodownload");
    this.audioElement.crossOrigin = "anonymous";

    // Set initial ARIA attributes for loading state
    if (config.ariaLabel) {
      this.updateAriaAttributes(this.audioElement, "loading");
    }

    // Set up event listeners
    this.audioElement.addEventListener("loadedmetadata", () => {
      if (this.audioElement) {
        this.updateAriaAttributes(this.audioElement, "ready");
      }
      this.triggerReady();
    });

    this.audioElement.addEventListener("play", () => {
      this.triggerPlay();
    });

    this.audioElement.addEventListener("pause", () => {
      this.triggerPause();
    });

    this.audioElement.addEventListener("error", () => {
      const error = this.audioElement?.error;

      // Log detailed error information for debugging
      console.error("[NativeAudioProvider] Audio error:", {
        code: error?.code,
        message: error?.message,
        src: this.audioElement?.src,
        networkState: this.audioElement?.networkState,
        readyState: this.audioElement?.readyState,
      });

      if (this.audioElement) {
        this.updateAriaAttributes(this.audioElement, "error");
      }

      // Use the generic error message from config
      this.triggerError(new Error(this.config.errorMessage!));
    });

    // Append to container
    this.container.appendChild(this.audioElement);
  }

  /**
   * Load an audio URL
   */
  async load(url: string): Promise<void> {
    if (!this.audioElement) {
      throw new Error("Audio element not initialized");
    }

    // Try loading with CORS first
    this.audioElement.src = url;
    this.audioElement.load();

    // Auto-play if configured
    if (this.config.playing) {
      try {
        await this.audioElement.play();
      } catch (error) {
        // Auto-play might be blocked by browser
        console.warn("[NativeAudioProvider] Auto-play was prevented:", error);
      }
    }
  }

  /**
   * Start or resume playback
   */
  play(): void {
    if (this.audioElement) {
      this.audioElement.play().catch((error) => {
        console.warn("Play was prevented:", error);
      });
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  /**
   * Clean up the provider
   */
  destroy(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.removeAttribute("src");
      this.audioElement.load();

      // Remove from DOM before calling super.destroy()
      if (this.audioElement.parentElement) {
        this.audioElement.parentElement.removeChild(this.audioElement);
      }

      this.audioElement = null;
    }

    // Call super.destroy() after cleaning up audio element
    super.destroy();
  }
}

// Made with Bob
