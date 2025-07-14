/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MenuItem } from "@carbon/react";
import React from "react";

import { HasChildren } from "../../../../types/utilities/HasChildren";

interface ChatHeaderMenuItemProps extends HasChildren {
  /**
   * The chat header menu button text.
   */
  label: string;

  /**
   * The url to navigate the user to.
   */
  url?: string;

  /**
   * Determines if the url should be open in a new tab. The default value is true.
   */
  isNewTab?: boolean;

  /**
   * The callback function to fire when the item is clicked.
   */
  onClick?: () => void;
}

/**
 * This component renders a menu item for the purposes of being rendered in the menu in the chat header.
 * See {@link ChatHeaderMenuButton}. The Carbon MenuItem component doesn't support anchor element attributes that
 * allow the item be a link, so the this behavior is handled by manually opening the provided url.
 */
function ChatHeaderMenuItem({
  label,
  url,
  isNewTab = true,
  onClick,
  children,
}: ChatHeaderMenuItemProps) {
  return (
    <MenuItem
      label={label}
      onClick={() => {
        onClick?.();

        if (url) {
          window.open(url, isNewTab ? "_blank" : "_self");
        }
      }}
    >
      {children}
    </MenuItem>
  );
}

export { ChatHeaderMenuItem };
