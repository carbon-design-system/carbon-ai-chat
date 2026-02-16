/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";

/**
 * Action item for the chat header toolbar.
 */
export interface ChatHeaderAction {
  /**
   * The text label for the action.
   */
  text: string;

  /**
   * The icon to display for the action.
   */
  icon: CarbonIcon;

  /**
   * Optional size for the action button.
   */
  size?: string;

  /**
   * Whether the action is disabled.
   */
  disabled?: boolean;

  /**
   * Callback function when the action is clicked.
   */
  onClick: () => void;
}

/**
 * @category Config
 */
export interface ChatHeaderConfig {
  /**
   * The chat header title.
   */
  title?: string;

  /**
   * The name displayed after the title.
   */
  name?: string;

  /**
   * Custom action buttons to display in the header toolbar.
   * These actions can overflow into a menu if there isn't enough space.
   * The restart and close/minimize buttons are always added automatically
   * and cannot be customized through this property.
   */
  actions?: ChatHeaderAction[];
}
