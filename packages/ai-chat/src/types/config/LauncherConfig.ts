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
   * If the launcher will have a call to action expanded state. Defaults to false. This feature will be removed in
   * the next major release of the AI Chat.
   *
   * @deprecated
   */
  isOn?: boolean;

  /**
   * The title that will be used by the expanded state of the launcher. If nothing is set in the config then a default
   * translated string will be used.
   *
   * @deprecated
   */
  title?: string;

  /**
   * The amount of time to wait before extending the launcher. If nothing is set then the default time of
   * 15s will be used.
   *
   * @deprecated
   */
  timeToExpand?: number;

  /**
   * An optional override of the icon shown on the launcher.
   */
  avatarUrlOverride?: string;
}

// The amount of time until the entrance animation is automatically triggered for either launcher.
const TIME_TO_ENTRANCE_ANIMATION_START = 15000;

export {
  LauncherConfig,
  LauncherCallToActionConfig,
  TIME_TO_ENTRANCE_ANIMATION_START,
};
