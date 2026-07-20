/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The different available widths of a Carbon AI Chat.
 */
enum ChatWidthBreakpoint {
  // < 360px
  NARROW = "narrow",
  // >= 360px
  STANDARD = "standard",
  // > 672 + 16 + 16px
  WIDE = "wide",
}

export { ChatWidthBreakpoint };
