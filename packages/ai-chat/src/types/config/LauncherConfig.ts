/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Configuration for the launcher.
 *
 * @category Config
 */
interface LauncherConfig {
  /**
   * If the launcher is visible. Defaults to true.
   */
  is_on?: boolean;

  /**
   * Properties specific to the mobile launcher.
   */
  mobile?: LauncherCallToActionConfig;

  /**
   * Properties specific to the desktop launcher.
   */
  desktop?: LauncherCallToActionConfig;
}

interface LauncherInternalConfig extends LauncherConfig {
  /**
   * If the launcher is visible. Defaults to true.
   */
  is_on?: boolean;

  /**
   * Properties specific to the mobile launcher.
   */
  mobile?: LauncherInternalCallToActionConfig;

  /**
   * Properties specific to the desktop launcher.
   */
  desktop?: LauncherInternalCallToActionConfig;
}

/**
 * @category Config
 */
interface LauncherCallToActionConfig {
  /**
   * If the launcher will expand with a call to action.
   */
  is_on?: boolean;

  /**
   * The title that will be used by the expanded state of the launcher. If nothing is set in the config then a default
   * translated string will be used.
   */
  title?: string;

  /**
   * The amount of time to wait before extending the launcher. If nothing is set then the default time of
   * 15s will be used.
   */
  time_to_expand?: number;

  /**
   * @internal
   * An optional override of the icon shown on the launcher. This is ignored if the Carbon AI chat theme is turned on.
   */
  avatar_url_override?: string;
}

/**
 * Internal nterface for controlling the Launcher call to action popup.
 */
interface LauncherInternalCallToActionConfig
  extends LauncherCallToActionConfig {
  /**
   * Whether a new time_to_expand value has been set or not. This only applies to the mobile launcher.
   */
  new_expand_time: boolean;

  /**
   * Define the type of notification that is appearing.
   */
  notification_type: NotificationType;

  /**
   * The amount of time to wait before reducing the extended launcher (This is only relevant to the mobile launcher
   * even though it exists within both configs).
   */
  time_to_reduce?: number;
}

/**
 * In the future we may want different types of notification messages, for example one of them will be a
 * text_notification.
 *
 * @category Config
 */
enum NotificationType {
  TEXT_NOTIFICATION = "text_notification",
}

// The array of timeouts that will dictate the amount of intervals the bounce animation should play for the launcher.
const BOUNCING_ANIMATION_TIMEOUTS = [15000, 60000];

// The amount of time until the entrance animation is automatically triggered for either launcher.
const TIME_TO_ENTRANCE_ANIMATION_START = 15000;

export {
  LauncherConfig,
  LauncherInternalConfig,
  LauncherCallToActionConfig,
  LauncherInternalCallToActionConfig,
  NotificationType,
  BOUNCING_ANIMATION_TIMEOUTS,
  TIME_TO_ENTRANCE_ANIMATION_START,
};
