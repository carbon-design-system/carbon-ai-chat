/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { GenericItem } from "../../messaging/Messages";
import { LocalMessageItem } from "../../messaging/LocalMessageItem";

/**
 * The state of the panel surfaced by response types, either with or without user input.
 */
interface MessagePanelState<T extends GenericItem = GenericItem> {
  /**
   * Determines if the show panel is open.
   */
  isOpen: boolean;

  /**
   * The local message item that contains panel content to display.
   */
  localMessageItem: LocalMessageItem<T>;

  /**
   * Indicates if this message is part the most recent message response that allows for input. This will allow the panel
   * to reflect the state of the chat, such as disabling buttons that shouldn't be accessible anymore.
   */
  isMessageForInput: boolean;
}

export type { MessagePanelState };
