/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { PublicConfig } from '../config/PublicConfig';
import { HeaderConfig } from '../config/HeaderConfig';
import { LayoutConfig } from '../config/LayoutConfig';
import { ThemeState } from './ThemeState';
import ObjectMap from '../utilities/ObjectMap';
import { LauncherConfig } from '../config/LauncherConfig';
import { ChatShortcutConfig } from '../config/ShortcutConfig';

/**
 * The prebuilt chat's `config` slice: the host's whole public config. The
 * conversation reads it as `ConversationAppConfig`. Internal.
 */
interface AppConfig {
  /**
   * The original set of public configuration data provided by the user.
   */
  public: PublicConfig;
}

/**
 * Values the prebuilt chat computes from its public config. They live in its
 * view partition, under `view.derivedConfig`, and are rebuilt whenever the
 * public config changes. Internal.
 */
interface DerivedConfig {
  /**
   * CSS variable overrides computed from theme configuration and white-label settings.
   */
  cssVariableOverrides: ObjectMap<string>;

  /**
   * Complete theme state with defaults applied and corners computed based on layout/device.
   */
  themeWithDefaults: ThemeState;

  /**
   * Passed header merged with defaults.
   */
  header: HeaderConfig;

  /**
   * Passed layout merged with defaults.
   */
  layout: LayoutConfig;

  /**
   * Passed launcher config merged with defaults.
   */
  launcher: LauncherConfig;

  /**
   * Passed keyboard shortcuts merged with defaults, field by field. The single source of
   * truth for whether a shortcut is active — every consumer reads the resolved value from
   * here rather than defaulting the raw public config itself.
   */
  keyboardShortcuts: {
    messageFocusToggle: Required<ChatShortcutConfig>;
  };
}

export { AppConfig, DerivedConfig };
