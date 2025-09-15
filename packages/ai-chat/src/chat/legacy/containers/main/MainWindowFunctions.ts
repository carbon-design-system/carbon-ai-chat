/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { HasDoAutoScroll } from "../../../../types/utilities/HasDoAutoScroll";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";

/**
 * These are the public imperative functions that are available on the MainWindow component. This interface is
 * declared separately to avoid a direct dependency on a React component.
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
