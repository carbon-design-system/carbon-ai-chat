/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { HasRequestFocus } from './HasRequestFocus';
import type { HasDoAutoScroll } from './HasDoAutoScroll';

/**
 * The focus and scroll functions that the chat shell exposes to services through
 * {@link ServiceManager.mainWindow}. The type is renderer-neutral so services don't
 * depend on a specific shell implementation; `AppShell` implements it today.
 */
interface MainWindowFunctions extends HasRequestFocus, HasDoAutoScroll {
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

export { MainWindowFunctions };
