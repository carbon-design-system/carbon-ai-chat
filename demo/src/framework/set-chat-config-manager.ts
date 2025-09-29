/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { PublicConfig } from "@carbon/ai-chat";
import { updateQueryParamsWithoutRefresh } from "./utils";
import { customSendMessage } from "../customSendMessage/customSendMessage";

/**
 * Manages setChatConfig mode state and configuration changes.
 *
 * setChatConfig mode is activated when configurations are set via the global
 * `window.setChatConfig()` function. This manager handles the lifecycle of
 * setChatConfig mode including initialization from URL parameters, configuration
 * merging, and state transitions.
 */
export class SetChatConfigManager {
  /** Indicates if the demo is currently in setChatConfig mode */
  private isSetChatConfigMode = false;

  /** Indicates if a setChatConfig configuration has been received via setChatConfig */
  private hasReceivedSetChatConfig = false;

  /** Optional callback to notify when setChatConfig mode state changes */
  private onModeChangeCallback?: (data: SetChatConfigModeState) => void;

  /**
   * Creates a new SetChatConfigManager instance.
   *
   * The optional callback function will be invoked whenever the setChatConfig mode
   * state changes, allowing parent components to react to state changes for UI updates.
   */
  constructor(onModeChange?: (data: SetChatConfigModeState) => void) {
    this.onModeChangeCallback = onModeChange;
    this.initializeFromURL();
  }

  /**
   * Initialize setChatConfig mode state from URL parameters.
   *
   * Checks if the current URL contains `config=setChatConfig` parameter to determine
   * if the demo should start in setChatConfig mode. This handles cases where the
   * page is refreshed while in setChatConfig mode.
   */
  private initializeFromURL(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const configParam = urlParams.get("config");
    this.isSetChatConfigMode = configParam === "setChatConfig";

    // If we're in setChatConfig mode from URL but haven't received config via setChatConfig,
    // it means the page was refreshed - hasReceivedSetChatConfig stays false
  }

  /**
   * Set chat configuration in setChatConfig mode.
   *
   * This method is called when `window.setChatConfig()` is invoked. It merges the new
   * configuration with the existing configuration, updates the setChatConfig mode state,
   * and triggers the necessary side effects.
   */
  async setChatConfig(
    newConfig: Partial<PublicConfig>,
    previousConfig: PublicConfig,
    onConfigChange: (mergedConfig: PublicConfig) => Promise<void>,
  ): Promise<void> {
    // Set setChatConfig mode to true and mark that we've received config
    this.isSetChatConfigMode = true;
    this.hasReceivedSetChatConfig = true;

    // Keep the URL query param aligned with setChatConfig mode for consistency
    updateQueryParamsWithoutRefresh([
      { key: "config", value: "setChatConfig" },
    ]);

    // Notify about setChatConfig mode changes
    this.notifyModeChange();

    // Simple merge - test if the issue is with safe merge logic
    const mergedConfig: PublicConfig = {
      ...previousConfig,
      ...newConfig,
      messaging: {
        ...(previousConfig.messaging || {}),
        ...(newConfig.messaging || {}),
        customSendMessage:
          newConfig.messaging?.customSendMessage ||
          previousConfig.messaging?.customSendMessage ||
          customSendMessage,
      },
    };

    await onConfigChange(mergedConfig);
  }

  /**
   * Exit setChatConfig mode and return to normal demo mode.
   *
   * This method removes all setChatConfig mode URL parameters and performs a full
   * page refresh to reset the demo to its default state. This action cannot be
   * undone without calling setChatConfig again.
   */
  leaveSetChatConfigMode(): void {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete("settings");
    urlParams.delete("config");

    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname;

    // Navigate to the new URL (full refresh)
    window.location.href = newUrl;
  }

  /**
   * Get the current setChatConfig mode state.
   */
  getState(): SetChatConfigModeState {
    return {
      isSetChatConfigMode: this.isSetChatConfigMode,
      hasReceivedSetChatConfig: this.hasReceivedSetChatConfig,
    };
  }

  /**
   * Notify registered callback about setChatConfig mode state changes.
   *
   * This method is called internally when the setChatConfig mode state changes
   * to inform parent components so they can update their UI accordingly.
   */
  private notifyModeChange(): void {
    if (this.onModeChangeCallback) {
      this.onModeChangeCallback({
        isSetChatConfigMode: this.isSetChatConfigMode,
        hasReceivedSetChatConfig: this.hasReceivedSetChatConfig,
      });
    }
  }
}

/**
 * Represents the current state of setChatConfig mode in the demo.
 */
export interface SetChatConfigModeState {
  /** Indicates if the demo is currently in setChatConfig mode */
  isSetChatConfigMode: boolean;

  /** Indicates if a setChatConfig configuration has been received via setChatConfig */
  hasReceivedSetChatConfig: boolean;
}
