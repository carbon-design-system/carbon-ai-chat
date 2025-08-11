/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import enLanguagePack from "../../chat/languages/en.json";

export type EnglishLanguagePack = typeof enLanguagePack;

export { enLanguagePack };

/**
 * Constants for the Carbon FileStatus type because they weren't kind enough to include their own enum.
 *
 * @category Instance
 */
export enum FileStatusValue {
  COMPLETE = "complete",
  EDIT = "edit",
  UPLOADING = "uploading",
  SUCCESS = "success",
}

/**
 * An interface that represents a file to upload and its current upload status.
 *
 * @category Instance
 */
export interface FileUpload {
  /**
   * A unique ID for the file.
   */
  id: string;

  /**
   * The file to upload.
   */
  file: File;

  /**
   * The current upload status.
   */
  status: FileStatusValue;

  /**
   * Indicates if the file contains an error or failed to upload.
   */
  isError?: boolean;

  /**
   * If the file failed to upload, this is an optional error message to display.
   */
  errorMessage?: string;
}

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

  /**
   * Whether a tour is visible or not.
   */
  tour: boolean;
}

/**
 * A record of a notification to be shown in the UI.
 *
 * @category Instance
 */
export interface NotificationMessage {
  kind:
    | "error"
    | "info"
    | "info-square"
    | "success"
    | "warning"
    | "warning-alt";

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
 * A language pack represent the set of display strings for a particular language.
 *
 * @category Instance
 */
export type LanguagePack = EnglishLanguagePack;

/**
 * The different views that can be shown by Carbon AI Chat.
 *
 * @category Instance
 */
export enum ViewType {
  /**
   * The launcher view is used to open the main window or tour.
   */
  LAUNCHER = "launcher",

  /**
   * The main window view is used to ask WA questions and converse with an agent, as well as many other things. The
   * string value is kept camel case to align with the viewState mainWindow property.
   */
  MAIN_WINDOW = "mainWindow",

  /**
   * The tour view is used to guide the end user through a task.
   */
  TOUR = "tour",
}

/**
 * The different variations of the launcher that can exist.
 *
 * @category Instance
 */
export enum LauncherType {
  /**
   * The launcher that expands to a "complex" variation on desktop.
   */
  DESKTOP = "desktop",

  /**
   * The launcher that expands to an "extended" variation on mobile.
   */
  MOBILE = "mobile",
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
   * Indicates if the close-and-restart (X) button in the custom panel should be hidden. This value only applies if
   * the close-and-restart button is enabled.
   */
  hideCloseAndRestartButton?: boolean;

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
   * This callback is called when the close-and-restart button is clicked. This is called even if {@link disableDefaultCloseAction}
   * is set to true.
   */
  onClickCloseAndRestart?: () => void;

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
   * Disables the default action that is taken when the close or close-and-restart buttons are clicked. The default
   * action closes Carbon AI Chat and disabling this will cause the button to not do anything. You can override the button
   * behavior by using the {@link onClickClose} or {@link onClickCloseAndRestart} callback.
   */
  disableDefaultCloseAction?: boolean;
}

/**
 * A single menu option.
 *
 * @category Instance
 */
export interface CustomMenuOption {
  /**
   * The text to display for the menu option.
   */
  text: string;

  /**
   * The callback handler to call when the option is selected.
   */
  handler: () => void;
}
