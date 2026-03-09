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
 * Provider for native HTML5 video files
 * Supports: mp4, webm, ogv, mov, m4v, m3u8 (HLS), mpd (DASH)
 */
export class NativeVideoProvider extends BaseProvider {
  private videoElement: HTMLVideoElement | null = null;

  /**
   * Initialize the provider and create the video element
   */
  async init(container: HTMLElement, config: ProviderConfig): Promise<void> {
    await super.init(container, config);

    if (!this.container) {
      throw new Error("Container element is required");
    }

    // Create video element
    this.videoElement = document.createElement("video");
    this.videoElement.controls = true;
    this.videoElement.setAttribute("controlsList", "nodownload");
    this.videoElement.playsInline = true;
    this.videoElement.crossOrigin = "anonymous";
    this.videoElement.style.width = "100%";
    this.videoElement.style.height = "100%";
    this.videoElement.style.position = "absolute";
    this.videoElement.style.top = "0";
    this.videoElement.style.left = "0";

    // Set ARIA label
    if (config.ariaLabel) {
      this.videoElement.setAttribute("aria-label", config.ariaLabel);
    }

    // Add subtitle tracks if provided
    if (config.subtitleTracks && config.subtitleTracks.length > 0) {
      config.subtitleTracks.forEach((track) => {
        const trackElement = document.createElement("track");
        trackElement.kind = track.kind || "subtitles";
        trackElement.src = track.src;
        trackElement.srclang = track.language;
        trackElement.label = track.label;
        if (track.default) {
          trackElement.default = true;
        }
        this.videoElement!.appendChild(trackElement);
      });
    }

    // Set up event listeners
    this.videoElement.addEventListener("loadedmetadata", () => {
      this.triggerReady();
    });

    this.videoElement.addEventListener("play", () => {
      this.triggerPlay();
    });

    this.videoElement.addEventListener("pause", () => {
      this.triggerPause();
    });

    this.videoElement.addEventListener("error", () => {
      const error = this.videoElement?.error;
      const message = error
        ? `Video error: ${error.message} (code: ${error.code})`
        : "Unknown video error";
      this.triggerError(new Error(message));
    });

    // Append to container
    this.container.appendChild(this.videoElement);
  }

  /**
   * Load a video URL
   */
  async load(url: string): Promise<void> {
    if (!this.videoElement) {
      throw new Error("Video element not initialized");
    }

    this.videoElement.src = url;
    this.videoElement.load();

    // Auto-play if configured
    if (this.config.playing) {
      try {
        await this.videoElement.play();
      } catch (error) {
        // Auto-play might be blocked by browser
        console.warn("Auto-play was prevented:", error);
      }
    }
  }

  /**
   * Start or resume playback
   */
  play(): void {
    if (this.videoElement) {
      this.videoElement.play().catch((error) => {
        console.warn("Play was prevented:", error);
      });
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.videoElement) {
      this.videoElement.pause();
    }
  }

  /**
   * Clean up the provider
   */
  destroy(): void {
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.removeAttribute("src");
      this.videoElement.load();
      this.videoElement = null;
    }
    super.destroy();
  }
}

// Made with Bob
