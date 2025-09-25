/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Demo-specific test IDs that are not part of the core @carbon/ai-chat package.
 * These are used for testing the demo application functionality.
 */
export enum DemoPageObjectId {
  /**
   * The programmatic mode active notification.
   */
  PROGRAMMATIC_NOTIFICATION_ACTIVE = "programmatic_notification_active",

  /**
   * The programmatic mode error notification.
   */
  PROGRAMMATIC_NOTIFICATION_ERROR = "programmatic_notification_error",

  /**
   * The configuration sidebar in demo.
   */
  CONFIG_SIDEBAR = "config_sidebar",

  /**
   * The leave programmatic mode button in the sidebar.
   */
  LEAVE_PROGRAMMATIC_MODE_BUTTON = "leave_programmatic_mode_button",
}
