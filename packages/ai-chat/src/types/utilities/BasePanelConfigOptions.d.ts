/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Describes general config options for Carbon AI Chat's internal panel components.
 *
 * @category Config
 */
export interface BasePanelConfigOptions {
  /**
   * The panel title which is left blank by default.
   */
  title?: string | null;

  /**
   * Indicates if the close button in the custom panel should be hidden. When {@link hidePanelHeader} is true, the close
   * button is hidden automatically.
   */
  hideCloseButton?: boolean;

  /**
   * Indicates if the panel header should be hidden. Hiding the header removes the default title, close button, and back
   * button from the chrome.
   */
  hidePanelHeader?: boolean;

  /**
   * Indicates if the back button in the custom panel should be hidden. When {@link hidePanelHeader} is true, the back
   * button is hidden automatically.
   */
  hideBackButton?: boolean;

  /**
   * This callback is called when the close button is clicked. This is called even if {@link disableDefaultCloseAction}
   * is set to true.
   */
  onClickClose?: () => void;

  /**
   * Called when the restart button is clicked.
   */
  onClickRestart?: () => void;

  /**
   * This callback is called when the back button is clicked.
   */
  onClickBack?: () => void;
}
