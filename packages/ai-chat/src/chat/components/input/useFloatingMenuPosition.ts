/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { RefObject, useEffect } from "react";
import { autoUpdate, computePosition, flip, offset } from "@floating-ui/dom";

/**
 * Positions a `cds-menu` popover above its trigger via Floating UI while `open`.
 *
 * Mirrors cds-menu-button's FloatingController.setPlacement: write
 * `position: fixed; left; top` to the menu's inner `.cds--menu` element.
 * cds-menu's built-in `_calculatePosition` stays active for its
 * `cds--menu--shown` class bookkeeping (it writes inline inset-* to the host,
 * which is a 0x0 invisible point), but Floating UI wins on the visible inner
 * element. Shared by the input's "+" actions popover and the expanded-layout
 * actions overflow ("more") menu so both anchor the same way.
 */
function useFloatingMenuPosition(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) {
      return undefined;
    }
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    // Await Lit's updateComplete so the menu's shadow DOM (with the inner
    // `.cds--menu` styleElement we position) has rendered before we query.
    Promise.resolve(
      (menu as unknown as { updateComplete?: Promise<unknown> }).updateComplete,
    ).then(() => {
      if (cancelled) {
        return;
      }
      const styleEl = menu.shadowRoot?.querySelector(
        ".cds--menu",
      ) as HTMLElement | null;
      if (!styleEl) {
        return;
      }
      cleanup = autoUpdate(trigger, styleEl, async () => {
        const { x, y } = await computePosition(trigger, styleEl, {
          strategy: "fixed",
          placement: "top-start",
          middleware: [
            offset(4),
            flip({ fallbackPlacements: ["top", "bottom"] }),
          ],
        });
        Object.assign(styleEl.style, {
          position: "fixed",
          left: `${x}px`,
          top: `${y}px`,
          right: "auto",
        });
      });
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [open, triggerRef, menuRef]);
}

export { useFloatingMenuPosition };
