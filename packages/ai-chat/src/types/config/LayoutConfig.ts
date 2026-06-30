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
   * CSS custom property overrides for the chat UI. This is a convenience method; you may also set
   * these properties via CSS. Unlike page-level CSS, these overrides are injected inside the chat
   * and win even when a theme is forced with {@link PublicConfig.injectCarbonTheme}.
   *
   * Two token layers are supported, distinguished by the key:
   *
   * - **Chat shell tokens** — a value from `LayoutCustomProperties` (e.g. `"width"` or
   *   `"launcher-color-background"`) maps to the matching `--cds-aichat-…` custom property.
   * - **Carbon theme tokens** — any Carbon token name prefixed with `$` (e.g. `"$button-primary"`)
   *   maps to the matching `--cds-…` custom property (`--cds-button-primary`). Use this to recolor
   *   the Carbon components rendered inside the chat. `$`-prefixed values must be hexadecimal colors.
   *
   * Values are raw CSS values such as `"420px"`, `"9999"`, or `"#1a1a2e"`.
   *
   * Example:
   * ```ts
   * {
   *   width: "420px",
   *   "launcher-color-background": "#1a1a2e",
   *   "$button-primary": "#1a1a2e",
   * }
   * ```
   */
  customProperties?: Partial<
    Record<LayoutCustomProperties | `$${string}`, string>
  >;
}
