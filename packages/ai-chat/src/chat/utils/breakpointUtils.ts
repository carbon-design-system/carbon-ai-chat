/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatWidthBreakpoint } from "../../types/state/AppState";

/**
 * Calculate the chat width breakpoint based on the container width
 * @param width - The width of the container in pixels
 * @returns The appropriate ChatWidthBreakpoint
 */
export function calculateChatWidthBreakpoint(
  width: number,
): ChatWidthBreakpoint {
  if (width >= 672 + 16 + 16) {
    return ChatWidthBreakpoint.WIDE;
  } else if (width >= 360) {
    return ChatWidthBreakpoint.STANDARD;
  }
  return ChatWidthBreakpoint.NARROW;
}

// Made with Bob
