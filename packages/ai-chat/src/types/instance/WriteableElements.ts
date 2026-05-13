/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * An object of elements we expose to developers to write to. Be sure to check the documentation of the React or
 * web component you are using for how to make use of this, as it differs based on implementation.
 *
 * @category Instance
 */
export type WriteableElements = Record<WriteableElementName, HTMLElement>;

/**
 * @category Instance
 */
export enum WriteableElementName {
  /**
   * An element that appears in the AI theme only and is shown beneath the title and description in the AI tooltip
   * content.
   */
  AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT = "aiTooltipAfterDescriptionElement",

  /**
   * An element that appears in the main message body directly above the welcome node.
   */
  WELCOME_NODE_BEFORE_ELEMENT = "welcomeNodeBeforeElement",

  /**
   * An element that appears in the header on a new line. Only visible while talking to the assistant.
   */
  HEADER_BOTTOM_ELEMENT = "headerBottomElement",

  /**
   * An element that appears in the header's fixed-actions slot (before close/minimize buttons).
   */
  HEADER_FIXED_ACTIONS_ELEMENT = "headerFixedActionsElement",

  /**
   * An element that appears after the messages area and before the input area.
   */
  BEFORE_INPUT_ELEMENT = "beforeInputElement",

  /**
   * An element that appears after the input field.
   */
  AFTER_INPUT_ELEMENT = "afterInputElement",

  /**
   * An element that appears in the footer area.
   */
  FOOTER_ELEMENT = "footerElement",

  /**
   * An element that appears above the input field on the home screen.
   */
  HOME_SCREEN_BEFORE_INPUT_ELEMENT = "homeScreenBeforeInputElement",

  /**
   * An element that appears on the home screen after the conversation starters.
   */
  HOME_SCREEN_AFTER_STARTERS_ELEMENT = "homeScreenAfterStartersElement",

  /**
   * An element that appears on the home screen above the welcome message and conversation starters.
   */
  HOME_SCREEN_HEADER_BOTTOM_ELEMENT = "homeScreenHeaderBottomElement",

  /**
   * An element to be housed in the custom panel.
   */
  CUSTOM_PANEL_ELEMENT = "customPanelElement",

  /**
   * An element to be housed in the workspace panel.
   */
  WORKSPACE_PANEL_ELEMENT = "workspacePanelElement",

  /**
   * An element to be housed in the history panel.
   */
  HISTORY_PANEL_ELEMENT = "historyPanelElement",
}
