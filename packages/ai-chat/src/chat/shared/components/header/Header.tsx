/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/slug/index.js";
import CDSButton from "@carbon/web-components/es/components/button/button.js";
import Button, {
  BUTTON_KIND,
  BUTTON_SIZE,
  BUTTON_TOOLTIP_POSITION,
  BUTTON_TOOLTIP_ALIGNMENT,
} from "../../../react/carbon/Button";
import CDSMenu from "@carbon/web-components/es/components/menu/menu.js";
import MenuItem from "../../../react/carbon/MenuItem";
import CloseLarge16 from "@carbon/icons/es/close--large/16.js";
import DownToBottom16 from "@carbon/icons/es/down-to-bottom/16.js";
import Restart16 from "@carbon/icons/es/restart/16.js";
import SidePanelClose16 from "@carbon/icons/es/side-panel--close/16.js";
import SubtractLarge16 from "@carbon/icons/es/subtract--large/16.js";
import Menu16 from "@carbon/icons/es/menu/16.js";
import Close16 from "@carbon/icons/es/close/16.js";
import { AI_LABEL_SIZE } from "@carbon/web-components/es/components/ai-label/defs.js";
import { POPOVER_ALIGNMENT } from "@carbon/web-components/es/components/popover/defs.js";
import cx from "classnames";
import React, {
  forwardRef,
  Ref,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { carbonIconToReact } from "../../utils/carbonIcon";
import { ChatHeaderAvatarConfig } from "../../../../types/instance/ChatInstance";
import { ChatHeaderAvatar } from "../../../react/components/chatHeader/ChatHeaderAvatar";
import { ChatHeaderOverflowMenu } from "../../../react/components/chatHeader/ChatHeaderOverflowMenu";
import { ChatHeaderTitle } from "../../../react/components/chatHeader/ChatHeaderTitle";
import { HideComponentContext } from "../../contexts/HideComponentContext";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { usePrevious } from "../../hooks/usePrevious";
import { useServiceManager } from "../../hooks/useServiceManager";
import { AppState } from "../../../../types/state/AppState";
import { HasChildren } from "../../../../types/utilities/HasChildren";
import { HasClassName } from "../../../../types/utilities/HasClassName";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { BrandColorKind, WriteableElementName } from "../../utils/constants";
import { doFocusRef } from "../../utils/domUtils";
import { ConfirmModal } from "../modals/ConfirmModal";
import WriteableElement from "../WriteableElement";
// The React AI Slug from @carbon/react doesn't work in ShadowRoot, so we need to use the web component one.
import { AISlug } from "./AISlug";
import { MinimizeButtonIconType } from "../../../../types/config/PublicConfig";
import { OverlayPanelName } from "../OverlayPanel";
import { makeTestId, PageObjectId, TestId } from "../../utils/PageObjectId";

const Close = carbonIconToReact(Close16);
const Menu = carbonIconToReact(Menu16);
const CloseLarge = carbonIconToReact(CloseLarge16);
const DownToBottom = carbonIconToReact(DownToBottom16);
const Restart = carbonIconToReact(Restart16);
const SidePanelClose = carbonIconToReact(SidePanelClose16);
const SubtractLarge = carbonIconToReact(SubtractLarge16);

interface HeaderProps {
  /**
   * The name to display.
   */
  displayName?: string;

  /**
   * The config of the chat header avatar.
   */
  headerAvatarConfig?: ChatHeaderAvatarConfig;

  /**
   * Indicates if the close button should be hidden. This value is overridden if the top-level public config
   * hideCloseButton option is set to true.
   */
  hideCloseButton?: boolean;

  /**
   * Indicates if the close-and-restart button should be hidden. This property only applies if the close-and-restart
   * button is enabled.
   */
  hideCloseAndRestartButton?: boolean;

  /**
   * Indicates if the back button should be rendered.
   */
  showBackButton?: boolean;

  /**
   * Indicates if the restart button should be rendered.
   */
  showRestartButton?: boolean;

  /**
   * Indicates if the AI theme should be used.
   */
  useAITheme?: boolean;

  /**
   * The aria label to display on the back button.
   */
  labelBackButton?: string;

  /**
   * The type of button class to use on the back button.
   */
  backButtonType?: BUTTON_KIND;

  /**
   * The brand color type to use for the header. This will default to "primary".
   */
  brandColor?: BrandColorKind;

  /**
   * Determines if the chat header items should be visible.
   */
  enableChatHeaderConfig?: boolean;

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
   * This callback is called when the user clicks the close-and-restart button and confirms the action.
   */
  onCloseAndRestart?: () => void;

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
   * The header component is used by multiple panels. This is a prefix for data-testid to keep buttons
   * in the header obviously unique.
   */
  testIdPrefix: OverlayPanelName;
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
    useAITheme,
    labelBackButton,
    onClickClose,
    onClickRestart,
    onCloseAndRestart,
    onClickBack,
    overflowItems,
    overflowClicked,
    backButtonType,
    hideCloseButton,
    hideCloseAndRestartButton,
    brandColor = "primary",
    enableChatHeaderConfig,
    headerAvatarConfig,
    testIdPrefix,
  } = props;

  const backButtonRef = useRef<CDSButton>();
  const restartButtonRef = useRef<CDSButton>();
  const closeAndRestartButtonRef = useRef<CDSButton>();
  const closeButtonRef = useRef<CDSButton>();
  const overflowRef = useRef<CDSMenu>();
  const serviceManager = useServiceManager();
  const languagePack = useLanguagePack();
  const publicConfig = useSelector((state: AppState) => state.config.public);
  const isRTL = document.dir === "rtl";
  const chatHeaderConfig = useSelector(
    (state: AppState) => state.chatHeaderState.config,
  );
  const [overflowIsOpen, setOverflowIsOpen] = useState(false);
  const [confirmModelOpen, setConfirmModelOpen] = useState(false);

  const [isImageError, setIsImageError] = useState(false);
  const hasHeaderAvatar = Boolean(headerAvatarConfig) && !isImageError;
  const isHidden = useContext(HideComponentContext);
  const prevChatHeaderAvatarURL = usePrevious(headerAvatarConfig?.url);

  const { headerConfig } = publicConfig;

  // The title and name to display in the header from the chat header config.
  const chatHeaderTitle = enableChatHeaderConfig
    ? chatHeaderConfig?.headerTitle?.title
    : undefined;
  const chatHeaderName = enableChatHeaderConfig
    ? chatHeaderConfig?.headerTitle?.name
    : undefined;
  // The chat name to display in the chat header, the configured chat header name should take priority.
  const chatHeaderDisplayName = chatHeaderName || displayName;

  const closeConfirmModel = useCallback(() => {
    setConfirmModelOpen(false);
  }, []);

  const showCloseAndRestartButton =
    headerConfig?.showCloseAndRestartButton &&
    !hideCloseAndRestartButton &&
    onCloseAndRestart;

  const useHideCloseButton =
    headerConfig?.hideMinimizeButton || hideCloseButton;

  // The icon to use for the close button.
  let closeIcon: React.ReactNode;
  let closeReverseIcon = false;
  let closeIsReversible = true;
  const minimizeButtonIconType = headerConfig?.minimizeButtonIconType;
  switch (minimizeButtonIconType) {
    case MinimizeButtonIconType.CLOSE:
      closeIcon = (
        <CloseLarge
          aria-label={languagePack.launcher_isOpen}
          slot="icon"
          className="WACIcon__Close"
        />
      );
      break;
    case MinimizeButtonIconType.MINIMIZE:
      closeIcon = (
        <SubtractLarge
          aria-label={languagePack.launcher_isOpen}
          slot="icon"
          className="WACIcon__Subtract"
        />
      );
      break;
    case MinimizeButtonIconType.SIDE_PANEL_LEFT:
      closeIsReversible = false;
      closeIcon = (
        <SidePanelClose
          aria-label={languagePack.launcher_isOpen}
          slot="icon"
          className="WACIcon__SidePanelClose"
        />
      );
      break;
    case MinimizeButtonIconType.SIDE_PANEL_RIGHT:
      closeIsReversible = false;
      closeReverseIcon = true;
      closeIcon = (
        <SidePanelClose
          aria-label={languagePack.launcher_isOpen}
          slot="icon"
          className="WACIcon__SidePanelClose"
        />
      );
      break;
    default: {
      closeIcon = (
        <SubtractLarge
          aria-label={languagePack.launcher_isOpen}
          slot="icon"
          className="WACIcon__Subtract"
        />
      );
      break;
    }
  }

  if (showCloseAndRestartButton && showRestartButton) {
    throw new Error(
      "You cannot enable both the restart button and the close-and-restart buttons.",
    );
  }

  const onConfirm = useCallback(() => {
    setConfirmModelOpen(false);
    onCloseAndRestart();
  }, [onCloseAndRestart]);

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
      if (restartButtonRef.current) {
        doFocusRef(restartButtonRef, false, true);
        return true;
      }
      return false;
    },
  }));

  let leftContent;

  if (overflowItems) {
    // If there are overflow items, we need to show the overflow menu. This overrides any back button that may be
    // present.
    leftContent = (
      <ChatHeaderOverflowMenu
        className="WACHeader__OverflowMenu"
        renderIcon={overflowIsOpen ? Close : Menu}
        iconDescription={languagePack.header_overflowMenu_options}
        ariaLabel={languagePack.components_overflow_ariaLabel}
        containerRef={overflowRef}
        tooltipPosition={
          isRTL ? BUTTON_TOOLTIP_POSITION.LEFT : BUTTON_TOOLTIP_POSITION.RIGHT
        }
        menuAlignment="bottom-start"
        onOpen={() => {
          // This requires a setTimeout because of an apparent bug in the Carbon components. If the icon changes
          // when you click on it, the component swaps in a new icon meaning the old icon is no longer part of the
          // DOM and the component detects this as a "clicked outside" which triggers the component to close. This will
          // delay the swapping of the icon until after component is open.
          setTimeout(() => {
            setOverflowIsOpen(true);
          });
        }}
        onClose={() => {
          setOverflowIsOpen(false);
        }}
      >
        {overflowItems?.map((item, index) => (
          <MenuItem
            key={item}
            label={item}
            onClick={() => {
              // Move focus back to the overflow menu button.
              doFocusRef(overflowRef);
              overflowClicked(index);
            }}
          />
        ))}
      </ChatHeaderOverflowMenu>
    );
  } else if (showBackButton) {
    // With no overflow items, just show the back button.
    leftContent = (
      <HeaderButton
        className="WACHeader__BackButton"
        tooltipText={labelBackButton}
        onClick={onClickBack}
        buttonRef={backButtonRef}
        buttonKind={backButtonType}
        tooltipPosition={
          isRTL ? BUTTON_TOOLTIP_POSITION.LEFT : BUTTON_TOOLTIP_POSITION.RIGHT
        }
      >
        {backContent || (
          <DownToBottom aria-label={labelBackButton} slot="icon" />
        )}
      </HeaderButton>
    );
  }

  useEffect(() => {
    if (isImageError && prevChatHeaderAvatarURL !== headerAvatarConfig?.url) {
      setIsImageError(false);
    }
  }, [prevChatHeaderAvatarURL, headerAvatarConfig?.url, isImageError]);

  return (
    <div
      className={cx("WACHeader", `WAC--${brandColor}Color`, {
        "WACHeader--withAvatar": hasHeaderAvatar,
      })}
    >
      <div
        className={cx("WACHeader--content", `WAC--${brandColor}Color`)}
        data-floating-menu-container
      >
        {leftContent && (
          <div className="WACHeader__Buttons WACHeader__LeftButtons">
            {leftContent}
          </div>
        )}
        <div className="WACHeader__CenterContainer">
          {hasHeaderAvatar && (
            <ChatHeaderAvatar
              url={headerAvatarConfig.url}
              corners={headerAvatarConfig.corners}
              alt={languagePack.header_ariaBotAvatar}
              onError={() => setIsImageError(true)}
            />
          )}
          {(chatHeaderTitle || chatHeaderDisplayName) && (
            <div className="WACHeader__TitleContainer">
              <ChatHeaderTitle
                title={chatHeaderTitle}
                name={chatHeaderDisplayName}
              />
            </div>
          )}
        </div>
        <div className="WACHeader__Buttons WACHeader__RightButtons">
          {useAITheme && (
            <AISlug
              className="WACHeader__Slug"
              size={AI_LABEL_SIZE.EXTRA_SMALL}
              alignment={
                isRTL
                  ? POPOVER_ALIGNMENT.BOTTOM_LEFT
                  : POPOVER_ALIGNMENT.BOTTOM_RIGHT
              }
            >
              <div slot="body-text">
                <h4 className="WACHeader__Slug-title">
                  {languagePack.ai_slug_title}
                </h4>
                <div className="WACHeader__Slug-description">
                  <div>{languagePack.ai_slug_description}</div>
                  {!isHidden && (
                    <WriteableElement
                      slotName={
                        WriteableElementName.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT
                      }
                      id={`aiTooltipAfterDescription${serviceManager.namespace.suffix}`}
                    />
                  )}
                </div>
              </div>
            </AISlug>
          )}
          {showRestartButton && (
            <HeaderButton
              className="WACHeader__RestartButton"
              tooltipText={languagePack.buttons_restart}
              onClick={onClickRestart}
              buttonRef={restartButtonRef}
              tooltipAlignment={
                isRTL
                  ? BUTTON_TOOLTIP_ALIGNMENT.START
                  : BUTTON_TOOLTIP_ALIGNMENT.END
              }
              tooltipPosition={BUTTON_TOOLTIP_POSITION.BOTTOM}
            >
              <Restart aria-label={languagePack.buttons_restart} slot="icon" />
            </HeaderButton>
          )}
          {!useHideCloseButton && (
            <HeaderButton
              className={cx("WACHeader__CloseButton", {
                WACReverseIcon: closeReverseIcon,
              })}
              isReversible={closeIsReversible}
              tooltipText={languagePack.launcher_isOpen}
              onClick={async () => {
                onClickClose();
              }}
              buttonRef={closeButtonRef}
              tooltipAlignment={
                isRTL
                  ? BUTTON_TOOLTIP_ALIGNMENT.START
                  : BUTTON_TOOLTIP_ALIGNMENT.END
              }
              tooltipPosition={BUTTON_TOOLTIP_POSITION.BOTTOM}
              testId={makeTestId(PageObjectId.CLOSE_CHAT, testIdPrefix)}
            >
              {closeIcon}
            </HeaderButton>
          )}
          {showCloseAndRestartButton && (
            <HeaderButton
              className="WACHeader__CloseAndRestartButton"
              tooltipText={languagePack.header_ariaCloseRestart}
              onClick={() => setConfirmModelOpen(true)}
              buttonRef={closeAndRestartButtonRef}
              tooltipAlignment={
                isRTL
                  ? BUTTON_TOOLTIP_ALIGNMENT.START
                  : BUTTON_TOOLTIP_ALIGNMENT.END
              }
              tooltipPosition={BUTTON_TOOLTIP_POSITION.BOTTOM}
            >
              <CloseLarge
                aria-label={languagePack.header_ariaCloseRestart}
                slot="icon"
                className="WACIcon__Close"
              />
            </HeaderButton>
          )}
        </div>
        {confirmModelOpen && (
          <ConfirmModal
            title={languagePack.closeAndRestartModal_title}
            message={languagePack.closeAndRestartModal_message}
            onConfirm={onConfirm}
            onCancel={closeConfirmModel}
            cancelButtonLabel={languagePack.closeAndRestartModal_cancel}
            confirmButtonLabel={languagePack.closeAndRestartModal_confirm}
            modalAnnounceMessage={languagePack.closeAndRestartModal_message}
            serviceManager={serviceManager}
          />
        )}
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
  buttonRef: RefObject<CDSButton>;

  /**
   * Specify the text to be rendered in the tooltip.
   */
  tooltipText: string;

  /**
   * The carbon button kind to use.
   */
  buttonKind?: BUTTON_KIND;

  /**
   * Indicates if the icon should be reversible based on the document direction.
   */
  isReversible?: boolean;
  /**
   * Specify the alignment of the tooltip to the icon-only button.
   * Can be one of: start, center, or end.
   */
  tooltipAlignment?: BUTTON_TOOLTIP_ALIGNMENT;

  /**
   * Specify the alignment of the tooltip to the icon-only button. Can be one of: start, center, or end.
   */
  tooltipPosition?: BUTTON_TOOLTIP_POSITION;

  /**
   * Testing id used for e2e tests.
   */
  testId?: TestId;
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
  tooltipAlignment,
  tooltipPosition,
  tooltipText,
  testId,
}: HeaderButtonProps) {
  const buttonKindVal = buttonKind || BUTTON_KIND.GHOST;
  return (
    <Button
      ref={buttonRef}
      className={cx(className, { WACDirectionHasReversibleSVG: isReversible })}
      onClick={onClick}
      size={BUTTON_SIZE.MEDIUM}
      kind={buttonKindVal as BUTTON_KIND}
      tooltipAlignment={tooltipAlignment}
      tooltipPosition={tooltipPosition}
      tooltipText={tooltipText}
      data-testid={testId}
    >
      {children}
    </Button>
  );
}

const HeaderExport = React.memo(forwardRef(Header));
export { HeaderExport as Header };
