/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { PageObjectId as BasePageObjectId } from "@carbon/ai-chat-components/es/testing/PageObjectId";

/**
 * An enum of all of our data-testid we use. For some elements (like INPUT) they can appear in multiple "panels"
 * (e.g. on the home screen and in the main chat window). There are provided testids for "panels" as well so you
 * can first select a panel and then select the correct child.
 *
 * This extends the base PageObjectId from @carbon/ai-chat-components to include application-level test IDs.
 *
 * @category Testing
 *
 * @experimental
 */
export enum PageObjectId {
  /**
   * Header title element (from @carbon/ai-chat-components).
   */
  HEADER_TITLE = BasePageObjectId.HEADER_TITLE,

  /**
   * Header name element (from @carbon/ai-chat-components).
   */
  HEADER_NAME = BasePageObjectId.HEADER_NAME,

  /**
   * The root chat widget container (for scoping tests/accessibility checks).
   */
  CHAT_WIDGET = "chat_widget",

  /**
   * Minimize chat button in header.
   */
  CLOSE_CHAT = "close_chat",

  /**
   * The launcher button to open the chat. This id is maintained across desktop and mobile launchers.
   */
  LAUNCHER = "launcher_open_chat",

  /**
   * Input field.
   */
  INPUT = "input_field",

  /**
   * Input send button.
   */
  INPUT_SEND = "input_send",

  // Panel identifiers
  /**
   * The main chat messages list.
   */
  MAIN_PANEL = "main_panel",

  /**
   * Disclaimer panel.
   */
  DISCLAIMER_PANEL = "disclaimer_panel",

  /**
   * Disclaimer accept button.
   */
  DISCLAIMER_ACCEPT_BUTTON = "disclaimer_accept_button",

  /**
   * Homescreen Panel.
   */
  HOME_SCREEN_PANEL = "home_screen_panel",

  /**
   * Hydration/loading state panel.
   */
  HYDRATING_PANEL = "hydrating_panel",

  /**
   * Catastrophic error panel.
   */
  CATASTROPHIC_PANEL = "catastrophic_panel",

  /**
   * Iframe panel.
   */
  IFRAME_PANEL = "iframe_panel",

  /**
   * Conversational search panel.
   */
  CONVERSATIONAL_SEARCH_CITATION_PANEL = "conversational_search_citation_panel",

  /**
   * Custom panel.
   */
  CUSTOM_PANEL = "custom_panel",

  /**
   * A panel that opens from a button response.
   */
  BUTTON_RESPONSE_PANEL = "button_response_panel",
}

/**
 * Ids used for data-testid.
 *
 * @category Testing
 *
 * @experimental
 */
export type TestId = PageObjectId;
