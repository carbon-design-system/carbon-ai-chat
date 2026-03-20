/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html } from "lit";
import { property, state, query } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import prefix from "../../../globals/settings.js";
import commonStyles from "../../../globals/scss/common.scss?lit";
import styles from "./video-player.scss?lit";

import { detectVideoSource, VideoSource } from "./utils/url-detector.js";
import { BaseProvider } from "./providers/base-provider.js";
import { NativeVideoProvider } from "./providers/native-video-provider.js";
import { YouTubeProvider } from "./providers/youtube-provider.js";
import { VimeoProvider } from "./providers/vimeo-provider.js";
import { KalturaProvider } from "./providers/kaltura-provider.js";

const LOADING_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Video player component that supports multiple video sources
 * @element cds-aichat-video-player
 * @fires cds-aichat-video-player-play - Fired when video starts playing
 * @fires cds-aichat-video-player-pause - Fired when video pauses
 * @fires cds-aichat-video-player-ready - Fired when video is ready to play
 * @fires cds-aichat-video-player-error - Fired when an error occurs
 */
@carbonElement(`${prefix}-video-player`)
class VideoPlayer extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * Video source URL (required)
   */
  @property({ type: String })
  source = "";

  /**
   * ARIA label for accessibility
   */
  @property({ type: String, attribute: "aria-label" })
  ariaLabel = "";

  /**
   * Whether the video should be playing
   */
  @property({ type: Boolean })
  playing = false;

  /**
   * Aspect ratio as padding-top percentage (default: 56.25 for 16:9)
   */
  @property({ type: Number, attribute: "aspect-ratio-percentage" })
  aspectRatioPercentage = 56.25;

  /**
   * Subtitle tracks for native video files
   */
  @property({ type: Array, attribute: "subtitle-tracks" })
  subtitleTracks: Array<{
    src: string;
    language: string;
    label: string;
    kind?: "subtitles" | "captions" | "descriptions";
    default?: boolean;
  }> = [];

  /**
   * Generic error message to display when video fails to load
   */
  @property({ type: String, attribute: "error-message" })
  errorMessage = "Failed to load video";

  /**
   * Status message announced when video starts loading
   */
  @property({ type: String, attribute: "loading-status-message" })
  loadingStatusMessage = "Video player loading";

  /**
   * Status message announced when video is ready
   */
  @property({ type: String, attribute: "ready-status-message" })
  readyStatusMessage = "Video player ready";

  /**
   * Label suffix for loading state (e.g., "Loading")
   */
  @property({ type: String, attribute: "loading-label" })
  loadingLabel = "Loading";

  /**
   * Label suffix for ready state (e.g., "Ready")
   */
  @property({ type: String, attribute: "ready-label" })
  readyLabel = "Ready";

  /**
   * Label suffix for error state (e.g., "Error")
   */
  @property({ type: String, attribute: "error-label" })
  errorLabel = "Error";

  /**
   * Internal state: loading status
   */
  @state()
  private isLoading = true;

  /**
   * Internal state: error status
   */
  @state()
  private hasError = false;

  /**
   * Internal state: ready status
   */
  @state()
  private isReady = false;

  /**
   * Internal state: current status message for screen readers
   */
  @state()
  private statusMessage = "";

  /**
   * Query the provider container element
   */
  @query(".video-player__provider")
  private providerContainer!: HTMLDivElement;

  private provider: BaseProvider | null = null;
  private loadingTimeout: ReturnType<typeof setTimeout> | null = null;
  private isLoadingVideo = false;

  /**
   * Create the appropriate provider based on the video source
   */
  private createProvider(source: string): BaseProvider | null {
    const videoSource = detectVideoSource(source);

    switch (videoSource) {
      case VideoSource.YOUTUBE:
        return new YouTubeProvider();
      case VideoSource.VIMEO:
        return new VimeoProvider();
      case VideoSource.KALTURA:
        return new KalturaProvider();
      case VideoSource.NATIVE:
        return new NativeVideoProvider();
      default:
        return null;
    }
  }

  /**
   * Initialize and load the video
   */
  private async loadVideo(): Promise<void> {
    if (!this.source || !this.providerContainer) {
      return;
    }

    // Prevent concurrent loads
    if (this.isLoadingVideo) {
      return;
    }

    this.isLoadingVideo = true;

    try {
      // Clean up existing provider
      if (this.provider) {
        this.provider.destroy();
        this.provider = null;
      }

      // Reset state
      this.isLoading = true;
      this.hasError = false;
      this.isReady = false;
      this.statusMessage = this.loadingStatusMessage;

      // Set loading timeout
      this.loadingTimeout = setTimeout(() => {
        if (this.isLoading) {
          this.handleError(new Error("Video loading timeout"));
        }
      }, LOADING_TIMEOUT_MS);

      // Create provider
      this.provider = this.createProvider(this.source);

      if (!this.provider) {
        throw new Error("Unsupported video source");
      }

      // Set up event handlers
      this.provider.onReady(() => {
        this.handleReady();
      });

      this.provider.onPlay(() => {
        this.handlePlay();
      });

      this.provider.onPause(() => {
        this.handlePause();
      });

      this.provider.onError((error) => {
        this.handleError(error);
      });

      // Initialize provider
      await this.provider.init(this.providerContainer, {
        ariaLabel: this.ariaLabel,
        playing: this.playing,
        subtitleTracks: this.subtitleTracks,
        errorMessage: this.errorMessage,
        loadingLabel: this.loadingLabel,
        readyLabel: this.readyLabel,
        errorLabel: this.errorLabel,
      });

      // Load video
      await this.provider.load(this.source);
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error("Unknown error"),
      );
    } finally {
      this.isLoadingVideo = false;
    }
  }

  /**
   * Handle video ready event
   */
  private handleReady(): void {
    this.isLoading = false;
    this.isReady = true;
    this.statusMessage = this.readyStatusMessage;

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }

    this.dispatchEvent(
      new CustomEvent("cds-aichat-video-player-ready", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Handle video play event
   */
  private handlePlay(): void {
    this.dispatchEvent(
      new CustomEvent("cds-aichat-video-player-play", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Handle video pause event
   */
  private handlePause(): void {
    this.dispatchEvent(
      new CustomEvent("cds-aichat-video-player-pause", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Handle error
   */
  private handleError(_error: Error): void {
    this.isLoading = false;
    this.hasError = true;
    this.statusMessage = ""; // Clear to avoid duplicate announcements with error div

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }

    // Always use the generic error message, regardless of the actual error
    this.dispatchEvent(
      new CustomEvent("cds-aichat-video-player-error", {
        bubbles: true,
        composed: true,
        detail: { message: this.errorMessage },
      }),
    );
  }

  /**
   * Lifecycle: component connected
   */
  connectedCallback(): void {
    super.connectedCallback();
  }

  /**
   * Lifecycle: first update complete
   */
  async firstUpdated(): Promise<void> {
    // Wait for the DOM to be fully updated
    await this.updateComplete;

    // Load video on initial render if source is provided
    if (this.source && this.providerContainer) {
      this.loadVideo();
    }
  }

  /**
   * Lifecycle: component updated
   */
  updated(changedProperties: Map<string, any>): void {
    super.updated(changedProperties);

    // Reload video if source changes (but not on first update, which is handled by firstUpdated)
    if (
      changedProperties.has("source") &&
      this.source &&
      this.providerContainer &&
      !this.hasUpdated // Prevent duplicate load on first render
    ) {
      this.loadVideo();
    }

    // Handle play/pause changes
    if (changedProperties.has("playing") && this.provider && this.isReady) {
      if (this.playing) {
        this.provider.play();
      } else {
        this.provider.pause();
      }
    }
  }

  /**
   * Lifecycle: component disconnected
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }

    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
  }

  /**
   * Render error state
   */
  private renderError() {
    return html`
      <div class="video-player__error" role="alert" aria-live="assertive">
        <p class="video-player__error-message">${this.errorMessage}</p>
      </div>
    `;
  }

  /**
   * Render the component
   */
  render() {
    const containerStyle = `padding-top: ${this.aspectRatioPercentage}%`;

    return html`
      <div class="video-player">
        ${this.statusMessage
          ? html`
              <div
                class="video-player__status"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                ${this.statusMessage}
              </div>
            `
          : ""}
        <div class="video-player__container" style="${containerStyle}">
          ${this.hasError ? this.renderError() : ""}
          <div
            class="video-player__provider ${this.hasError
              ? "video-player__provider--hidden"
              : ""} ${this.isReady ? "video-player__provider--ready" : ""}"
          ></div>
        </div>
      </div>
    `;
  }
}

export default VideoPlayer;

// Made with Bob
