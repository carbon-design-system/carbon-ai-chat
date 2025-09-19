/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { NOTIFICATION_KIND } from "@carbon/web-components/es/components/notification/defs.js";

/**
 * Whether a particular Carbon AI Chat view is visible or not.
 *
 * @category Instance
 */
export interface ViewState {
  /**
   * Whether the launcher is visible or not.
   */
  launcher: boolean;

  /**
   * Whether the main window is visible or not.
   */
  mainWindow: boolean;
}

/**
 * A record of a notification to be shown in the UI.
 *
 * @experimental
 * @category Instance
 */
export interface NotificationMessage {
  kind: NOTIFICATION_KIND;

  /**
   * The title to show in the message.
   */
  title: string;

  /**
   * The message to show.
   */
  message: string;

  /**
   * An optional action button that a user can click. If there is an action button, we will not auto dismiss.
   */
  actionButtonLabel?: string;

  /**
   * The group id that associates notifications together. This can be used to remove the notification later.
   */
  groupID?: string;

  /**
   * The callback called when someone clicks on the action button.
   */
  onActionButtonClick?: () => void;

  /**
   * The callback called when someone clicks on the close button.
   */
  onCloseButtonClick?: () => void;
}

/**
 * @category Instance
 * @experimental
 */
export interface NotificationStateObject {
  /**
   * The id of the notification object in state to help identify notifications to manipulate.
   */
  id: string;

  /**
   * The provided notification message to render in chat.
   */
  notification: NotificationMessage;
}

/**
 * The different views that can be shown by Carbon AI Chat.
 *
 * @category Instance
 */
export enum ViewType {
  /**
   * The launcher view is used to open the main window.
   */
  LAUNCHER = "launcher",

  /**
   * The main window view is used to ask WA questions and converse with an agent, as well as many other things. The
   * string value is kept camel case to align with the viewState mainWindow property.
   */
  MAIN_WINDOW = "mainWindow",
}

/**
 * This manager handles fetching an instance for manipulating the custom panel.
 *
 * @category Instance
 */
export interface CustomPanels {
  /**
   * Gets a custom panel instance.
   */
  getPanel: () => CustomPanelInstance;
}

/**
 * The custom panel instance for controlling and manipulating a custom panel in Carbon AI Chat.
 *
 * @category Instance
 */
export interface CustomPanelInstance {
  /**
   * The custom panel hostElement.
   */
  hostElement?: HTMLDivElement | undefined;

  /**
   * Opens the custom panel.
   *
   * @param options Custom panel options.
   */
  open: (options?: CustomPanelConfigOptions) => void;

  /**
   * Closes the custom panel.
   */
  close: () => void;
}

/**
 * Describes general config options for a Carbon AI Chat panel. These options are also part of the
 * {@link BasePanelComponentProps}, except the options here are also shared with {@link CustomPanelConfigOptions}.
 *
 * Any options specific to either the BasePanelComponent or CustomPanelConfigOptions should be added to the respective
 * interface.
 *
 * @category Instance
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

/**
 * Options that change how the custom panel looks.
 *
 * @category Instance
 */
export interface CustomPanelConfigOptions extends BasePanelConfigOptions {
  /**
   * Determines if the panel open/close animation should be turned off.
   */
  disableAnimation?: boolean;

  /**
   * Disables the default action that is taken when the close button is clicked. The default
   * action closes Carbon AI Chat and disabling this will cause the button to not do anything. You can override the button
   * behavior by using the {@link onClickClose} callback.
   */
  disableDefaultCloseAction?: boolean;
}
