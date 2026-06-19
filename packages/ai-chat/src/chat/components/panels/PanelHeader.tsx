/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useMemo } from "react";

import ChevronDown16 from "@carbon/icons/es/chevron--down/16.js";
import ChevronLeft16 from "@carbon/icons/es/chevron--left/16.js";
import CloseLarge16 from "@carbon/icons/es/close--large/16.js";
import Toolbar from "@carbon/ai-chat-components/es/react/toolbar.js";
import IconButton from "../carbon/IconButton";
import { BUTTON_KIND } from "@carbon/web-components/es/components/button/defs.js";
import { MarkdownWithDefaults } from "../util/MarkdownWithDefaults";
import { isDirectionRTL } from "../../utils/domUtils";
import { carbonIconToReact } from "../../utils/carbonIcon";

const ChevronDown = carbonIconToReact(ChevronDown16);
const ChevronLeft = carbonIconToReact(ChevronLeft16);
const CloseLarge = carbonIconToReact(CloseLarge16);

interface PanelHeaderProps {
  title?: string;
  openFromSide?: boolean;
  showBackButton?: boolean;
  labelBackButton?: string;
  backButtonType?: "minimize" | "close";
  backButtonPosition?: "start" | "end";
  onClickBack?: () => void;
}

/**
 * Lightweight header wrapper for slotting into CDSAIChatPanel.
 * Derives defaults from header config when a custom title isn't provided.
 */
function PanelHeader({
  title,
  openFromSide,
  showBackButton = true,
  labelBackButton,
  backButtonType = "minimize",
  backButtonPosition = "end",
  onClickBack,
}: PanelHeaderProps) {
  const { backButtonIcon, BackButtonIcon } = useMemo(() => {
    const icons = {
      close: { iconDescriptor: CloseLarge16, IconComponent: CloseLarge },
      side: { iconDescriptor: ChevronLeft16, IconComponent: ChevronLeft },
      down: { iconDescriptor: ChevronDown16, IconComponent: ChevronDown },
    };

    const iconKey =
      backButtonType === "close" ? "close" : openFromSide ? "side" : "down";
    const selected = icons[iconKey];

    return {
      backButtonIcon: selected.iconDescriptor,
      BackButtonIcon: selected.IconComponent,
    };
  }, [backButtonType, openFromSide]);

  const toolbarActions = useMemo(() => {
    if (!showBackButton || backButtonPosition === "start") {
      return [];
    }

    return [
      {
        text: labelBackButton ?? "",
        icon: backButtonIcon,
        size: "md",
        onClick: () => onClickBack?.(),
      },
    ];
  }, [
    labelBackButton,
    onClickBack,
    showBackButton,
    backButtonPosition,
    backButtonIcon,
  ]);

  const tooltipAlign = isDirectionRTL() ? "bottom-end" : "bottom-start";

  return (
    <div data-floating-menu-container>
      <Toolbar actions={toolbarActions}>
        <div slot="title">{title && <MarkdownWithDefaults text={title} />}</div>
        {showBackButton && backButtonPosition === "start" && (
          <div slot="navigation">
            <IconButton
              data-rounded="top-left"
              size="md"
              kind={BUTTON_KIND.GHOST}
              align={tooltipAlign}
              enterDelayMs={0}
              leaveDelayMs={0}
              onClick={() => onClickBack?.()}
            >
              <BackButtonIcon slot="icon" />
              {labelBackButton && (
                <span slot="tooltip-content">{labelBackButton}</span>
              )}
            </IconButton>
          </div>
        )}
      </Toolbar>
    </div>
  );
}

export { PanelHeader };
export type { PanelHeaderProps };
