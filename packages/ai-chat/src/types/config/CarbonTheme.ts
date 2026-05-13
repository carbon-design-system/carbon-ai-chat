/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A string identifying what Carbon Theme we should base UI variables off of.
 * Defaults to "inherit". If you are not hosting the chat on a website that is Carbon styles, you will want to choose
 * once of the non-inherited values to inject the correct CSS custom property values into the code. See
 * https://carbondesignsystem.com/guidelines/color/tokens.
 *
 * @category Config
 */
export enum CarbonTheme {
  /**
   * Injects Carbon white theme tokens.
   */
  WHITE = "white",
  /**
   * Injects Carbon Gray 10 theme tokens.
   */
  G10 = "g10",
  /**
   * Injects Carbon Gray 90 theme tokens.
   */
  G90 = "g90",
  /**
   * Injects Carbon Gray 100 theme tokens.
   */
  G100 = "g100",
}
