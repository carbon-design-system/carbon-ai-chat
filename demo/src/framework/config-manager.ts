/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { PublicConfig, ChatInstance } from "@carbon/ai-chat";
import isEqual from "lodash-es/isEqual";
import type { Settings } from "./types";
import { updateQueryParamsWithoutRefresh } from "./utils";
import { customSendMessage } from "../customSendMessage/customSendMessage";

/**
 * Manages configuration changes and their side effects.
 *
 * This manager handles the complex process of applying configuration changes
 * including proper object merging, URL parameter updates, React app re-rendering,
 * and chat session restarts when necessary.
 */
export class ConfigManager {
  /**
   * Process configuration changes with proper merging and side effects.
   *
   * This method performs a complete configuration update cycle including merging
   * old and new configurations, updating URL parameters for persistence, triggering
   * React re-renders, and restarting the chat session when certain critical
   * properties like homescreen or disclaimer are modified.
   */
  async processConfigChange(
    newConfig: PublicConfig,
    oldConfig: PublicConfig,
    settings: Settings,
    chatInstance: ChatInstance | null,
    options: {
      triggerSetChatConfigMode: boolean;
      onReactRender?: (config: PublicConfig) => Promise<void>;
    },
  ): Promise<PublicConfig> {
    // Simple merge - testing if the issue is with safe merge logic
    const config: PublicConfig = {
      ...oldConfig,
      ...newConfig,
      messaging: {
        ...(oldConfig.messaging || {}),
        ...(newConfig.messaging || {}),
        customSendMessage:
          newConfig.messaging?.customSendMessage ||
          oldConfig.messaging?.customSendMessage ||
          customSendMessage,
      },
    };

    // Explicitly remove top-level sections that were set back to default (undefined)
    if (
      Object.prototype.hasOwnProperty.call(newConfig, "input") &&
      !newConfig.input
    ) {
      delete config.input;
    }

    if (
      Object.prototype.hasOwnProperty.call(newConfig, "launcher") &&
      !newConfig.launcher
    ) {
      delete config.launcher;
    }

    // Check for changes that require session restart
    const homescreenChanged = !isEqual(
      oldConfig.homescreen,
      newConfig.homescreen,
    );
    const disclaimerChanged = !isEqual(
      oldConfig.disclaimer,
      newConfig.disclaimer,
    );

    // Update query parameters for persistence
    await this.updateQueryParameters(
      config,
      settings,
      options.triggerSetChatConfigMode,
    );

    // Re-render React app if needed
    if (settings.framework === "react" && options.onReactRender) {
      await options.onReactRender(config);
    }

    // Restart session if homescreen or disclaimer changed
    if ((homescreenChanged || disclaimerChanged) && chatInstance) {
      await this.restartChatSession(chatInstance);
    }

    return config;
  }

  /**
   * Update query parameters with configuration data.
   *
   * Serializes the current configuration and settings to URL query parameters
   * for persistence across page refreshes. Removes the customSendMessage function
   * during serialization since functions cannot be JSON stringified.
   */
  private async updateQueryParameters(
    config: PublicConfig,
    settings: Settings,
    triggerSetChatConfigMode: boolean,
  ): Promise<void> {
    // Don't update query params when NOT triggering setChatConfig mode
    // This means we're in setChatConfig mode and SetChatConfigManager should handle query params
    if (!triggerSetChatConfigMode) {
      return;
    }

    // Create config copy without non-serializable functions (functions cannot be JSON stringified)
    const configForSerialization: PublicConfig = {
      ...config,
      messaging: config.messaging
        ? {
            ...config.messaging,
            customSendMessage: undefined,
          }
        : undefined,
      // Strip onFileUpload (function) so it doesn't appear as "[object Object]" in the URL.
      // It will be re-injected by getSettings() on page load when upload.is_on === true.
      upload: config.upload
        ? {
            ...config.upload,
            onFileUpload: undefined,
          }
        : undefined,
    };

    const queryUpdates = [
      { key: "settings", value: JSON.stringify(settings) },
      { key: "config", value: JSON.stringify(configForSerialization) },
    ];

    // Update query params without refresh (setChatConfig mode doesn't refresh)
    updateQueryParamsWithoutRefresh(queryUpdates);
  }

  /**
   * Restart chat session when significant config changes occur.
   *
   * Some configuration changes like homescreen or disclaimer modifications require
   * a complete chat session restart to take effect properly. This method handles
   * the destruction and restart process.
   */
  private async restartChatSession(chatInstance: ChatInstance): Promise<void> {
    // Brief delay to ensure config changes are applied
    await new Promise((resolve) => setTimeout(resolve, 100));
    await chatInstance.destroySession(true);
    await chatInstance.messaging?.restartConversation?.();
  }
}
