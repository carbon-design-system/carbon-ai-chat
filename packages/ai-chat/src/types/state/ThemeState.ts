/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { CarbonTheme } from "../config/CarbonTheme";
import type { CornersType } from "../../chat/utils/constants";

/**
 * The theme state.
 */
interface ThemeState {
  /**
   * Enables Carbon AI theme styling. Defaults to true.
   */
  aiEnabled: boolean;

  /**
   * Which Carbon theme tokens are currently in effect.
   * Null indicates the chat inherits tokens from the host page.
   */
  derivedCarbonTheme: CarbonTheme | null;

  /**
   * The originally selected Carbon theme tokens. Null indicates inheritance from the host page.
   */
  originalCarbonTheme: CarbonTheme | null;

  /**
   * The resolved corners configuration for the chat.
   * Each corner is individually defined after normalizing the user's configuration.
   */
  corners: {
    startStart: CornersType;
    startEnd: CornersType;
    endStart: CornersType;
    endEnd: CornersType;
  };
}

export type { ThemeState };
