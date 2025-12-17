/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type CDSButton from "@carbon/web-components/es/components/button/button.js";
import Button, {
  BUTTON_KIND,
  BUTTON_SIZE,
  BUTTON_TOOLTIP_POSITION,
} from "../../components/carbon/Button";
import CloseLarge16 from "@carbon/icons/es/close--large/16.js";
import ChevronDown16 from "@carbon/icons/es/chevron--down/16.js";
import OverflowMenuVertical16 from "@carbon/icons/es/overflow-menu--vertical/16.js";
import Restart16 from "@carbon/icons/es/restart/16.js";
import SidePanelClose16 from "@carbon/icons/es/side-panel--close/16.js";
import SubtractLarge16 from "@carbon/icons/es/subtract--large/16.js";
import { AI_LABEL_SIZE } from "@carbon/web-components/es/components/ai-label/defs.js";
import { POPOVER_ALIGNMENT } from "@carbon/web-components/es/components/popover/defs.js";
import cx from "classnames";
import React, {
  forwardRef,
  Ref,
  RefObject,
  useImperativeHandle,
  useRef,
} from "react";
import { carbonIconToReact } from "../../utils/carbonIcon";
import OverflowMenu from "../../components/carbon/OverflowMenu";
import OverflowMenuBody from "../../components/carbon/OverflowMenuBody";
import OverflowMenuItem from "../../components/carbon/OverflowMenuItem";
import CDSOverflowMenu from "@carbon/web-components/es/components/overflow-menu/overflow-menu";
import { ChatHeaderTitle } from "../../ai-chat-components/react/components/chatHeader/ChatHeaderTitle";
import { HasChildren } from "../../../types/utilities/HasChildren";
import { HasClassName } from "../../../types/utilities/HasClassName";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { doFocusRef } from "../../utils/domUtils";
import { MinimizeButtonIconType } from "../../../types/config/PublicConfig";
import { AISlug } from "../../components/carbon/AISlug";
import { PageObjectId, TestId } from "../../../testing/PageObjectId";

const CloseLarge = carbonIconToReact(CloseLarge16);
const ChevronDown = carbonIconToReact(ChevronDown16);
const OverflowMenuVertical = carbonIconToReact(OverflowMenuVertical16);
const Restart = carbonIconToReact(Restart16);
const SidePanelClose = carbonIconToReact(SidePanelClose16);
const SubtractLarge = carbonIconToReact(SubtractLarge16);

interface HeaderProps {
  /**
   * The name to display.
   */
  displayName?: string;

  /**
   * The title text to display above the name.
   */
  title?: string;

  /**
   * Indicates if the minimize button should be hidden.
   */
  hideCloseButton?: boolean;

  /**
   * Indicates if the back button should be rendered.
   */
  showBackButton?: boolean;

  /**
   * Indicates if the restart button should be rendered.
   */
  showRestartButton?: boolean;

  /**
   * The aria label to display on the back button.
   */
  labelBackButton?: string;

  /**
   * The type of button class to use on the back button.
   */
  backButtonType?: BUTTON_KIND;

  /**
   * Controls whether to show the AI label in this specific header instance.
   */
  showAiLabel?: boolean;

  /**
   * Called when the close button is clicked.
   */
  onClickClose?: () => void;

  /**
   * Called when the back button is clicked.
   */
  onClickBack?: () => void;

  /**
   * Called when the restart button is clicked.
   */
  onClickRestart?: () => void;

  /**
   * The contents/icon to display for the "back" button.
   */
  backContent?: React.ReactNode;

  /**
   * The list of items to display in the overflow menu.
   */
  overflowItems?: string[];

  /**
   * The callback to call when an overflow item is chosen. This will return the index of the item that was clicked.
   */
  overflowClicked?: (index: number) => void;

  /**
   * Aria label for the close button.
   */
  closeButtonLabel: string;

  /**
   * Tooltip text for the overflow menu trigger.
   */
  overflowMenuTooltip?: string;

  /**
   * Aria label for the overflow menu trigger.
   */
  overflowMenuAriaLabel?: string;

  /**
   * Label for the restart button.
   */
  restartButtonLabel?: string;

  /**
   * Label text displayed within the AI slug tooltip.
   */
  aiSlugLabel?: string;

  /**
   * Title text displayed within the AI slug tooltip.
   */
  aiSlugTitle?: string;

  /**
   * Description text displayed within the AI slug tooltip.
   */
  aiSlugDescription?: string;

  /**
   * Additional content to render beneath the AI slug description.
   */
  aiSlugAfterDescriptionElement?: React.ReactNode;

  /**
   * Indicates if the AI slug content should be hidden.
   */
  isAiSlugHidden?: boolean;

  /**
   * Icon style to use for the minimize button.
   */
  minimizeButtonIconType?: MinimizeButtonIconType;

