/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { CarbonIconType } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import CDSMenu from "@carbon/web-components/es/components/menu/menu";
import { CarbonIconProps } from "../../../shared/utils/carbonIcon";
import {
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import cx from "classnames";
import React, { MutableRefObject, useState, FunctionComponent } from "react";

import { useUUID } from "../../../shared/hooks/useUUID";
import { HasChildren } from "../../../../types/utilities/HasChildren";
import { HasClassName } from "../../../../types/utilities/HasClassName";
import { ChatHeaderMenu } from "./ChatHeaderMenu";
import {
  ButtonKindEnum,
  ButtonSizeEnum,
} from "../../../../types/utilities/carbonTypes";

interface ChatHeaderOverflowMenuProps extends HasClassName, HasChildren {
  /**
   * The carbon icon to render.
   */
  renderIcon: CarbonIconType | FunctionComponent<CarbonIconProps>;

  /**
   * The text for the tooltip when you hover over the button.
   */
  iconDescription: string;

  /**
   * The button aria-label.
   */
  ariaLabel: string;

  /**
   * How the menu should align with the button element
   */
  menuAlignment?: string;

  /**
   * The direction of the tooltip for icon-only buttons.
   */
  tooltipPosition?: string;

  /**
   * The ref of the containing element, used for positioning and alignment of the menu.
   */
  containerRef?: MutableRefObject<CDSMenu>;

  /**
   * The callback function to fire when the menu is opened.
   */
  onOpen?: () => void;

  /**
   * The callback function to fire when the menu is closed.
   */
  onClose?: () => void;
}

function ChatHeaderOverflowMenu(props: ChatHeaderOverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  // These hooks handle closing the menu when the user clicks outside of the menu. The native Carbon overflow menu
  // component uses the same library.
  const { refs: menuRefs, context: menuContext } = useFloating({
    open: isOpen,
    onOpenChange: (isOpen) => {
      setIsOpen(isOpen);

      if (isOpen) {
        props.onOpen?.();
      } else {
        props.onClose?.();
      }
    },
  });
  const { getReferenceProps: getMenuReferenceProps } = useInteractions([
    useClick(menuContext),
    useDismiss(menuContext),
  ]);
  const id = useUUID();

  return (
    <div
      ref={menuRefs.setReference}
      aria-owns={id}
      {...getMenuReferenceProps()}
    >
      <Button
        className={cx("WACChatHeaderOverflowMenu__Button", props.className)}
        size={ButtonSizeEnum.MEDIUM}
        kind={ButtonKindEnum.GHOST}
        onClick={() => setIsOpen(!isOpen)}
        tooltipPosition={props.tooltipPosition}
        renderIcon={props.renderIcon}
        onMouseDown={(event) => event.preventDefault()}
        iconDescription={props.iconDescription}
        hasIconOnly
        aria-label={props.ariaLabel}
        aria-haspopup
        aria-expanded={isOpen}
        aria-controls={id}
      />
      <div
        ref={menuRefs.setFloating}
        className="WACChatHeaderOverflowMenu__HostElement"
      >
        <ChatHeaderMenu
          id={id}
          label={props.ariaLabel}
          isOpen={isOpen}
          target={menuRefs.floating.current}
          menuAlignment={props.menuAlignment}
        >
          {props.children}
        </ChatHeaderMenu>
      </div>
    </div>
  );
}

export { ChatHeaderOverflowMenu };
