/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * These variables map to CSS custom properties used in styling the AI chat interface.
 *
 * Keys map to the underlying `--cds-aichat-*` custom properties.
 *
 * You can use any standard CSS as the value.
 *
 * @category Config
 */
export enum LayoutCustomProperties {
  /**
   * Float layout only.
   *
   * Minimum height of the chat container.
   *
   * Defaults to `calc(100vh - 4rem)`
   *
   */
  height = "height",

  /**
   * Float layout only.
   *
   * Maximum height of the chat container (float layout).
   *
   * Defaults to `640px`.
   */
  max_height = "max-height",

  /**
   * Float layout only.
   *
   * Width of the chat panel (float layout).
   *
   * Defaults to `380px`.
   */
  width = "width",

  /**
   * Float layout only.
   *
   * z-index of the chat overlay or container (float layout).
   *
   * Defaults to `99999`.
   */
  z_index = "z-index",

  /**
   * Custom element layouts only.
   *
   * Max width of messages area in fullscreen / larger views if {@link LayoutConfig.hascontentmaxwidth} is not set to
   * true.
   *
   * Defaults to `672px`.
   */
  messages_max_width = "messages-max-width",
}
