/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Configuration options for media providers
 */
export interface ProviderConfig {
  /**
   * ARIA label for accessibility
   */
  ariaLabel?: string;

  /**
   * Whether to start playing automatically
   */
  playing?: boolean;

  /**
   * Subtitle tracks for native video (not used by iframe providers)
   */
  subtitleTracks?: Array<{
    src: string;
    language: string;
    label: string;
    kind?: "subtitles" | "captions" | "descriptions";
    default?: boolean;
  }>;

  /**
   * Generic error message to display when media fails to load
   */
  errorMessage?: string;

  /**
   * Label suffix for loading state (e.g., "Loading")
   */
  loadingLabel?: string;

  /**
   * Label suffix for ready state (e.g., "Ready")
   */
  readyLabel?: string;

  /**
   * Label suffix for error state (e.g., "Error")
   */
  errorLabel?: string;
}

/**
 * Abstract base class for all media providers.
 * Defines the common interface that all providers must implement.
 */
export abstract class BaseProvider {
  protected container: HTMLElement | null = null;
  protected config: ProviderConfig = {};
  protected readyCallback: (() => void) | null = null;
  protected playCallback: (() => void) | null = null;
  protected pauseCallback: (() => void) | null = null;
  protected errorCallback: ((error: Error) => void) | null = null;

  /**
   * Initialize the provider with a container element and configuration
   *
   * @param container - The HTML element to render the player into
   * @param config - Configuration options for the provider
   */
  async init(container: HTMLElement, config: ProviderConfig): Promise<void> {
    this.container = container;
    this.config = config;
  }

  /**
   * Load a media URL
   *
   * @param url - The URL of the media to load
   */
  abstract load(url: string): Promise<void>;

  /**
   * Start or resume playback
   */
  abstract play(): void;

  /**
   * Pause playback
   */
  abstract pause(): void;

  /**
   * Register a callback for when the player is ready
   *
   * @param callback - Function to call when ready
   */
  onReady(callback: () => void): void {
    this.readyCallback = callback;
  }

  /**
   * Register a callback for when playback starts
   *
   * @param callback - Function to call when playing
   */
  onPlay(callback: () => void): void {
    this.playCallback = callback;
  }

  /**
   * Register a callback for when playback pauses
   *
   * @param callback - Function to call when paused
   */
  onPause(callback: () => void): void {
    this.pauseCallback = callback;
  }

  /**
   * Register a callback for when an error occurs
   *
   * @param callback - Function to call with error
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Update aria attributes on an element based on state.
   * Subclasses should implement this to update iframe/video element attributes.
   *
   * @param element - The element to update
   * @param state - The current state (loading, ready, or error)
   */
  protected abstract updateAriaAttributes(
    element: HTMLElement,
    state: "loading" | "ready" | "error",
  ): void;

  /**
   * Get the appropriate aria-label for a given state
   *
   * @param state - The current state
   * @returns The aria-label string
   */
  protected getStateLabel(state: "loading" | "ready" | "error"): string {
    const baseLabel = this.config.ariaLabel || "Video player";
    const stateLabels = {
      loading: this.config.loadingLabel || "Loading",
      ready: this.config.readyLabel || "Ready",
      error: this.config.errorLabel || "Error",
    };
    return `${baseLabel} - ${stateLabels[state]}`;
  }

  /**
   * Clean up the provider and remove any DOM elements or event listeners
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = "";
      this.container = null;
    }
    this.readyCallback = null;
    this.playCallback = null;
    this.pauseCallback = null;
    this.errorCallback = null;
  }

  /**
   * Trigger the ready callback
   */
  protected triggerReady(): void {
    if (this.readyCallback) {
      this.readyCallback();
    }
  }

  /**
   * Trigger the play callback
   */
  protected triggerPlay(): void {
    if (this.playCallback) {
      this.playCallback();
    }
  }

  /**
   * Trigger the pause callback
   */
  protected triggerPause(): void {
    if (this.pauseCallback) {
      this.pauseCallback();
    }
  }

  /**
   * Trigger the error callback
   *
   * @param error - The error that occurred
   */
  protected triggerError(error: Error): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }
}

// Made with Bob
