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
 * YouTube player implementation adapted from:
 * https://github.com/cookpete/react-player/blob/v2.15.1/src/players/YouTube.js
 */

import { BaseProvider, ProviderConfig } from "./base-provider.js";
import { ScriptLoader } from "../../../shared/media-utils/script-loader.js";

const SDK_URL = "https://www.youtube.com/iframe_api";
const MATCH_URL_YOUTUBE =
  /(?:youtu\.be\/|youtube(?:-nocookie|education)?\.com\/(?:embed\/|v\/|watch\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))((\w|-){11})/;

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

/**
 * Provider for YouTube videos using the YouTube IFrame API
 */
export class YouTubeProvider extends BaseProvider {
  private player: any = null;
  private playerContainer: HTMLDivElement | null = null;
  private isReady = false;

  /**
   * Extract video ID from YouTube URL
   */
  private getVideoId(url: string): string | null {
    const match = url.match(MATCH_URL_YOUTUBE);
    return match ? match[1] : null;
  }

  /**
   * Initialize the provider and load YouTube IFrame API
   */
  async init(container: HTMLElement, config: ProviderConfig): Promise<void> {
    await super.init(container, config);

    if (!this.container) {
      throw new Error("Container element is required");
    }

    // Create container for YouTube player
    this.playerContainer = document.createElement("div");
    this.playerContainer.style.width = "100%";
    this.playerContainer.style.height = "100%";
    this.playerContainer.style.position = "absolute";
    this.playerContainer.style.top = "0";
    this.playerContainer.style.left = "0";
    this.container.appendChild(this.playerContainer);

    // Load YouTube IFrame API
    await this.loadYouTubeAPI();
  }

  /**
   * Load the YouTube IFrame API script
   */
  private async loadYouTubeAPI(): Promise<void> {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      return Promise.resolve();
    }

    // Set up ready callback
    return new Promise((resolve, reject) => {
      const originalCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (originalCallback) {
          originalCallback();
        }
        resolve();
      };

      // Load the script
      ScriptLoader.load(SDK_URL).catch((error) => {
        reject(error);
      });
    });
  }

  /**
   * Load a YouTube video URL
   */
  async load(url: string): Promise<void> {
    const videoId = this.getVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    if (!this.playerContainer) {
      throw new Error("Player container not initialized");
    }

    // Wait for API to be ready
    if (!window.YT || !window.YT.Player) {
      await this.loadYouTubeAPI();
    }

    // Create or update player
    if (this.isReady && this.player) {
      // Player already exists, just load new video
      this.player.loadVideoById(videoId);
    } else {
      // Create new player
      this.player = new window.YT.Player(this.playerContainer, {
        width: "100%",
        height: "100%",
        videoId: videoId,
        playerVars: {
          autoplay: this.config.playing ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            this.isReady = true;
            this.triggerReady();
          },
          onStateChange: (event: any) => {
            this.handleStateChange(event);
          },
          onError: (event: any) => {
            this.handleError(event);
          },
        },
      });
    }
  }

  /**
   * Handle YouTube player state changes
   */
  private handleStateChange(event: any): void {
    const { YT } = window;
    if (!YT) {
      return;
    }

    switch (event.data) {
      case YT.PlayerState.PLAYING:
        this.triggerPlay();
        break;
      case YT.PlayerState.PAUSED:
        this.triggerPause();
        break;
      case YT.PlayerState.ENDED:
        this.triggerPause();
        break;
    }
  }

  /**
   * Handle YouTube player errors
   */
  private handleError(event: any): void {
    const errorMessages: { [key: number]: string } = {
      2: "Invalid video ID",
      5: "HTML5 player error",
      100: "Video not found or private",
      101: "Video not allowed to be played in embedded players",
      150: "Video not allowed to be played in embedded players",
    };

    const message = errorMessages[event.data] || `YouTube error: ${event.data}`;
    this.triggerError(new Error(message));
  }

  /**
   * Start or resume playback
   */
  play(): void {
    if (this.player && this.isReady) {
      this.player.playVideo();
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.player && this.isReady) {
      this.player.pauseVideo();
    }
  }

  /**
   * Clean up the provider
   */
  destroy(): void {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    this.playerContainer = null;
    this.isReady = false;
    super.destroy();
  }
}

// Made with Bob
