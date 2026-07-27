/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Configuration for the history panel of the chat.
 *
 * @category Config
 */
export interface HistoryConfig {
  /**
   * Indicates if the history panel should be shown.
   */
  isOn?: boolean;

  /**
   * Controls whether the mobile menu options (New chat, View chats) should be shown
   * in the header when the history panel is in mobile mode.
   *
   * When true (default), the mobile menu will appear in the header on small screens,
   * providing quick access to start a new chat or view chat history.
   *
   * When false, the mobile menu will be hidden even when in mobile mode.
   *
   * @default true
   */
  showMobileMenu?: boolean;

  /**
   * Controls whether history starts closed and enables state preservation across mode changes.
   *
   * When false (default):
   * - Desktop starts open, mobile starts closed
   * - Resizing between modes resets to default state
   *
   * When true:
   * - Both desktop and mobile start closed
   * - User's open/closed state is preserved when resizing between modes
   * - Enables external control via: instance.customPanels.getPanel(PanelType.HISTORY).open()/close()
   *
   * @default false
   */
  startClosed?: boolean;
}
