/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { HasRequestFocus } from '../../types/utilities/HasRequestFocus';
import type { HasDoAutoScroll } from '../../types/utilities/HasDoAutoScroll';

export interface MainWindowFunctions extends HasRequestFocus, HasDoAutoScroll {
  doScrollToMessage(messageID: string, animate?: boolean): void;
  getMessagesScrollBottom(): number;
}
