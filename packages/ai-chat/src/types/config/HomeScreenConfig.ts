/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The types of home screen backgrounds supported. This only applies when white labeling.
 *
 * @category Config
 *
 * @experimental
 */
enum HomeScreenBackgroundType {
  NONE = "none", // The home screen background is the same color as the chat background.
  SOLID = "solid", // All solid color for home screen.
}

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
  is_on?: boolean;
  buttons?: HomeScreenStarterButton[];
}

/**
 * Configuration for the optional home screen that appears before the bot chat window.
 *
 * @category Config
 */
interface HomeScreenConfig {
  /**
   * If the home page is turned on via config or remote config.
   */
  is_on?: boolean;

  /**
   * The greeting to show to the user to prompt them to start a conversation.
   */
  greeting?: string;

  /**
   * Optional conversation starter utterances that are displayed as buttons.
   */
  starters?: HomeScreenStarterButtons;

  /**
   * An image url that will override the bot avatar displayed in home screen.
   *
   * @internal
   */
  bot_avatar_url?: string;

  /**
   * Do not show the greeting, starters, or avatar url.
   */
  custom_content_only?: boolean;

  /**
   * Defaults to true. If enabled, a user can navigate back to the home screen after they have sent a message to the
   * assistant. If false, the home screen disappears forever after a message is sent.
   */
  allow_return?: boolean;

  /**
   * The type of home screen background to render.
   */
  background?: HomeScreenBackgroundType;
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
   * Indicates if the home screen should display a "return to bot" button. This button is displayed when the user
   * has clicked the "back to home" button from the bot.
   */
  showBackToBot: boolean;
}

export {
  HomeScreenConfig,
  HomeScreenStarterButtons,
  HomeScreenState,
  HomeScreenStarterButton,
  HomeScreenBackgroundType,
};
