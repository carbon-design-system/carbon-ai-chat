/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Describes general config options for a Carbon AI Chat panel. These options are also part of the
 * {@link BasePanelComponentProps}, except the options here are also shared with {@link CustomPanelConfigOptions}.
 *
 * Any options specific to either the BasePanelComponent or CustomPanelConfigOptions should be added to the respective
 * interface.
 *
 * @category Config
 */
export interface BasePanelConfigOptions {
  /**
   * The panel title which is left blank by default.
   */
  title?: string;

  /**
   * Indicates if the close button in the custom panel should be hidden.
   */
  hideCloseButton?: boolean;

  /**
   * Indicates if the panel header should be hidden.
   */
  hidePanelHeader?: boolean;

  /**
   * Indicates if the back button in the custom panel should be hidden.
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
