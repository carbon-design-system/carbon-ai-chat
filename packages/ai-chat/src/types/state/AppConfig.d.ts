/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  LanguagePack,
  LayoutConfig,
  PublicConfig,
} from "../config/PublicConfig";
import { ThemeState } from "./AppState";
import ObjectMap from "../utilities/ObjectMap";
import { LauncherConfig } from "../config/LauncherConfig";

/**
 * This contains the top level interface that defines the configuration options for the application.
 * It includes both the original public config and computed/derived values that depend on that config.
 */

interface AppConfig {
  /**
   * The original set of public configuration data provided by the user.
   */
  public: PublicConfig;

  /**
   * Values computed/derived from the public config. These are recalculated whenever the public config changes.
   * Storing them here avoids recomputing expensive operations and provides a single source of truth.
   */
  derived: {
    /**
     * CSS variable overrides computed from theme configuration and white-label settings.
     */
    cssVariableOverrides: ObjectMap<string>;

    /**
     * Complete theme state with defaults applied and corners computed based on layout/device.
     */
    themeWithDefaults: ThemeState;

    /**
     * Passed strings merged with defaults.
     */
    languagePack: LanguagePack;

    /**
     * Passed layout merged with defaults.
     */
    layout: LayoutConfig;

    /**
     * Passed launcher config merged with defaults.
     */
    launcher: LauncherConfig;
  };
}

export { AppConfig };
