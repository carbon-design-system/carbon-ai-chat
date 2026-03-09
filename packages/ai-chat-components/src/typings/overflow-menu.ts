/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type CDSOverflowMenuItem from "@carbon/web-components/es/components/overflow-menu/overflow-menu-item.js";

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
    "danger" | "dangerDescription" | "disabled" | "divider" | "href"
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
   * Optional data-testid string for e2e testing.
   */
  testId?: string;
}
