/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { CornerConfig, CornerStyle, CornerPosition } from "./types.js";
import {
  setVarsForSelector,
  clearVarsForSelector,
} from "../../shared/dynamic-css-var-sheet.js";

const CORNER_PROPS = [
  "--cds-aichat-border-radius-start-start-base",
  "--cds-aichat-border-radius-start-end-base",
  "--cds-aichat-border-radius-end-start-base",
  "--cds-aichat-border-radius-end-end-base",
  "--cds-aichat-border-radius-start-start",
  "--cds-aichat-border-radius-start-end",
  "--cds-aichat-border-radius-end-start",
  "--cds-aichat-border-radius-end-end",
];

/**
 * Manages rounded corner calculations and CSS variable updates for the chat shell.
 * Handles the logic for determining effective corner styles and applying them
 * to CSS custom properties via the shared dynamic stylesheet (CSP-safe).
 */
export class CornerManager {
  private config: CornerConfig;

  constructor(
    private readonly shellSelector: string,
    config: CornerConfig,
  ) {
    this.config = config;
    this.updateCornerCSSVariables();
  }

  /**
   * Update corner configuration and apply CSS variables
   */
  updateCorners(config: CornerConfig): void {
    this.config = config;
    this.updateCornerCSSVariables();
  }

  /**
   * Drop the shell's corner-radius rules from the dynamic stylesheet.
   */
  destroy(): void {
    clearVarsForSelector(this.shellSelector, CORNER_PROPS);
  }

  /**
   * Check if any corner is rounded
   */
  hasAnyRoundedCorner(): boolean {
    return (
      this.config.cornerAll === "round" ||
      this.config.cornerStartStart === "round" ||
      this.config.cornerStartEnd === "round" ||
      this.config.cornerEndStart === "round" ||
      this.config.cornerEndEnd === "round"
    );
  }

  /**
   * Get the effective corner value (individual corner overrides cornerAll)
   */
  getEffectiveCorner(position: CornerPosition): CornerStyle {
    switch (position) {
      case "start-start":
        return this.config.cornerStartStart ?? this.config.cornerAll;
      case "start-end":
        return this.config.cornerStartEnd ?? this.config.cornerAll;
      case "end-start":
        return this.config.cornerEndStart ?? this.config.cornerAll;
      case "end-end":
        return this.config.cornerEndEnd ?? this.config.cornerAll;
    }
  }

  /**
   * Updates CSS custom properties for corner radii based on corner configuration
   */
  private updateCornerCSSVariables(): void {
    const radiusValue = (corner: CornerStyle) =>
      corner === "round" ? "0.5rem" : "0";

    const startStartValue = radiusValue(this.getEffectiveCorner("start-start"));
    const startEndValue = radiusValue(this.getEffectiveCorner("start-end"));
    const endStartValue = radiusValue(this.getEffectiveCorner("end-start"));
    const endEndValue = radiusValue(this.getEffectiveCorner("end-end"));

    setVarsForSelector(this.shellSelector, {
      "--cds-aichat-border-radius-start-start-base": startStartValue,
      "--cds-aichat-border-radius-start-end-base": startEndValue,
      "--cds-aichat-border-radius-end-start-base": endStartValue,
      "--cds-aichat-border-radius-end-end-base": endEndValue,
      // Also set regular variables for direct usage (backward compatibility)
      "--cds-aichat-border-radius-start-start": startStartValue,
      "--cds-aichat-border-radius-start-end": startEndValue,
      "--cds-aichat-border-radius-end-start": endStartValue,
      "--cds-aichat-border-radius-end-end": endEndValue,
    });
  }
}

// Made with Bob
