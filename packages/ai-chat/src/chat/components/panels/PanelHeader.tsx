/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useMemo } from "react";

import ChevronDown20 from "@carbon/icons/es/chevron--down/20.js";
import CloseLarge20 from "@carbon/icons/es/close--large/20.js";
import Toolbar from "@carbon/ai-chat-components/es/react/toolbar.js";

interface PanelHeaderProps {
  title?: string;
  showBackButton?: boolean;
  labelBackButton?: string;
  backButtonType?: "minimize" | "close";
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
  onClickBack,
}: PanelHeaderProps) {
  const toolbarActions = useMemo(() => {
    return showBackButton
      ? [
          {
            text: labelBackButton ?? "",
            icon: backButtonType === "close" ? CloseLarge20 : ChevronDown20,
            size: "md",
            onClick: () => onClickBack?.(),
          },
        ]
      : [];
  }, [backButtonType, labelBackButton, onClickBack, showBackButton]);

  return (
    <div data-floating-menu-container>
      <Toolbar actions={toolbarActions}>
        <div slot="title">{title}</div>
      </Toolbar>
    </div>
  );
}

export { PanelHeader };
export type { PanelHeaderProps };
