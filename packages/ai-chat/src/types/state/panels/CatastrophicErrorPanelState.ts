/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The state information for a catastrophic error panel.
 *
 * @category Instance
 */
interface CatastrophicErrorPanelState {
  /**
   * Whether the catastrophic error panel is currently open.
   */
  isOpen: boolean;

  /**
   * The error title to be displayed in the `CatastrophicErrorPanel`.
   */
  title?: string;

  /**
   * The error body text to be displayed in the `CatastrophicErrorPanel`. Will render markdown if provided.
   */
  bodyText?: string;

  /**
   * When true, the panel renders without the built-in retry button. The consumer is then responsible
   * for closing the panel by calling `instance.updateCatastrophicErrorPanel({ isOpen: false })` once
   * their own recovery flow completes.
   */
  hideRetryButton?: boolean;
}

export type { CatastrophicErrorPanelState };
