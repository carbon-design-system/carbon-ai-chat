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
  isOn?: boolean;

  /**
   * Controls whether the unread indicator dot shows even when no human-agent unread count exists.
   */
  showUnreadIndicator?: boolean;

  /**
   * Properties specific to the mobile launcher.
   */
  mobile?: LauncherCallToActionConfig;

  /**
   * Properties specific to the desktop launcher.
   */
  desktop?: LauncherCallToActionConfig;
}

/**
 * @category Config
 */
interface LauncherCallToActionConfig {
  /**
   * If the launcher will expand with a call to action.
   */
  isOn?: boolean;

  /**
   * The title that will be used by the expanded state of the launcher. If nothing is set in the config then a default
   * translated string will be used.
   */
  title?: string;

  /**
   * The amount of time to wait before extending the launcher. If nothing is set then the default time of
   * 15s will be used.
   */
  timeToExpand?: number;

  /**
   * An optional override of the icon shown on the launcher.
   */
  avatarUrlOverride?: string;
}

// The array of timeouts that will dictate the amount of intervals the bounce animation should play for the launcher.
const BOUNCING_ANIMATION_TIMEOUTS = [15000, 60000];

// The amount of time until the entrance animation is automatically triggered for either launcher.
const TIME_TO_ENTRANCE_ANIMATION_START = 15000;

export {
  LauncherConfig,
  LauncherCallToActionConfig,
  BOUNCING_ANIMATION_TIMEOUTS,
  TIME_TO_ENTRANCE_ANIMATION_START,
};
