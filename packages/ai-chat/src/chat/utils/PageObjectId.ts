/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { OverlayPanelName } from "../legacy/components/OverlayPanel";

/**
 * An enum of all of our data-testid we use.
 *
 * @category Testing
 */

export enum PageObjectId {
  /**
   * When a panel has been closed. This is combined with an OverlayPanelName.
   */
  CLOSE_CHAT = "close_chat",

  /**
   * The launcher button to open the chat. This id is maintained across desktop and mobile launchers.
   */
  LAUNCHER = "launcher_open_chat",

  /**
   * Input field. This is combined with an OverlayPanelName.
   */
  INPUT = "input_field",

  /**
   * Input send button. This is combined with an OverlayPanelName.
   */
  INPUT_SEND = "input_send",
}

/**
 * Ids used for data-testid. A `${OverlayPanelName}-${PageObjectId}` combination to account for the fact that some
 * elements inside panels may have multiple copies active in the view to enable animations to and from different states.
 *
 * @category Testing
 */
export type PrefixedId = `${OverlayPanelName}-${PageObjectId}`;

/**
 * Ids used for data-testid. They can either be a PageObjectId or include a prefix of an OverlayPanelName.
 *
 * @category Testing
 */
export type TestId = PageObjectId | PrefixedId;

/**
 * Generate a testId by PageObjectId and optional OverlayPanelName.
 *
 * @category Testing
 */
export function makeTestId(id: PageObjectId, panel?: OverlayPanelName): TestId {
  if (panel) {
    return `${panel}-${id}` as PrefixedId;
  }
  return id;
}
