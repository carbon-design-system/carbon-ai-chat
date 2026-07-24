/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type CDSButton from "@carbon/web-components/es/components/button/button.js";
import CloseLarge16 from "@carbon/icons/es/close--large/16.js";
import Home16 from "@carbon/icons/es/home/16.js";
import Menu16 from "@carbon/icons/es/menu/16.js";
import Restart16 from "@carbon/icons/es/restart/16.js";
import RightPanelOpen16 from "@carbon/icons/es/right-panel--open/16.js";
import RightPanelClose16 from "@carbon/icons/es/right-panel--close/16.js";
import BottomPanelClose16 from "@carbon/icons/es/bottom-panel--close/16.js";
import BottomPanelOpen16 from "@carbon/icons/es/bottom-panel--open/16.js";
import SubtractLarge16 from "@carbon/icons/es/subtract--large/16.js";
import { AI_LABEL_SIZE } from "@carbon/web-components/es/components/ai-label/defs.js";
import { POPOVER_ALIGNMENT } from "@carbon/web-components/es/components/popover/defs.js";
import React, {
  forwardRef,
  Ref,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { AISlug } from "../carbon/AISlug";
import WriteableElement from "../helpers/WriteableElement/WriteableElement";
import ChatHeader from "@carbon/ai-chat-components/es/react/chat-header.js";
import type { ToolbarAction } from "@carbon/ai-chat-components/es/react/toolbar.js";
import { useSelector } from "../../hooks/useSelector";
import { useServiceManager } from "../../hooks/useServiceManager";
import { shallowEqual } from "../../store/appStore";
import { selectHumanAgentDisplayState } from "../../store/selectors";
import { WriteableElementName } from "../../utils/constants";
import { doFocusRef, isDirectionRTL } from "../../utils/domUtils";
import {
  HeaderConfig,
  MinimizeButtonIconType,
} from "../../../types/config/HeaderConfig";
import { AppState } from "../../../types/state/AppState";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { PageObjectId } from "../../../testing/PageObjectId";
import {
  BusEventHeaderMenuClick,
  BusEventType,
  HeaderMenuClickType,
} from "../../../types/events/eventBusTypes";
import { BUTTON_SIZE } from "@carbon/web-components/es/components/button/button.js";

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
   * Indicates if the homescreen is currently active/visible.
   */
  isHomeScreenActive?: boolean;

  /**
   * Optional header config overrides, merged with derived defaults.
   */
  headerConfigOverride?: Partial<HeaderConfig>;
}

