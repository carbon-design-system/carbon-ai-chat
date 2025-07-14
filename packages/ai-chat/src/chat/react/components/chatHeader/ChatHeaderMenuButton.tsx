/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ChevronDown from "@carbon/icons-react/es/ChevronDown.js";
import ChevronUp from "@carbon/icons-react/es/ChevronUp.js";
import { Button } from "@carbon/react";
import {
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import React, { MutableRefObject, useState } from "react";

import { useUUID } from "../../../shared/hooks/useUUID";

import { HasChildren } from "../../../../types/utilities/HasChildren";
import { ChatHeaderMenu } from "./ChatHeaderMenu";
import {
  ButtonKindEnum,
  ButtonSizeEnum,
} from "../../../../types/utilities/carbonTypes";

interface ChatHeaderMenuButtonProps extends HasChildren {
  /**
   * The chat header menu button text.
   */
  label: string;

  /**
   * The button aria-label.
   */
  ariaLabel?: string;

  /**
   * How the menu should align with the button element.
   */
  menuAlignment?: string;

  /**
   * The ref of the containing element, used for positioning and alignment of the menu.
   */
  containerRef?: MutableRefObject<HTMLDivElement>;
}

/**
 * This component renders a button that opens a menu when clicked. This button is specifically used in the chat header.
 */
/**
 * This component renders a button that opens a menu when clicked. This button is specifically used in the chat header.
 */
function ChatHeaderMenuButton(props: ChatHeaderMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  // These hooks handle closing the menu when the user clicks outside of the menu. The native Carbon button menu
  // component uses the same library.
  const { refs: menuRefs, context: menuContext } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
  });
  const {
    getReferenceProps: getMenuReferenceProps,
    getFloatingProps: getMenuFloatingProps,
  } = useInteractions([useClick(menuContext), useDismiss(menuContext)]);
  const id = useUUID();

  return (
    <div
      ref={menuRefs.setReference}
      aria-owns={id}
      {...getMenuReferenceProps()}
    >
      <Button
        size={ButtonSizeEnum.MEDIUM}
        kind={ButtonKindEnum.GHOST}
        onClick={() => setIsOpen(!isOpen)}
        renderIcon={isOpen ? ChevronUp : ChevronDown}
        onMouseDown={(event) => event.preventDefault()}
        aria-label={props.ariaLabel}
        aria-haspopup
        aria-expanded={isOpen}
        aria-controls={id}
      >
        {props.label}
      </Button>
      <ChatHeaderMenu
        id={id}
        isOpen={isOpen}
        target={menuRefs.floating.current}
        label={props.label}
        containerRef={props.containerRef}
        menuAlignment={props.menuAlignment}
      >
        {props.children}
      </ChatHeaderMenu>
      <div
        ref={menuRefs.setFloating}
        className="WAChatHeaderMenuButton_HostElement"
        {...getMenuFloatingProps()}
      />
    </div>
  );
}

export { ChatHeaderMenuButton };
