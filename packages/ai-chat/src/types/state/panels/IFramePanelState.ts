/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { IFrameItem } from "../../messaging/Messages";

/**
 * The state of the iframe panel.
 */
interface IFramePanelState {
  /**
   * Indicates if the iframe panel is open.
   */
  isOpen: boolean;

  /**
   * The iframe message item with the content to load.
   */
  messageItem: IFrameItem;
}

export type { IFramePanelState };
