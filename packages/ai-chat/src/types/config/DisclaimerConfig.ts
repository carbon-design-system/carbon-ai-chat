/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * @category Config
 */
export interface DisclaimerPublicConfig {
  /**
   * If the disclaimer is turned on.
   */
  isOn: boolean;

  /**
   * HTML content to show in disclaimer.
   */
  disclaimerHTML: string;
}
