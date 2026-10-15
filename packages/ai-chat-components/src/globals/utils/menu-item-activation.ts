/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { BaseOverflowMenuItem } from '../../typings/overflow-menu.js';

/**
 * Runs the callback, then opens the URL when supplied.
 * Scripted menu navigation lacks native link actions and link semantics.
 */
export function activateOverflowMenuItem(item: BaseOverflowMenuItem): void {
  if (item.disabled) {
    return;
  }

  item.onClick?.();

  if (item.href) {
    // Preserve the anchor's referrer while preventing access through window.opener.
    window.open(item.href, item.target || '_self', 'noopener');
  }
}

// Carbon synthesizes a click for Space without suppressing page scroll.
export function suppressMenuItemSpaceScroll(event: KeyboardEvent): void {
  if (event.key === ' ') {
    event.preventDefault();
  }
}

// Slotted menu clicks otherwise pass through Carbon's native trigger button.
export function stopMenuClickPropagation(event: MouseEvent): void {
  event.stopPropagation();
}
