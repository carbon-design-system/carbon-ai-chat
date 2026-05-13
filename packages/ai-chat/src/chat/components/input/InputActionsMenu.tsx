/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useRef, useState } from "react";
import Add16 from "@carbon/icons/es/add--large/16.js";
import { autoUpdate, computePosition, flip, offset } from "@floating-ui/dom";
import { transformReactIconToCarbonIcon } from "@carbon/ai-chat-components/es/globals/utils/iconTransform.js";

import IconButton from "../carbon/IconButton";
import { BUTTON_KIND } from "../carbon/Button";
import Menu from "../carbon/Menu";
import MenuItem from "../carbon/MenuItem";
import { carbonIconToReact } from "../../utils/carbonIcon";
import type { InputMenuOption } from "../../../types/config/InputConfig";

const AddIcon = carbonIconToReact(Add16);

function renderMenuItemIcon(icon: InputMenuOption["icon"]) {
  const carbonIcon = transformReactIconToCarbonIcon(icon, 16);
  const IconComp = carbonIconToReact(
    carbonIcon as Parameters<typeof carbonIconToReact>[0],
  );
  return <IconComp slot="render-icon" />;
}

interface InputActionsMenuProps {
  disabled: boolean;
  menuOptions: InputMenuOption[];
  menuLabel: string;
}

/**
 * The "+" trigger button + popover menu rendered into the input's
 * `message-actions` slot. Owns its open state and positions the menu via
 * Floating UI — see the effect comment below for why this mirrors
 * cds-menu-button rather than relying on cds-menu's own positioning.
 */
function InputActionsMenu({
  disabled,
  menuOptions,
  menuLabel,
}: InputActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);

  // Mirrors cds-menu-button's FloatingController.setPlacement: write
  // `position: fixed; left; top` to the menu's inner `.cds--menu` element
  // via @floating-ui/dom. cds-menu's built-in _calculatePosition stays
  // active for its `cds--menu--shown` class bookkeeping (writes inline
  // inset-* to the host, which is a 0x0 invisible point), but Floating UI
  // wins on the visible inner element.
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
  }, [open]);

  return (
    <>
      <IconButton
        ref={(el) => {
          triggerRef.current = el;
        }}
        kind={BUTTON_KIND.GHOST}
        size="sm"
        disabled={disabled}
        data-testid="cds-aichat-input-actions-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <AddIcon slot="icon" />
        <span slot="tooltip-content">{menuLabel}</span>
      </IconButton>
      {open && (
        <Menu
          ref={(el) => {
            menuRef.current = el;
          }}
          open
          label={menuLabel}
          onCdsMenuClosed={() => setOpen(false)}
        >
          {menuOptions.map((opt) => (
            <MenuItem
              key={opt.testId ?? opt.text}
              label={opt.text}
              disabled={opt.disabled}
              data-testid={opt.testId}
              onClick={() => {
                setOpen(false);
                if (opt.href) {
                  window.open(opt.href, opt.target || "_self");
                } else {
                  opt.handler?.();
                }
              }}
            >
              {renderMenuItemIcon(opt.icon)}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
}

export { InputActionsMenu };
