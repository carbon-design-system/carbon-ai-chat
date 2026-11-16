/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type CDSOverflowMenuItem from '@carbon/web-components/es/components/overflow-menu/overflow-menu-item.js';

/**
 * Base type for overflow menu items.
 * Extends properties from CDSOverflowMenuItem to ensure type safety
 * and compatibility with Carbon Design System components.
 *
 * This base type is used by:
 * - Action (toolbar.ts) - for toolbar actions that can overflow
 * - NavigationOverflowItem (chat-header.ts) - for navigation menu items
 */
export interface BaseOverflowMenuItem extends Partial<
  Pick<
    CDSOverflowMenuItem,
    'danger' | 'dangerDescription' | 'disabled' | 'divider' | 'href'
  >
> {
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
