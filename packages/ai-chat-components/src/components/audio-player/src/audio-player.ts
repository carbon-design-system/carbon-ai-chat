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
   * Generic error message to display when audio fails to load
   */
  @property({ type: String, attribute: "error-message" })
  errorMessage = "Failed to load audio";

  /**
   * Status message announced when audio starts loading
   */
  @property({ type: String, attribute: "loading-status-message" })
  loadingStatusMessage = "Audio player loading";

  /**
   * Status message announced when audio is ready
   */
  @property({ type: String, attribute: "ready-status-message" })
  readyStatusMessage = "Audio player ready";

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
   * Internal state: current audio source type
   */
  @state()
  private audioSourceType: AudioSource | null = null;

  /**
   * Internal state: current status message for screen readers
   */
  @state()
  private statusMessage = "";

  /**
   * Query the provider container element
   */
  @query(".audio-player__provider")
  private providerContainer!: HTMLDivElement;

  private provider: BaseProvider | null = null;
  private loadingTimeout: ReturnType<typeof setTimeout> | null = null;
  private isLoadingAudio = false;

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

    // Prevent concurrent loads
    if (this.isLoadingAudio) {
      return;
    }

    this.isLoadingAudio = true;

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
          this.handleError(new Error("Audio loading timeout"));
        }
      }, LOADING_TIMEOUT_MS);

      // Detect and store audio source type
      this.audioSourceType = detectAudioSource(this.source);

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
        errorMessage: this.errorMessage,
        loadingLabel: this.loadingLabel,
        readyLabel: this.readyLabel,
        errorLabel: this.errorLabel,
      });

      // Load audio
      await this.provider.load(this.source);
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error("Unknown error"),
      );
    } finally {
      this.isLoadingAudio = false;
    }
  }

  /**
   * Handle audio ready event
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

    // Reload audio if source changes (but not on first update, which is handled by firstUpdated)
    if (
      changedProperties.has("source") &&
      this.source &&
      this.providerContainer &&
      !this.hasUpdated // Prevent duplicate load on first render
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
   * Render error state
   */
  private renderError() {
    return html`
      <div class="audio-player__error" role="alert" aria-live="assertive">
        <p class="audio-player__error-message">${this.errorMessage}</p>
      </div>
    `;
  }

  /**
   * Render the component
   */
  render() {
    const isSoundCloud = this.audioSourceType === AudioSource.SOUNDCLOUD;
    const containerClass = `audio-player__container ${isSoundCloud ? "audio-player__container--soundcloud" : ""}`;

    return html`
      <div class="audio-player">
        ${this.statusMessage
          ? html`
              <div
                class="audio-player__status"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                ${this.statusMessage}
              </div>
            `
          : ""}
        <div class="${containerClass}">
          ${this.hasError ? this.renderError() : ""}
          <div
            class="audio-player__provider ${this.hasError
              ? "audio-player__provider--hidden"
              : ""} ${this.isReady ? "audio-player__provider--ready" : ""}"
          ></div>
        </div>
      </div>
    `;
  }
}

export default AudioPlayer;

// Made with Bob
