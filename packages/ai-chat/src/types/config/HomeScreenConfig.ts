/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A conversation starter button on the home screen. Currently, only label is provided by tooling.
 *
 * @category Config
 */
interface HomeScreenStarterButton {
  /**
   * The display label of the button. This is also the value that is sent as the user's utterance to the assistant
   * when the button is clicked.
   */
  label: string;

  /**
   * Indicates if the button was previously clicked and should be displayed as selected.
   */
  isSelected?: boolean;
}

/**
 * Starter buttons that appear on home screen.
 *
 * @category Config
 */
interface HomeScreenStarterButtons {
  isOn?: boolean;
  buttons?: HomeScreenStarterButton[];
}

/**
 * Configuration for the optional home screen that appears before the assistant chat window.
 *
 * @category Config
 */
interface HomeScreenConfig {
  /**
   * If the home page is turned on via config or remote config.
   */
  isOn?: boolean;

  /**
   * The greeting to show to the user to prompt them to start a conversation.
   */
  greeting?: string;

  /**
   * Optional conversation starter utterances that are displayed as buttons.
   */
  starters?: HomeScreenStarterButtons;

  /**
   * Do not show the greeting or starters.
   */
  customContentOnly?: boolean;

  /**
   * Defaults to false. If enabled, a user can not navigate back to the home screen after they have sent a message to the
   * assistant. If false, the home screen is navigatable after an initial message is sent.
   */
  disableReturn?: boolean;
}

/**
 * Current state of home screen (currently, limited to if it is open or closed).
 *
 * @category Config
 */
interface HomeScreenState {
  /**
   * Indicates if the home screen is currently open.
   */
  isHomeScreenOpen: boolean;

  /**
   * Indicates if the home screen should display a "return to assistant" button. This button is displayed when the user
   * has clicked the "back to home" button from the assistant.
   */
  showBackToAssistant: boolean;
}

export {
  HomeScreenConfig,
  HomeScreenStarterButtons,
  HomeScreenState,
  HomeScreenStarterButton,
};
