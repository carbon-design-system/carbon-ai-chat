/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Framework-neutral view-handle interfaces referenced by the core (`ServiceManager`) but
 * implemented by the view layer. Kept in `utils/` (which the SDK core may import) so the non-view
 * core does not depend on view modules (`AppShell`, `components-legacy/`, `contexts/`); those view
 * files re-export these so their public import shape is unchanged.
 */

import { HasDoAutoScroll } from "../../types/utilities/HasDoAutoScroll";
import { HasRequestFocus } from "../../types/utilities/HasRequestFocus";
import { AnnounceMessage } from "../../types/state/AppState";

/**
 * These are the public imperative functions that are available on the MainWindow component. This
 * interface is declared here to avoid taking a dependency on a specific React component
 * implementation elsewhere.
 */
export interface MainWindowFunctions extends HasRequestFocus, HasDoAutoScroll {
  /**
   * Scrolls to the (full) message with the given ID. Since there may be multiple message items in a given
   * message, this will scroll the first message to the top of the message window.
   *
   * @param messageID The (full) message ID to scroll to.
   * @param animate Whether or not the scroll should be animated. Defaults to true.
   */
  doScrollToMessage(messageID: string, animate?: boolean): void;

  /**
   * Returns the current scrollBottom value for the message scroll panel.
   */
  getMessagesScrollBottom(): number;
}

/**
 * The public imperative functions exposed on the Input component.
 */
export interface InputFunctions {
  /**
   * Instructs the text area to take focus.
   * @deprecated Use requestFocus() instead for consistency with focus management pattern
   */
  takeFocus: () => void;

  /**
   * Requests focus on the input field.
   * Follows the generic focus management pattern for web components.
   * @returns {boolean} True if focus was successfully set, false otherwise
   */
  requestFocus: () => boolean;

  /**
   * Returns true if the input field currently has focus.
   * Encapsulates internal focus detection logic.
   * @returns {boolean} True if the input field has focus
   */
  hasFocus: () => boolean;
}

/**
 * The function used to trigger a screen-reader announcement of a given value.
 *
 * @see AriaAnnouncerProvider
 */
export type AriaAnnouncerFunctionType = (
  value: Node | AnnounceMessage | string,
) => void;
