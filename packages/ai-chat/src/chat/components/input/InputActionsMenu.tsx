/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useRef, useState } from "react";
import Add16 from "@carbon/icons/es/add--large/16.js";
import { transformReactIconToCarbonIcon } from "@carbon/ai-chat-components/es/globals/utils/iconTransform.js";

import IconButton from "../carbon/IconButton";
import { BUTTON_KIND } from "../carbon/Button";
import Menu from "../carbon/Menu";
import MenuItem from "../carbon/MenuItem";
import { carbonIconToReact } from "../../utils/carbonIcon";
import { useFloatingMenuPosition } from "./useFloatingMenuPosition";
import type { ToolbarAction } from "../../../types/config/HeaderConfig";

const AddIcon = carbonIconToReact(Add16);

function renderMenuItemIcon(icon: ToolbarAction["icon"]) {
  const carbonIcon = transformReactIconToCarbonIcon(icon, 16);
  const IconComp = carbonIconToReact(
    carbonIcon as Parameters<typeof carbonIconToReact>[0],
  );
  return <IconComp slot="render-icon" />;
}

interface InputActionsMenuProps {
  disabled: boolean;
  actions: ToolbarAction[];
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
  actions,
  menuLabel,
}: InputActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);

  useFloatingMenuPosition(open, triggerRef, menuRef);

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
          {actions.map((opt) => (
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
                  opt.onClick?.();
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
