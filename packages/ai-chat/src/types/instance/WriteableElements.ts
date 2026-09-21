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
   *
   * @deprecated Use {@link WriteableElementName.EXPLAINABILITY_POPOVER_CONTENT}
   * and {@link WriteableElementName.EXPLAINABILITY_POPOVER_ACTIONS} for full control over AI label popover content.
   */
  AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT = 'aiTooltipAfterDescriptionElement',

  /**
   * An element that appears in the header's AI label popover body. When this slot contains meaningful
   * content, the default popover body is hidden automatically.
   */
  EXPLAINABILITY_POPOVER_CONTENT = 'explainabilityPopoverContent',

  /**
   * An element that appears in the header's AI label popover actions footer area.
   */
  EXPLAINABILITY_POPOVER_ACTIONS = 'explainabilityPopoverActions',

  /**
   * An element that appears in the main message body directly above the welcome node.
   */
  WELCOME_NODE_BEFORE_ELEMENT = 'welcomeNodeBeforeElement',

  /**
   * An element that appears in the header on a new line. Only visible while talking to the assistant.
   */
  HEADER_BOTTOM_ELEMENT = 'headerBottomElement',

  /**
   * An element that appears in the header's fixed-actions slot (before close/minimize buttons).
   */
  HEADER_FIXED_ACTIONS_ELEMENT = 'headerFixedActionsElement',

  /**
   * An element that appears after the messages area and before the input area.
   */
  BEFORE_INPUT_ELEMENT = 'beforeInputElement',

  /**
   * An element that appears after the input field.
   */
  AFTER_INPUT_ELEMENT = 'afterInputElement',

  /**
   * A slot rendered in the input composer's actions row, after the action
   * buttons. Only present when the input uses the expanded layout
   * ({@link InputConfig.expanded}); in the default compact layout this slot is
   * not rendered, so content assigned to it is not shown.
   */
  PROMPT_LINE_ACTIONS_END = 'promptLineActionsEnd',

  /**
   * A slot rendered inside the input composer, after the prompt line and directly before
   * the send button.
   */
  PROMPT_LINE_SEND_BUTTON_START = 'promptLineSendButtonStart',

  /**
   * An element that appears in the footer area.
   */
  FOOTER_ELEMENT = 'footerElement',

  /**
   * An element that appears above the input field on the home screen.
   */
  HOME_SCREEN_BEFORE_INPUT_ELEMENT = 'homeScreenBeforeInputElement',

  /**
   * An element that appears on the home screen after the conversation starters.
   */
  HOME_SCREEN_AFTER_STARTERS_ELEMENT = 'homeScreenAfterStartersElement',

  /**
   * An element that appears on the home screen above the welcome message and conversation starters.
   */
  HOME_SCREEN_HEADER_BOTTOM_ELEMENT = 'homeScreenHeaderBottomElement',

  /**
   * An element to be housed in the custom panel.
   */
  CUSTOM_PANEL_ELEMENT = 'customPanelElement',

  /**
   * An element to be housed in the workspace panel.
   */
  WORKSPACE_PANEL_ELEMENT = 'workspacePanelElement',

  /**
   * An element to be housed in the history panel.
   */
  HISTORY_PANEL_ELEMENT = 'historyPanelElement',

  /**
   * An element that replaces the out-of-the-box chat header. When the host
   * supplies content for this slot, the chat renders no header of its own and
   * the content fills the header area directly.
   *
   * Every {@link HeaderConfig} field is ignored while this element has content,
   * except {@link HeaderConfig.isOn} — set it to `false` to hide the header
   * area entirely, host content included. Writeable elements rendered inside
   * the out-of-the-box header are replaced along with it, so
   * {@link WriteableElementName.HEADER_FIXED_ACTIONS_ELEMENT} does not render.
   * {@link WriteableElementName.HEADER_BOTTOM_ELEMENT} and
   * {@link WriteableElementName.HOME_SCREEN_HEADER_BOTTOM_ELEMENT} are
   * unaffected — they sit below the header, not inside it.
   */
  CUSTOM_HEADER = 'customHeader',
}
