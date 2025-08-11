/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

interface HasBaseHeight {
  /**
   * The base height value relative to the width of the response type in the authoring modal. This helps the response
   * element maintain its aspect ratio no matter the width of Carbon AI Chat. Use the
   * {@link getResponsiveElementPaddingValue} to calculate the top padding value.
   */
  baseHeight?: number;
}

export { HasBaseHeight };
