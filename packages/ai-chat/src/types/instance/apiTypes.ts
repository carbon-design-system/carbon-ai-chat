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
 * Describes the different panel types that Carbon AI Chat supports.
 *
 * @category Instance
 */
export enum PanelType {
  /**
   * Opens the panel so that it overlays the main chat content.
   */
  DEFAULT = "default",
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
  getPanel: (panel?: PanelType) => CustomPanelInstance;
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
  open: (options?: CustomPanelOpenOptions) => void;

  /**
   * Closes the custom panel.
   */
  close: () => void;
}

/**
 * Describes general config options for Carbon AI Chat's internal panel components. This interface is used by legacy
 * panels rendered inside the product.
 *
 * @category Instance
 */
export interface BasePanelConfigOptions {
  /**
   * The panel title which is left blank by default.
   */
  title?: string | null;

  /**
   * Indicates if the close button in the panel should be hidden. When {@link hidePanelHeader} is true, the close button
   * is hidden automatically.
   */
  hideCloseButton?: boolean;

  /**
   * Indicates if the panel header should be hidden. Hiding the header removes the default title, close button, and back
   * button from the chrome.
   */
  hidePanelHeader?: boolean;

  /**
   * Indicates if the back button in the panel should be hidden. When {@link hidePanelHeader} is true, the back button is
   * hidden automatically.
   */
  hideBackButton?: boolean;

  /**
   * This callback is called when the close button is clicked.
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
 * Options that change how the custom panel looks. When a header is shown, it inherits styling and behavior from the
 * configured {@link HeaderConfig} (title, assistant name, AI slug, minimize button style, overflow menu, etc.) unless
 * explicitly overridden below.
 *
 * @category Instance
 *
 * @deprecated Use {@link DefaultCustomPanelConfigOptions} for default panels.
 *
 */
export interface CustomPanelConfigOptions {
  /**
   * The panel title displayed in the custom panel header. Left blank by default which causes the configured chat header
   * title/name to be shown instead. When a back button is visible the inherited header stays on screen above the panel
   * so this title acts like a breadcrumb; when the back button is hidden, the header fills the panel chrome and this
   * title becomes the primary heading within the overlay.
   */
  title?: string;

  /**
   * Indicates if the close/minimize button in the custom panel should be hidden.
   */
  hideCloseButton?: boolean;

  /**
   * Indicates if the panel header should be hidden. Hiding the header removes the inherited title, AI slug, minimize
   * button, and back button chrome entirely. Leave this undefined to animate the panel in with the standard header; set
   * it to true when you need a chrome-free experience (for example, when the panel content provides its own close
   * controls or you want the panel to cover the chat header without animating the header into view).
   */
  hidePanelHeader?: boolean;

  /**
   * Indicates if the back button in the custom panel should be hidden. When {@link hidePanelHeader} is true, the back
   * button is hidden automatically. When the back button is visible the panel opens beneath the chat header so users
   * can always access the assistant-level header controls while the panel is active.
   */
  hideBackButton?: boolean;

  /**
   * Called when the header's close/minimize button is clicked. By default Carbon AI Chat will run its normal close
   * behavior (which collapses the experience) before this callback fires; set {@link disableDefaultCloseAction} to true
   * if you plan to intercept the event and manage closing yourself. The callback still fires even when the default
   * action is disabled.
   */
  onClickClose?: () => void;

  /**
   * Called when the restart button in the header is clicked. Use this to trigger a conversation reset or your own
   * telemetry when the restart control is surfaced.
   */
  onClickRestart?: () => void;

  /**
   * Called after the header's back button is clicked. The panel automatically closes before this callback is invoked,
   * so you can safely run follow-up logic or analytics once the panel has been dismissed.
   */
  onClickBack?: () => void;

  /**
   * Determines if the panel open/close animation should be turned off.
   */
  disableAnimation?: boolean;

  /**
   * Disables the default action that is taken when the close button is clicked. Normally clicking the close/minimize
   * button will run Carbon AI Chat's standard close routine (after verifying no view change is in progress). Set this
   * to true when you want to keep the experience open or handle closing asynchronously; you'll need to perform the
   * desired close work inside {@link onClickClose}.
   */
  disableDefaultCloseAction?: boolean;
}

/**
 * Options supported by the default custom panel implementation.
 *
 * When {@link hideBackButton} is set to true, any {@link title} value defined here will override the title/name in
 * the main chat header.
 */
export interface DefaultCustomPanelConfigOptions {
  /**
   * The panel title displayed in the custom panel header. When a back button is visible the inherited header remains
   * on screen above the panel so this title acts like a breadcrumb; when the back button is hidden, the header fills
   * the panel chrome and this title becomes the primary heading within the overlay.
   */
  title?: string;

  /**
   * Determines if the panel open/close animation should be turned off. By default, the panel will animate up from the
   * bottom of the chat window.
   */
  disableAnimation?: boolean;

  /**
   * Indicates if the back button in the custom panel should be hidden.
   */
  hideBackButton?: boolean;
}

/**
 * Options accepted by {@link CustomPanelInstance.open}. Legacy consumers may continue to pass
 * {@link CustomPanelConfigOptions} until the next major release.
 */
export type CustomPanelOpenOptions =
  | CustomPanelConfigOptions
  | DefaultCustomPanelConfigOptions;
