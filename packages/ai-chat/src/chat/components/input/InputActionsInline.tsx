/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useRef, useState } from "react";
import OverflowMenuVertical16 from "@carbon/icons/es/overflow-menu--vertical/16.js";
import { createOverflowHandler } from "@carbon/utilities";
import { transformReactIconToCarbonIcon } from "@carbon/ai-chat-components/es/globals/utils/iconTransform.js";

import IconButton from "../carbon/IconButton";
import { BUTTON_KIND } from "../carbon/Button";
import Menu from "../carbon/Menu";
import MenuItem from "../carbon/MenuItem";
import { carbonIconToReact } from "../../utils/carbonIcon";
import { useFloatingMenuPosition } from "./useFloatingMenuPosition";
import type { ToolbarAction } from "../../../types/config/HeaderConfig";

const OverflowIcon = carbonIconToReact(OverflowMenuVertical16);

function optionIconToReact(icon: ToolbarAction["icon"]) {
  const carbonIcon = transformReactIconToCarbonIcon(icon, 16);
  return carbonIconToReact(
    carbonIcon as Parameters<typeof carbonIconToReact>[0],
  );
}

function renderMenuItemIcon(icon: ToolbarAction["icon"]) {
  const Icon = optionIconToReact(icon);
  return <Icon slot="render-icon" />;
}

function runAction(opt: ToolbarAction) {
  if (opt.href) {
    window.open(opt.href, opt.target || "_self");
  } else {
    opt.onClick?.();
  }
}

interface InputActionsInlineProps {
  disabled: boolean;
  actions: ToolbarAction[];
  /** Tooltip / accessible label for the overflow ("more") trigger and menu. */
  overflowMenuLabel: string;
}

/**
 * The expanded-layout counterpart to {@link InputActionsMenu}. Renders each
 * action as a standalone icon-only ghost button directly in the input's
 * `message-actions` slot — no "+" trigger. When the row runs out of room the
 * trailing actions collapse into a "more" overflow menu (an `@carbon/icons`
 * "⋯" button that opens the same `cds-menu` popover the compact layout uses);
 * actions flagged `fixed` are kept out of the overflow. The option `text`
 * becomes each button's tooltip and accessible label; click / `href` handling
 * mirrors the popover's menu items.
 *
 * Overflow is measured with `@carbon/utilities`' `createOverflowHandler`, which
 * sets `data-hidden` on the buttons that no longer fit; the overflow trigger's
 * own `data-hidden` is driven from React state (the handler skips its first
 * measure when nothing overflows). The AppShellStyles `[data-hidden]` rule
 * collapses both out of the row.
 */
function InputActionsInline({
  disabled,
  actions,
  overflowMenuLabel,
}: InputActionsInlineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);
  // Hide the row until the first overflow measure lands so the "more" trigger
  // (and any overflowing buttons) don't flash before being collapsed.
  const [measuring, setMeasuring] = useState(true);

  const nonFixedActions = actions.filter((opt) => !opt.fixed);
  const fixedActions = actions.filter((opt) => opt.fixed);
  const hiddenActions =
    hiddenCount > 0
      ? nonFixedActions.slice(nonFixedActions.length - hiddenCount)
      : [];

  useFloatingMenuPosition(open, triggerRef, menuRef);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    setMeasuring(true);
    const nonFixedCount = actions.filter((opt) => !opt.fixed).length;
    let handler: { disconnect: () => void } | undefined;
    let revealRaf = 0;
    const setupRaf = requestAnimationFrame(() => {
      handler = createOverflowHandler({
        container,
        dimension: "width",
        onChange: (visibleItems) => {
          setHiddenCount(Math.max(0, nonFixedCount - visibleItems.length));
        },
      });
      // createOverflowHandler queues its first measure in its own rAF, so wait
      // one more frame for the overflow state to apply before revealing.
      revealRaf = requestAnimationFrame(() => setMeasuring(false));
    });
    return () => {
      cancelAnimationFrame(setupRaf);
      cancelAnimationFrame(revealRaf);
      handler?.disconnect();
    };
  }, [actions]);

  // A resize that makes everything fit again empties the overflow menu; close
  // it so a stale popover doesn't linger.
  useEffect(() => {
    if (hiddenCount === 0 && open) {
      setOpen(false);
    }
  }, [hiddenCount, open]);

  return (
    <>
      <div
        ref={containerRef}
        className="cds-aichat-input-inline-actions"
        data-measuring={measuring ? "" : undefined}
      >
        {nonFixedActions.map((opt) => {
          const Icon = optionIconToReact(opt.icon);
          return (
            <IconButton
              key={opt.testId ?? opt.text}
              kind={BUTTON_KIND.GHOST}
              size="sm"
              disabled={disabled || opt.disabled}
              data-testid={opt.testId}
              onClick={() => runAction(opt)}
            >
              <Icon slot="icon" />
              <span slot="tooltip-content">{opt.text}</span>
            </IconButton>
          );
        })}

        {/*
          Overflow ("more") trigger. `data-offset` marks it as the element the
          overflow handler reserves space for; it stays mounted so the handler
          can measure it. We own its visibility from `hiddenCount` via
          `data-hidden` (collapsed by the AppShellStyles rule) rather than the
          handler's own toggle, which skips its first measure when nothing
          overflows — that left the trigger showing with an empty menu.
        */}
        <IconButton
          ref={(el) => {
            triggerRef.current = el;
          }}
          data-offset=""
          data-hidden={hiddenCount === 0 ? "" : undefined}
          kind={BUTTON_KIND.GHOST}
          size="sm"
          disabled={disabled}
          data-testid="cds-aichat-input-actions-overflow-trigger"
          onClick={() => setOpen((isOpen) => !isOpen)}
        >
          <OverflowIcon slot="icon" />
          <span slot="tooltip-content">{overflowMenuLabel}</span>
        </IconButton>

        {fixedActions.map((opt) => {
          const Icon = optionIconToReact(opt.icon);
          return (
            <IconButton
              key={opt.testId ?? opt.text}
              data-fixed=""
              kind={BUTTON_KIND.GHOST}
              size="sm"
              disabled={disabled || opt.disabled}
              data-testid={opt.testId}
              onClick={() => runAction(opt)}
            >
              <Icon slot="icon" />
              <span slot="tooltip-content">{opt.text}</span>
            </IconButton>
          );
        })}
      </div>

      {open && hiddenActions.length > 0 && (
        <Menu
          ref={(el) => {
            menuRef.current = el;
          }}
          open
          label={overflowMenuLabel}
          onCdsMenuClosed={() => setOpen(false)}
        >
          {hiddenActions.map((opt) => (
            <MenuItem
              key={opt.testId ?? opt.text}
              label={opt.text}
              disabled={opt.disabled}
              data-testid={opt.testId}
              onClick={() => {
                setOpen(false);
                runAction(opt);
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

export { InputActionsInline };
