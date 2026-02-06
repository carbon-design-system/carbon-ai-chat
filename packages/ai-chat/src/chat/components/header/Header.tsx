/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type CDSButton from "@carbon/web-components/es/components/button/button.js";
import CloseLarge16 from "@carbon/icons/es/close--large/16.js";
import Home16 from "@carbon/icons/es/home/16.js";
import OverflowMenuVertical16 from "@carbon/icons/es/overflow-menu--vertical/16.js";
import Restart16 from "@carbon/icons/es/restart/16.js";
import SidePanelClose16 from "@carbon/icons/es/side-panel--close/16.js";
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
import { AISlug } from "../../components/carbon/AISlug";
import WriteableElement from "../../components/util/WriteableElement";
import ChatHeader from "@carbon/ai-chat-components/es/react/chat-header.js";
import type { ToolbarAction } from "@carbon/ai-chat-components/es/react/toolbar.js";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useSelector } from "../../hooks/useSelector";
import { useServiceManager } from "../../hooks/useServiceManager";
import { shallowEqual } from "../../store/appStore";
import { selectHumanAgentDisplayState } from "../../store/selectors";
import { WriteableElementName } from "../../utils/constants";
import { doFocusRef } from "../../utils/domUtils";
import {
  HeaderConfig,
  MinimizeButtonIconType,
} from "../../../types/config/PublicConfig";
import { AppState } from "../../../types/state/AppState";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { PageObjectId } from "../../../testing/PageObjectId";
import {
  BusEventHeaderMenuClick,
  BusEventType,
  HeaderMenuClickType,
} from "../../../types/events/eventBusTypes";

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
  const chatHeaderRef = useRef<any>(null);
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
        size: "md",
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
        case MinimizeButtonIconType.SIDE_PANEL_RIGHT:
          closeIconToUse = SidePanelClose16;
          break;
        default:
          closeIconToUse = SubtractLarge16;
          break;
      }

      actionsArray.push({
        text: closeButtonLabel ?? "",
        icon: closeIconToUse,
        onClick: onClose,
        size: "md",
        fixed: true,
        testId: PageObjectId.CLOSE_CHAT,
      });
    }

    return actionsArray;
  }, [
    closeButtonLabel,
    headerConfig?.actions,
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

  return (
    <div className="cds-aichat--header__container">
      <ChatHeader
        ref={chatHeaderRef}
        actions={actions}
        overflow={true}
        headerTitle={headerTitle}
        headerName={chatHeaderDisplayName}
        navigationType={navigationType}
        navigationBackIcon={Home16}
        navigationBackLabel={backButtonLabel}
        navigationBackOnClick={handleBackButtonClick}
        navigationOverflowItems={navigationOverflowItemsWithHandlers}
        navigationOverflowLabel={overflowMenuTooltip}
        navigationOverflowAriaLabel={overflowMenuAriaLabel}
        navigationOverflowIcon={OverflowMenuVertical16}
        navigationOverflowOnClick={handleOverflowMenuClick}
        navigationTooltipAlign={isRTL ? "left" : "right"}
      >
        {/* Decorator slot - AI Label */}
        {showAiSlugContent && (
          <AISlug
            slot="decorator"
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
                <p className="cds-aichat--header__slug-label">{aiSlugLabel}</p>
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
