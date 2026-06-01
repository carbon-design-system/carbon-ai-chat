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
import CloseLarge16 from "@carbon/icons/es/close--large/16.js";
import Toolbar from "@carbon/ai-chat-components/es/react/toolbar.js";
import IconButton from "../carbon/IconButton";
import { BUTTON_KIND } from "@carbon/web-components/es/components/button/defs.js";
import { MarkdownWithDefaults } from "../util/MarkdownWithDefaults";
import { isDirectionRTL } from "../../utils/domUtils";
import { carbonIconToReact } from "../../utils/carbonIcon";

const ChevronDown = carbonIconToReact(ChevronDown16);
const CloseLarge = carbonIconToReact(CloseLarge16);

interface PanelHeaderProps {
  title?: string;
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
  showBackButton = true,
  labelBackButton,
  backButtonType = "minimize",
  backButtonPosition = "end",
  onClickBack,
}: PanelHeaderProps) {
  const toolbarActions = useMemo(() => {
    return showBackButton && backButtonPosition !== "start"
      ? [
          {
            text: labelBackButton ?? "",
            icon: backButtonType === "close" ? CloseLarge16 : ChevronDown16,
            size: "md",
            onClick: () => onClickBack?.(),
          },
        ]
      : [];
  }, [
    backButtonType,
    labelBackButton,
    onClickBack,
    showBackButton,
    backButtonPosition,
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
              {backButtonType === "close" ? (
                <CloseLarge slot="icon" />
              ) : (
                <ChevronDown slot="icon" />
              )}
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
