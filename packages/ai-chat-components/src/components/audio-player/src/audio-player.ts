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
import styles from "./audio-player.scss?lit";

import { detectAudioSource, AudioSource } from "./utils/url-detector.js";
import { BaseProvider } from "./providers/base-provider.js";
import { NativeAudioProvider } from "./providers/native-audio-provider.js";
import { SoundCloudProvider } from "./providers/soundcloud-provider.js";

const LOADING_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Audio player component that supports multiple audio sources
 * @element cds-aichat-audio-player
 * @fires cds-aichat-audio-player-play - Fired when audio starts playing
 * @fires cds-aichat-audio-player-pause - Fired when audio pauses
 * @fires cds-aichat-audio-player-ready - Fired when audio is ready to play
 * @fires cds-aichat-audio-player-error - Fired when an error occurs
 */
@carbonElement(`${prefix}-audio-player`)
class AudioPlayer extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * Audio source URL (required)
   */
  @property({ type: String })
  source = "";

  /**
   * ARIA label for accessibility
   */
  @property({ type: String, attribute: "aria-label" })
  ariaLabel = "";

  /**
   * Whether the audio should be playing
   */
  @property({ type: Boolean })
  playing = false;

  /**
   * Aspect ratio as padding-top percentage (default: 56.25 for visual consistency)
   */
  @property({ type: Number, attribute: "aspect-ratio-percentage" })
  aspectRatioPercentage = 56.25;

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
   * Internal state: error message
   */
  @state()
  private errorMessage = "";

  /**
   * Internal state: ready status
   */
  @state()
  private isReady = false;

  /**
   * Query the provider container element
   */
  @query(".audio-player__provider")
  private providerContainer!: HTMLDivElement;

  private provider: BaseProvider | null = null;
  private loadingTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Create the appropriate provider based on the audio source
   */
  private createProvider(source: string): BaseProvider | null {
    const audioSource = detectAudioSource(source);

    switch (audioSource) {
      case AudioSource.SOUNDCLOUD:
        return new SoundCloudProvider();
      case AudioSource.NATIVE:
        return new NativeAudioProvider();
      default:
        return null;
    }
  }

  /**
   * Initialize and load the audio
   */
  private async loadAudio(): Promise<void> {
    if (!this.source || !this.providerContainer) {
      return;
    }

    // Clean up existing provider
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }

    // Reset state
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = "";
    this.isReady = false;

    // Set loading timeout
    this.loadingTimeout = setTimeout(() => {
      if (this.isLoading) {
        this.handleError(new Error("Audio loading timeout"));
      }
    }, LOADING_TIMEOUT_MS);

    try {
      // Create provider
      this.provider = this.createProvider(this.source);

      if (!this.provider) {
        throw new Error("Unsupported audio source");
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
      });

      // Load audio
      await this.provider.load(this.source);
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error("Unknown error"),
      );
    }
  }

  /**
   * Handle audio ready event
   */
  private handleReady(): void {
    this.isLoading = false;
    this.isReady = true;

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }

    this.dispatchEvent(
      new CustomEvent("cds-aichat-audio-player-ready", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Handle audio play event
   */
  private handlePlay(): void {
    this.dispatchEvent(
      new CustomEvent("cds-aichat-audio-player-play", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Handle audio pause event
   */
  private handlePause(): void {
    this.dispatchEvent(
      new CustomEvent("cds-aichat-audio-player-pause", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Handle error
   */
  private handleError(error: Error): void {
    this.isLoading = false;
    this.hasError = true;
    this.errorMessage = error.message || "Failed to load audio";

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }

    this.dispatchEvent(
      new CustomEvent("cds-aichat-audio-player-error", {
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

    // Load audio on initial render if source is provided
    if (this.source && this.providerContainer) {
      this.loadAudio();
    }
  }

  /**
   * Lifecycle: component updated
   */
  updated(changedProperties: Map<string, any>): void {
    super.updated(changedProperties);

    // Reload audio if source changes
    if (
      changedProperties.has("source") &&
      this.source &&
      this.providerContainer
    ) {
      this.loadAudio();
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
   * Render skeleton loading state
   */
  private renderSkeleton() {
    return html`
      <div class="audio-player__skeleton">
        <div class="audio-player__skeleton-icon">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M25 4v24l-10-6.5L5 28V4h20zm-2 2H7v18.5l8-5.2 8 5.2V6z" />
          </svg>
        </div>
        <div class="audio-player__skeleton-player"></div>
      </div>
    `;
  }

  /**
   * Render error state
   */
  private renderError() {
    return html`
      <div class="audio-player__error">
        <p class="audio-player__error-message">${this.errorMessage}</p>
      </div>
    `;
  }

  /**
   * Render the component
   */
  render() {
    const containerStyle = `padding-top: ${this.aspectRatioPercentage}%`;

    return html`
      <div class="audio-player">
        <div class="audio-player__container" style="${containerStyle}">
          ${this.isLoading ? this.renderSkeleton() : ""}
          ${this.hasError ? this.renderError() : ""}
          <div
            class="audio-player__provider ${this.isLoading || this.hasError
              ? "audio-player__provider--hidden"
              : ""}"
          ></div>
        </div>
      </div>
    `;
  }
}

export default AudioPlayer;

// Made with Bob
