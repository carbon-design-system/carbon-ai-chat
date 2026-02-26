/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type CDSButton from "@carbon/web-components/es/components/button/button.js";
import type CDSOverflowMenu from "@carbon/web-components/es/components/overflow-menu/overflow-menu";
import CloseLarge16 from "@carbon/icons/es/close--large/16.js";
import Home16 from "@carbon/icons/es/home/16.js";
import OverflowMenuVertical16 from "@carbon/icons/es/overflow-menu--vertical/16.js";
import Restart16 from "@carbon/icons/es/restart/16.js";
import RightPanelClose16 from "@carbon/icons/es/right-panel--close/16.js";
import SidePanelClose16 from "@carbon/icons/es/side-panel--close/16.js";
import SubtractLarge16 from "@carbon/icons/es/subtract--large/16.js";
import { AI_LABEL_SIZE } from "@carbon/web-components/es/components/ai-label/defs.js";
import { POPOVER_ALIGNMENT } from "@carbon/web-components/es/components/popover/defs.js";
import cx from "classnames";
import React, {
  forwardRef,
  Ref,
  RefObject,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import Button, {
  BUTTON_KIND,
  BUTTON_SIZE,
  BUTTON_TOOLTIP_POSITION,
} from "../../components/carbon/Button";
import { AISlug } from "../../components/carbon/AISlug";
import OverflowMenu from "../../components/carbon/OverflowMenu";
import OverflowMenuBody from "../../components/carbon/OverflowMenuBody";
import OverflowMenuItem from "../../components/carbon/OverflowMenuItem";
import WriteableElement from "../../components/util/WriteableElement";
import { ChatHeaderTitle } from "../../ai-chat-components/react/components/chatHeader/ChatHeaderTitle";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useSelector } from "../../hooks/useSelector";
import { useServiceManager } from "../../hooks/useServiceManager";
import { shallowEqual } from "../../store/appStore";
import { selectHumanAgentDisplayState } from "../../store/selectors";
import { carbonIconToReact } from "../../utils/carbonIcon";
import { WriteableElementName } from "../../utils/constants";
import { doFocusRef } from "../../utils/domUtils";
import {
  HeaderConfig,
  MinimizeButtonIconType,
} from "../../../types/config/PublicConfig";
import { AppState } from "../../../types/state/AppState";
import { HasChildren } from "../../../types/utilities/HasChildren";
import { HasClassName } from "../../../types/utilities/HasClassName";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { PageObjectId, TestId } from "../../../testing/PageObjectId";

const CloseLarge = carbonIconToReact(CloseLarge16);
const Home = carbonIconToReact(Home16);
const OverflowMenuVertical = carbonIconToReact(OverflowMenuVertical16);
const Restart = carbonIconToReact(Restart16);
const RightPanelClose = carbonIconToReact(RightPanelClose16);
const SidePanelClose = carbonIconToReact(SidePanelClose16);
const SubtractLarge = carbonIconToReact(SubtractLarge16);

/**
 * This component renders the header that appears on the main bot view.
 */

interface HeaderProps {
  /**
   * This callback is called when the user clicks the close button.
   */
  onClose: () => void;

  /**
   * This callback is called when the user clicks the restart button.
   */
  onRestart?: () => void;

  /**
   * The callback that can be called to toggle between the home screen and the bot view.
   */
  onToggleHomeScreen: () => void;

  /**
   * The name of the bot to display.
   */
  headerDisplayName: string;

  /**
   * Indicates if the homescreen is currently active/visible.
   */
  isHomeScreenActive?: boolean;

  /**
   * Optional header config overrides, merged with derived defaults.
   */
  headerConfigOverride?: Partial<HeaderConfig>;
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

function Header(props: HeaderProps, ref: Ref<HasRequestFocus>) {
  const {
    onClose,
    onRestart,
    onToggleHomeScreen,
    headerDisplayName,
    isHomeScreenActive,
    headerConfigOverride,
  } = props;
  const serviceManager = useServiceManager();
  const languagePack = useLanguagePack();
  const homeScreenIsOn = useSelector((state: AppState) => {
    const homescreen = state.config.public.homescreen;
    return homescreen?.isOn && !homescreen?.disableReturn;
  });
  const derivedPublicConfig = useSelector(
    (state: AppState) => state.config.derived,
  );
  const mergedHeaderConfig = useMemo(() => {
    if (!headerConfigOverride) {
      return derivedPublicConfig.header;
    }

    const filteredOverrides = Object.entries(headerConfigOverride).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          (acc as Record<string, unknown>)[key] = value;
        }
        return acc;
      },
      {} as Partial<HeaderConfig>,
    );