function Header(props: HeaderProps, ref: Ref<HasRequestFocus>) {
  const {
    onClose,
    onRestart,
    onToggleHomeScreen,
    isHomeScreenActive,
    headerConfigOverride,
  } = props;
  const serviceManager = useServiceManager();
  const languagePack = useSelector(
    (state: AppState) => ({
      homeScreen_returnToHome: state.languagePack.homeScreen_returnToHome,
      launcher_isOpen: state.languagePack.launcher_isOpen,
      header_overflowMenu_options:
        state.languagePack.header_overflowMenu_options,
      components_overflow_ariaLabel:
        state.languagePack.components_overflow_ariaLabel,
      buttons_restart: state.languagePack.buttons_restart,
      ai_slug_label: state.languagePack.ai_slug_label,
      ai_slug_title: state.languagePack.ai_slug_title,
      ai_slug_description: state.languagePack.ai_slug_description,
      homeScreen_overflowMenuHomeScreen:
        state.languagePack.homeScreen_overflowMenuHomeScreen,
    }),
    shallowEqual,
  );
  const homeScreenIsOn = useSelector((state: AppState) => {
    const homescreen = state.config.public.homescreen;
    return homescreen?.isOn && !homescreen?.disableReturn;
  });

  const derivedHeaderConfig = useSelector(
    (state: AppState) => state.config.derived.header,
  );

  const mergedHeaderConfig = useMemo(() => {
    if (!headerConfigOverride) {
      return derivedHeaderConfig;
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
      ...derivedHeaderConfig,
      ...filteredOverrides,
    };
  }, [derivedHeaderConfig, headerConfigOverride]);

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
  const isOpen = useSelector(
    (state: AppState) => state.persistedToBrowserStorage.viewState.mainWindow,
  );
  const isRestarting = useSelector((state: AppState) => state.isRestarting);
  const backButtonRef = useRef<CDSButton>(undefined);
  const chatHeaderRef = useRef<any>(null);
  const isRTL = isDirectionRTL();
  const showRestartButton = headerConfig?.showRestartButton;
  const showAiLabel = headerConfig?.showAiLabel;
  const minimizeButtonIconType =
    headerConfig?.minimizeButtonIconType ?? MinimizeButtonIconType.MINIMIZE;
  const hideCloseButton = headerConfig?.hideMinimizeButton ?? false;
  const headerTitle = headerConfig?.title ?? undefined;
  const chatHeaderDisplayName = headerConfig?.name || undefined;
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

  const overflowItems = memoizedCustomMenuOptions?.map((option) => option.text);
  if (overflowItems && allowHomeScreen) {
    // Insert a "Home screen" option at the top.
    overflowItems.splice(0, 0, languagePack.homeScreen_overflowMenuHomeScreen);
  }

  const handleBackButtonClick = useCallback(() => {
    // Fire the header menu click event for homescreen button
    const event: BusEventHeaderMenuClick = {
      type: BusEventType.HEADER_MENU_CLICK,
      clickType: HeaderMenuClickType.HOMESCREEN_BUTTON,
      menuItemText: backButtonLabel,
    };
    serviceManager.fire(event);

    onToggleHomeScreen?.();
  }, [onToggleHomeScreen, backButtonLabel, serviceManager]);

  const handleOverflowMenuClick = useCallback(() => {
    // Fire the header menu click event for overflow menu opened
    const event: BusEventHeaderMenuClick = {
      type: BusEventType.HEADER_MENU_CLICK,
      clickType: HeaderMenuClickType.OVERFLOW_MENU_OPENED,
    };
    serviceManager.fire(event);
  }, [serviceManager]);

  const overflowClicked = useCallback(
    (index: number) => {
      const menuItemText = overflowItems?.[index];

      // Fire the header menu click event
      const event: BusEventHeaderMenuClick = {
        type: BusEventType.HEADER_MENU_CLICK,
        clickType: HeaderMenuClickType.OVERFLOW_MENU_ITEM,
        menuItemIndex: index,
        menuItemText,
      };
      serviceManager.fire(event);

      if (index === 0 && allowHomeScreen) {
        onToggleHomeScreen?.();
      } else {
        const handler =
          memoizedCustomMenuOptions?.[allowHomeScreen ? index - 1 : index]
            ?.handler;
        handler?.();
      }
    },
    [
      memoizedCustomMenuOptions,
      onToggleHomeScreen,
      allowHomeScreen,
      overflowItems,
      serviceManager,
    ],
  );

  // Expose a consistent focus target for the header.
  // Delegate to ChatHeader's requestFocus method which handles internal priority
  useImperativeHandle(ref, () => ({
    requestFocus: () => {
      if (chatHeaderRef.current) {
        return chatHeaderRef.current.requestFocus();
      }
      // Fallback to back button if ChatHeader ref is not available
      if (backButtonRef.current) {
        doFocusRef(backButtonRef, false, true);
        return true;
      }
      return false;
    },
  }));

  const hideDefaultAiLabelContent =
    headerConfig?.hideDefaultAiLabelContent ?? false;

  const explainabilityPopoverContentElement = (
    <WriteableElement
      slotName={WriteableElementName.EXPLAINABILITY_POPOVER_CONTENT}
      id={`explainabilityPopoverContent${serviceManager.namespace.suffix}`}
      className="cds-aichat--header__slug-explainability-content"
      wrapperSlot="body-text"
    />
  );
  const explainabilityPopoverActionsElement = (
    <WriteableElement
      slotName={WriteableElementName.EXPLAINABILITY_POPOVER_ACTIONS}
      id={`explainabilityPopoverActions${serviceManager.namespace.suffix}`}
      className="cds-aichat--header__slug-explainability-actions"
      wrapperSlot="actions"
    />
  );

  const aiSlugAfterDescriptionElement = (
    <WriteableElement
      slotName={WriteableElementName.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT}
      id={`aiTooltipAfterDescription${serviceManager.namespace.suffix}`}
    />
  );
  const showAiSlugContent = showAiLabel !== undefined ? showAiLabel : true;
  const useHideCloseButton = hideCloseButton ?? false;

  // Build actions array for ChatHeader (can overflow)
  const actions = useMemo((): ToolbarAction[] => {
    const actionsArray: ToolbarAction[] = [...(headerConfig?.actions || [])];

    // Add restart button if enabled
    if (showRestartButton) {
      actionsArray.push({
        text: restartButtonLabel ?? "",
        icon: Restart16,
        onClick: onRestart ?? (() => {}),
        disabled: isRestarting,
        size: BUTTON_SIZE.MEDIUM,
        fixed: true,
      });
    }

    // Add close/minimize button if not hidden
    if (!useHideCloseButton) {
      let closeIconToUse = SubtractLarge16;
      switch (minimizeButtonIconType) {
        case MinimizeButtonIconType.CLOSE:
          closeIconToUse = CloseLarge16;
          break;
        case MinimizeButtonIconType.MINIMIZE:
          closeIconToUse = SubtractLarge16;
          break;
        case MinimizeButtonIconType.SIDE_PANEL_LEFT:
          closeIconToUse = isOpen ? RightPanelOpen16 : RightPanelClose16;
          break;
        case MinimizeButtonIconType.SIDE_PANEL_RIGHT:
          closeIconToUse = isOpen ? RightPanelClose16 : RightPanelOpen16;
          break;
        case MinimizeButtonIconType.SIDE_PANEL_DOWN:
          closeIconToUse = isOpen ? BottomPanelClose16 : BottomPanelOpen16;
          break;
        default:
          closeIconToUse = SubtractLarge16;
          break;
      }

      actionsArray.push({
        text: closeButtonLabel ?? "",
        icon: closeIconToUse,
        onClick: onClose,
        size: BUTTON_SIZE.MEDIUM,
        fixed: true,
        testId: PageObjectId.CLOSE_CHAT,
      });
    }

    return actionsArray;
  }, [
    closeButtonLabel,
    headerConfig?.actions,
    isOpen,
    isRestarting,
    minimizeButtonIconType,
    onClose,
    onRestart,
    restartButtonLabel,
    showRestartButton,
    useHideCloseButton,
  ]);

  // Determine navigation type and props
  const navigationType = overflowItems
    ? ("overflow" as const)
    : showBackButton
      ? ("back" as const)
      : ("none" as const);

  const navigationOverflowItemsWithHandlers = useMemo(() => {
    if (!overflowItems) {
      return undefined;
    }
    return overflowItems.map((text, index) => {
      // When homescreen is enabled, index 0 is the homescreen option
      // For all other indices, we need to look up the menu option at index - 1
      const menuOption =
        allowHomeScreen && index === 0
          ? undefined // This is the homescreen option, no menu option data
          : memoizedCustomMenuOptions?.[allowHomeScreen ? index - 1 : index];

      return {
        text,
        onClick: menuOption?.href
          ? undefined
          : () => {
              overflowClicked?.(index);
            },
        href: menuOption?.href,
        target: menuOption?.target,
        disabled: menuOption?.disabled,
        testId: menuOption?.testId,
      };
    });
  }, [
    overflowItems,
    overflowClicked,
    memoizedCustomMenuOptions,
    allowHomeScreen,
  ]);

  const hasContentMaxWidth = headerConfig?.hasContentMaxWidth ?? false;
  const headerContainerClassName = hasContentMaxWidth
    ? "cds-aichat--header__container cds-aichat--header-constrain-width"
    : "cds-aichat--header__container";

  return (
    <div className={headerContainerClassName}>
      <ChatHeader
        ref={chatHeaderRef}
        actions={actions}
        overflow={true}
        isRTL={isRTL}
        headerTitle={headerTitle}
        headerName={chatHeaderDisplayName}
        navigationType={navigationType}
        navigationBackIcon={Home16}
        navigationBackLabel={backButtonLabel}
        navigationBackOnClick={handleBackButtonClick}
        navigationOverflowItems={navigationOverflowItemsWithHandlers}
        navigationOverflowLabel={overflowMenuTooltip}
        navigationOverflowAriaLabel={overflowMenuAriaLabel}
        navigationOverflowIcon={Menu16}
        navigationOverflowOnClick={handleOverflowMenuClick}
        navigationTooltipAlign="right"
      >
        {/* Decorator slot - AI Label */}
        {showAiSlugContent && (
          <AISlug
            slot="decorator"
            className="cds-aichat--header__slug"
            size={AI_LABEL_SIZE.EXTRA_SMALL}
            aria-label={aiSlugLabel}
            role="button"
            alignment={
              isRTL
                ? POPOVER_ALIGNMENT.BOTTOM_LEFT
                : POPOVER_ALIGNMENT.BOTTOM_RIGHT
            }
          >
            {explainabilityPopoverContentElement}
            {!hideDefaultAiLabelContent && (
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
            )}
            {explainabilityPopoverActionsElement}
          </AISlug>
        )}
        {/* Fixed actions slot - Custom actions before close/minimize */}
        <WriteableElement
          wrapperSlot="fixed-actions"
          slotName={WriteableElementName.HEADER_FIXED_ACTIONS_ELEMENT}
          id={`headerFixedActionsElement${serviceManager.namespace.suffix}`}
        />
      </ChatHeader>
    </div>
  );
}

const HeaderExport = React.memo(forwardRef(Header));
export { HeaderExport as Header };
