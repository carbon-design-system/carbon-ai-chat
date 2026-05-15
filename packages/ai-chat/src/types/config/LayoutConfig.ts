/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { CornersType, PerCornerConfig } from "./CornersType";
import type { LayoutCustomProperties } from "./LayoutCustomProperties";

/**
 * @category Config
 */
export interface LayoutConfig {
  /**
   * Indicates if the Carbon AI Chat widget should keep its border and box-shadow.
   */
  showFrame?: boolean;

  /**
   * Indicates if content inside the Carbon AI Chat widget should be constrained to a max-width.
   *
   * At larger widths the card, carousel, options and conversational search response types
   * have pending issues.
   */
  hasContentMaxWidth?: boolean;

  /**
   * Controls the corner style of the chat component.
   *
   * Can be a simple CornersType value to apply to all corners:
   * ```typescript
   * corners: CornersType.ROUND
   * ```
   *
   * Or a PerCornerConfig object to control each corner individually:
   * ```typescript
   * corners: {
   *   startStart: CornersType.ROUND,  // top-left in LTR
   *   startEnd: CornersType.ROUND,    // top-right in LTR
   *   endStart: CornersType.SQUARE,   // bottom-left in LTR
   *   endEnd: CornersType.SQUARE      // bottom-right in LTR
   * }
   * ```
   *
   * Undefined corners in PerCornerConfig will fall back to CornersType.ROUND.
   */
  corners?: CornersType | PerCornerConfig;

  /**
   * CSS variable overrides for the chat UI. This is a convienience method, you may also set these properties via CSS.
   *
   * Keys correspond to values from `LayoutCustomProperties` (e.g. `LayoutCustomProperties.height`),
   * which map to the underlying `--cds-aichat-…` custom properties.
   * Values are raw CSS values such as `"420px"`, `"9999"`, etc.
   *
   * Example:
   * { height: "560px", width: "420px" }
   */
  customProperties?: Partial<Record<LayoutCustomProperties, string>>;
}
