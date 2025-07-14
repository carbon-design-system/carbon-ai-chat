/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

interface HasDisplayOverride {
  /**
   * This display prop is for overriding the "display" option in a message item.
   *
   * (e.g. Render IFrames inline in a card response type, even if "display" wasn't specified)
   */
  displayOverride?: IFrameItemDisplayOption;
}

export { HasDisplayOverride };