  /**
   * Indicates if the restart action is currently processing.
   */
  isRestarting?: boolean;
}

/**
 * This displays the main header.
 */
function Header(props: HeaderProps, ref: Ref<HasRequestFocus>) {
  const {
    displayName,
    backContent,
    showRestartButton,
    showBackButton,
    labelBackButton,
    onClickClose,
    onClickRestart,
    onClickBack,
    overflowItems,
    overflowClicked,
    backButtonType,
    hideCloseButton,
    showAiLabel,
    title,
    closeButtonLabel,
    overflowMenuTooltip,
    overflowMenuAriaLabel,
    restartButtonLabel,
    aiSlugLabel,
    aiSlugTitle,
    aiSlugDescription,
    aiSlugAfterDescriptionElement,
    isAiSlugHidden,
    minimizeButtonIconType = MinimizeButtonIconType.MINIMIZE,
    isRestarting = false,
  } = props;

  const backButtonRef = useRef<CDSButton>(undefined);
  const restartButtonRef = useRef<CDSButton>(undefined);
  const closeButtonRef = useRef<CDSButton>(undefined);
  const overflowRef = useRef<CDSOverflowMenu>(undefined);
  const isRTL = document.dir === "rtl";

  // Determine whether to show AI label - use prop if provided, otherwise use config value with default true
  const shouldShowAiLabel = showAiLabel !== undefined ? showAiLabel : true;
  const showAiSlugContent =
    shouldShowAiLabel &&
    !isAiSlugHidden &&
    !!(
      aiSlugLabel ||
      aiSlugTitle ||
      aiSlugDescription ||
      aiSlugAfterDescriptionElement
    );

  const useHideCloseButton = hideCloseButton ?? false;

  // The icon to use for the close button.
  let closeIcon: React.ReactNode;
  let closeReverseIcon = false;
  let closeIsReversible = true;
  switch (minimizeButtonIconType) {
    case MinimizeButtonIconType.CLOSE:
      closeIcon = <CloseLarge aria-label={closeButtonLabel} slot="icon" />;
      break;
    case MinimizeButtonIconType.MINIMIZE:
      closeIcon = <SubtractLarge aria-label={closeButtonLabel} slot="icon" />;
      break;
    case MinimizeButtonIconType.SIDE_PANEL_LEFT:
      closeIsReversible = false;
      closeIcon = <SidePanelClose aria-label={closeButtonLabel} slot="icon" />;
      break;
    case MinimizeButtonIconType.SIDE_PANEL_RIGHT:
      closeIsReversible = false;
      closeReverseIcon = true;
      closeIcon = <SidePanelClose aria-label={closeButtonLabel} slot="icon" />;
      break;
    default: {
      closeIcon = <SubtractLarge aria-label={closeButtonLabel} slot="icon" />;
      break;
    }
  }

  // Add a "requestFocus" imperative function to the ref so other components can trigger focus here.
  useImperativeHandle(ref, () => ({
    requestFocus: () => {
      if (closeButtonRef.current) {
        doFocusRef(closeButtonRef, false, true);
        return true;
      }
      if (backButtonRef.current) {
        doFocusRef(backButtonRef, false, true);
        return true;
      }
      if (restartButtonRef.current && !isRestarting) {
        doFocusRef(restartButtonRef, false, true);
        return true;
      }
      return false;
    },
  }));

  let leftContent;

  const handleOverflowClick = overflowClicked ?? (() => {});

  if (overflowItems) {
    // If there are overflow items, we need to show the overflow menu. This overrides any back button that may be
    // present.
    leftContent = (
      <OverflowMenu
        className="cds-aichat--header__overflow-menu"
        ref={overflowRef}
        align={
          isRTL ? BUTTON_TOOLTIP_POSITION.LEFT : BUTTON_TOOLTIP_POSITION.RIGHT
        }
        tooltip-text={overflowMenuTooltip}
        aria-label={overflowMenuAriaLabel}
      >
        <span slot="tooltip-content">{overflowMenuTooltip}</span>
        <OverflowMenuVertical
          aria-label={overflowMenuAriaLabel}
          className="cds--overflow-menu__icon"
          slot="icon"
        />
        <OverflowMenuBody>
          {overflowItems?.map((item, index) => (
            <OverflowMenuItem
              key={item}
              onClick={() => {
                // Move focus back to the overflow menu button.
                doFocusRef(overflowRef);
                handleOverflowClick(index);
              }}
            >
              {item}
            </OverflowMenuItem>
          ))}
        </OverflowMenuBody>
      </OverflowMenu>
    );
  } else if (showBackButton) {
    // With no overflow items, just show the back button.
    leftContent = (
      <HeaderButton
        className="cds-aichat--header__back-button"
        label={labelBackButton}
        onClick={onClickBack}
        buttonRef={backButtonRef}
        buttonKind={backButtonType}
        tooltipPosition={
          isRTL ? BUTTON_TOOLTIP_POSITION.LEFT : BUTTON_TOOLTIP_POSITION.RIGHT
        }
      >
        {backContent || (
          <ChevronDown aria-label={labelBackButton} slot="icon" />
        )}
      </HeaderButton>
    );
  }

  return (
    <div className="cds-aichat--header">
      <div className="cds-aichat--header--content" data-floating-menu-container>
        {leftContent && (
          <div className="cds-aichat--header__buttons cds-aichat--header__left-items">
            {leftContent}
          </div>
        )}
        <div className="cds-aichat--header__center-container">
          {(title || displayName) && (
            <div className="cds-aichat--header__title-container">
              <ChatHeaderTitle title={title} name={displayName} />
            </div>
          )}
        </div>
        <div className="cds-aichat--header__buttons cds-aichat--header__right-buttons">
          {showAiSlugContent && (
            <AISlug
              className="cds-aichat--header__slug"
              size={AI_LABEL_SIZE.EXTRA_SMALL}
              alignment={
                isRTL
                  ? POPOVER_ALIGNMENT.BOTTOM_LEFT
                  : POPOVER_ALIGNMENT.BOTTOM_RIGHT
              }
            >
              <div slot="body-text">
                {aiSlugLabel && (
                  <p className="cds-aichat--header__slug-label">
                    {aiSlugLabel}
                  </p>
                )}
                {aiSlugTitle && (
                  <h4 className="cds-aichat--header__slug-title">
                    {aiSlugTitle}
                  </h4>
                )}
                <div className="cds-aichat--header__slug-description">
                  <div>{aiSlugDescription}</div>
                  {aiSlugAfterDescriptionElement}
                </div>
              </div>
            </AISlug>
          )}
          {showRestartButton && (
            <HeaderButton
              className="cds-aichat--header__restart-button"
              label={restartButtonLabel ?? ""}
              onClick={onClickRestart}
              buttonRef={restartButtonRef}
              disabled={isRestarting}
              tooltipPosition={
                isRTL
                  ? BUTTON_TOOLTIP_POSITION.RIGHT
                  : BUTTON_TOOLTIP_POSITION.LEFT
              }
            >
              <Restart aria-label={restartButtonLabel ?? ""} slot="icon" />
            </HeaderButton>
          )}
          {!useHideCloseButton && (
            <HeaderButton
              className={cx("cds-aichat--header__close-button", {
                "cds-aichat--reverse-icon": closeReverseIcon,
              })}
              isReversible={closeIsReversible}
              label={closeButtonLabel ?? ""}
              onClick={async () => {
                onClickClose();
              }}
              buttonRef={closeButtonRef}
              tooltipPosition={
                isRTL
                  ? BUTTON_TOOLTIP_POSITION.RIGHT
                  : BUTTON_TOOLTIP_POSITION.LEFT
              }
              testId={PageObjectId.CLOSE_CHAT}
            >
              {closeIcon}
            </HeaderButton>
          )}
        </div>
      </div>
    </div>
  );
}

