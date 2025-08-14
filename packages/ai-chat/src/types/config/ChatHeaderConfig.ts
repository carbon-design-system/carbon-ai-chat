/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * @category Config
 */
export interface ChatHeaderConfig {
  /**
   * The chat header title with an optional name after the title.
   */
  headerTitle: {
    /**
     * The chat header title.
     */
    title?: string;

    /**
     * The name displayed after the title.
     */
    name?: string;
  };
}
