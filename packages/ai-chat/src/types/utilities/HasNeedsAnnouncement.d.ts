/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

interface HasNeedsAnnouncement {
  /**
   * Indicates if this message needs to be announced to a screen reader. When this message is next mounted into the UI,
   * it will be announced and this flag will be set to off.
   */
  needsAnnouncement?: boolean;
}

export { HasNeedsAnnouncement };
