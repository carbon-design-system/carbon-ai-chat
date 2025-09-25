/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Valid public CSS variables that can be controlled when white labeling is disabled.
 * These variables map to CSS custom properties used in styling the AI chat interface.
 *
 * Keys map to the underlying `--cds-aichat-…` custom properties.
 *
 * @category Config
 */
export enum LayoutCustomProperties {
  /** Minimum height of the chat container (float layout). */
  height = "height",
  /** Maximum height of the chat container (float layout). */
  max_height = "max-height",
  /** Width of the chat panel (float layout). */
  width = "width",
  /** z-index of the chat overlay or container (float layout). */
  z_index = "z-index",
}