interface HeaderButtonProps extends HasClassName, HasChildren {
  /**
   * Called when the button is clicked.
   */
  onClick: () => void;

  /**
   * The ref to use for the actual button element.
   */
  buttonRef: RefObject<CDSButton | null>;

  /**
   * The aria label to use on the button.
   */
  label: string;

  /**
   * The carbon button kind to use.
   */
  buttonKind?: BUTTON_KIND;

  /**
   * Indicates if the icon should be reversible based on the document direction.
   */
  isReversible?: boolean;

  /**
   * Specify the alignment of the tooltip to the icon-only button. Can be one of: start, center, or end.
   */
  tooltipPosition?: BUTTON_TOOLTIP_POSITION;

  /**
   * Testing id used for e2e tests.
   */
  testId?: TestId;
  /**
   * Indicates if the button should be disabled.
   */
  disabled?: boolean;
}

/**
 * This component is a button that appears in the header.
 */
function HeaderButton({
  onClick,
  buttonRef,
  className,
  children,
  buttonKind,
  isReversible = true,
  tooltipPosition,
  testId,
  label,
  disabled = false,
}: HeaderButtonProps) {
  const buttonKindVal = buttonKind || BUTTON_KIND.GHOST;
  return (
    <Button
      ref={buttonRef}
      className={cx(className, {
        "cds-aichat--direction-has-reversible-svg": isReversible,
      })}
      onClick={onClick}
      size={BUTTON_SIZE.MEDIUM}
      kind={buttonKindVal as BUTTON_KIND}
      tooltipPosition={tooltipPosition}
      data-testid={testId}
      disabled={disabled}
      tooltipText={label}
    >
      {children}
    </Button>
  );
}

const HeaderExport = React.memo(forwardRef(Header));
export { HeaderExport as Header };
