/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Shared options for toolbar actions and header navigation menu items.
 */
export interface BaseOverflowMenuItem {
  /** Whether the item represents a destructive action. */
  danger?: boolean;

  /** Accessible description of a destructive action. */
  dangerDescription?: string;

  /** Whether activation is disabled. */
  disabled?: boolean;

  /** Whether a divider appears before the item. */
  divider?: boolean;

  /**
   * URL to open when the item is activated.
   * Menu items navigate through script and announce as menu items rather than links.
   * Native link actions such as middle-click and copy link address are unavailable.
   */
  href?: string;

  /**
   * Display text for the menu item.
   */
  text: string;

  /**
   * Click handler for the menu item.
   * Optional to allow for link-only items (using href).
   */
  onClick?: () => void;

  /**
   * Link target attribute (e.g., '_blank', '_self').
   * Used when href is provided.
   */
  target?: string;

  /**
   * A `data-testid` attribute for the menu item, so tests can find it.
   *
   * @experimental
   * @deprecated In tests, select the menu item by its visible text instead.
   * Removed in a 2.x minor release.
   */
  testId?: string;

  /**
   * Optional ID
   */
  id?: string;
}
