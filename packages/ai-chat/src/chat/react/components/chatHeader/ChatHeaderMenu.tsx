/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Menu, { MENU_SIZE } from "../../carbon/Menu";
import CDSMenu from "@carbon/web-components/es/components/menu/menu";
import React, { MutableRefObject } from "react";

import { HasChildren } from "../../../../types/utilities/HasChildren";
import { HasClassName } from "../../../../types/utilities/HasClassName";
import { HasID } from "../../../../types/utilities/HasID";

interface ChatHeaderMenuProps extends HasID, HasClassName, HasChildren {
  /**
   * The chat header menu button text.
   */
  label: string;

  /**
   * Determines if the menu is open.
   */
  isOpen?: boolean;

  /**
   * The custom element to host the menu component.
   */
  target?: Element;

  /**
   * The ref of the containing element, used for positioning and alignment of the menu.
   */
  containerRef?: MutableRefObject<CDSMenu>;

  /**
   * Specify how the menu should align with the button element.
   */
  menuAlignment?: string;
}

/**
 * This renders a Carbon Menu component for the purposes of rendering in the chat header.
 */
function ChatHeaderMenu({
  id,
  className,
  label,
  isOpen,
  children,
  menuAlignment,
}: ChatHeaderMenuProps) {
  return (
    <Menu
      id={id}
      className={className}
      open={isOpen}
      label={label}
      size={MENU_SIZE.MEDIUM}
      menuAlignment={menuAlignment}
      mode="full"
    >
      {children}
    </Menu>
  );
}

export { ChatHeaderMenu };
