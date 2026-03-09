/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The types of corners the chat can have.
 *
 * @category Config
 */
export enum CornersType {
  /**
   * Makes the corners on the chat component rounded.
   */
  ROUND = "round",

  /**
   * Makes the corners on the chat component square.
   */
  SQUARE = "square",
}

/**
 * Configuration for individual corners using logical property names.
 * Supports RTL layouts by using start/end instead of left/right.
 *
 * Any undefined corner will fall back to the default value (ROUND).
 *
 * @category Config
 */
export interface PerCornerConfig {
  /**
   * Top-left corner in LTR, top-right in RTL.
   * Maps to border-start-start-radius.
   */
  startStart?: CornersType;

  /**
   * Top-right corner in LTR, top-left in RTL.
   * Maps to border-start-end-radius.
   */
  startEnd?: CornersType;

  /**
   * Bottom-left corner in LTR, bottom-right in RTL.
   * Maps to border-end-start-radius.
   */
  endStart?: CornersType;

  /**
   * Bottom-right corner in LTR, bottom-left in RTL.
   * Maps to border-end-end-radius.
   */
  endEnd?: CornersType;
}

/**
 * Resolved corner configuration with all corners defined.
 * Used internally after normalizing the user's configuration.
 *
 * @category Config
 */
export interface ResolvedCornerConfig {
  startStart: CornersType;
  startEnd: CornersType;
  endStart: CornersType;
  endEnd: CornersType;
}