    return {
      ...derivedPublicConfig.header,
      ...filteredOverrides,
    };
  }, [derivedPublicConfig.header, headerConfigOverride]);

  const customMenuOptions = mergedHeaderConfig.menuOptions;
  const memoizedCustomMenuOptions = useMemo(
    () => customMenuOptions || undefined,
    [customMenuOptions],
  );
  const headerConfig = mergedHeaderConfig;
  const { isConnectingOrConnected } = useSelector(
    selectHumanAgentDisplayState,
    shallowEqual,
  );
  const isRestarting = useSelector((state: AppState) => state.isRestarting);
  const backButtonRef = useRef<CDSButton>(undefined);
  const restartButtonRef = useRef<CDSButton>(undefined);
  const closeButtonRef = useRef<CDSButton>(undefined);
  const overflowRef = useRef<CDSOverflowMenu>(undefined);
  const isRTL = document.dir === "rtl";

  const showRestartButton = headerConfig?.showRestartButton;
  const showAiLabel = headerConfig?.showAiLabel;
  const minimizeButtonIconType =
    headerConfig?.minimizeButtonIconType ?? MinimizeButtonIconType.MINIMIZE;
  const hideCloseButton = headerConfig?.hideMinimizeButton ?? false;
  const headerTitle = headerConfig?.title ?? undefined;
  const chatHeaderDisplayName =
    headerConfig?.name || headerDisplayName || undefined;
  const backButtonLabel = languagePack.homeScreen_returnToHome;
  const closeButtonLabel = languagePack.launcher_isOpen;
  const overflowMenuTooltip = languagePack.header_overflowMenu_options;
  const overflowMenuAriaLabel = languagePack.components_overflow_ariaLabel;
  const restartButtonLabel = languagePack.buttons_restart;
  const aiSlugLabel = languagePack.ai_slug_label;
  const aiSlugTitle = languagePack.ai_slug_title;
  const aiSlugDescription = languagePack.ai_slug_description;

  // We can't allow the user to return to the home screen if the user is connecting or connected to an agent.
  // Also don't show the back button if we're already on the homescreen
  const allowHomeScreen =
    homeScreenIsOn && !isConnectingOrConnected && !isHomeScreenActive;
  const showBackButton = Boolean(allowHomeScreen && onToggleHomeScreen);

  const overflowClicked = useCallback(
    (index: number) => {
      if (index === 0 && allowHomeScreen) {
        onToggleHomeScreen?.();
      } else {
        const handler =
          memoizedCustomMenuOptions?.[allowHomeScreen ? index - 1 : index]
            ?.handler;
        handler?.();
      }
    },
    [memoizedCustomMenuOptions, onToggleHomeScreen, allowHomeScreen],
  );

  const overflowItems = memoizedCustomMenuOptions?.map((option) => option.text);
  if (overflowItems && allowHomeScreen) {
    // Insert a "Home screen" option at the top.
    overflowItems.splice(0, 0, languagePack.homeScreen_overflowMenuHomeScreen);
  }

  // Expose a consistent focus target for the header.
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

  const aiSlugAfterDescriptionElement = (
    <WriteableElement
      slotName={WriteableElementName.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT}
      id={`aiTooltipAfterDescription${serviceManager.namespace.suffix}`}
    />
  );
  const shouldShowAiLabel = showAiLabel !== undefined ? showAiLabel : true;
  const showAiSlugContent =
    shouldShowAiLabel &&
    !!(
      aiSlugLabel ||
      aiSlugTitle ||
      aiSlugDescription ||
      aiSlugAfterDescriptionElement
    );
  const useHideCloseButton = hideCloseButton ?? false;
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
      closeIcon = <RightPanelClose aria-label={closeButtonLabel} slot="icon" />;
      break;
    default: {
      closeIcon = <SubtractLarge aria-label={closeButtonLabel} slot="icon" />;
      break;
    }
  }

  let leftContent: React.ReactNode;
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
        label={backButtonLabel}
        onClick={onToggleHomeScreen}
        buttonRef={backButtonRef}
        tooltipPosition={
          isRTL ? BUTTON_TOOLTIP_POSITION.LEFT : BUTTON_TOOLTIP_POSITION.RIGHT
        }
      >
        <Home aria-label={backButtonLabel} slot="icon" />
      </HeaderButton>
    );
  }

  return (
    <div className="cds-aichat--header__container">
      <div className="cds-aichat--header">
        <div
          className="cds-aichat--header--content"
          data-floating-menu-container
        >
          {leftContent && (
            <div className="cds-aichat--header__buttons cds-aichat--header__left-items">
              {leftContent}
            </div>
          )}
          <div className="cds-aichat--header__center-container">
            {(headerTitle || chatHeaderDisplayName) && (
              <div className="cds-aichat--header__title-container">
                <ChatHeaderTitle
                  title={headerTitle}
                  name={chatHeaderDisplayName}
                />
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
                aria-label={aiSlugLabel}
                role="button"
              >
                <div role="dialog" slot="body-text">
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
                onClick={onRestart ?? (() => {})}
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
                onClick={onClose}
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
    </div>
  );
}

const HeaderExport = React.memo(forwardRef(Header));
export { HeaderExport as Header };
