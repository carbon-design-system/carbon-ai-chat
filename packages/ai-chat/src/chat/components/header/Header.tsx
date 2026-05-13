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
import Launch16 from "@carbon/icons/es/launch/16.js";
import Menu16 from "@carbon/icons/es/menu/16.js";
import Restart16 from "@carbon/icons/es/restart/16.js";
import RightPanelOpen16 from "@carbon/icons/es/right-panel--open/16.js";
import RightPanelClose16 from "@carbon/icons/es/right-panel--close/16.js";
import BottomPanelClose16 from "@carbon/icons/es/bottom-panel--close/16.js";
import BottomPanelOpen16 from "@carbon/icons/es/bottom-panel--open/16.js";
import SubtractLarge16 from "@carbon/icons/es/subtract--large/16.js";
import View16 from "@carbon/icons/es/view/16.js";
import FolderOpen16 from "@carbon/icons/es/folder--open/16.js";
import Folders16 from "@carbon/icons/es/folders/16.js";
import { AI_LABEL_SIZE } from "@carbon/web-components/es/components/ai-label/defs.js";
import { POPOVER_ALIGNMENT } from "@carbon/web-components/es/components/popover/defs.js";
import React, {
  forwardRef,
  Ref,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { AISlug } from "../../components/carbon/AISlug";
import AILabelActionButton from "../../components/carbon/AILabelActionButton";
import IconButton from "../../components/carbon/IconButton";
import Link from "../../components/carbon/Link";
import Tag from "../../components/carbon/Tag";
import WriteableElement from "../../components/util/WriteableElement";
import { MarkdownWithDefaults } from "../util/MarkdownWithDefaults";
import ChatHeader from "@carbon/ai-chat-components/es/react/chat-header.js";
import type { ToolbarAction } from "@carbon/ai-chat-components/es/react/toolbar.js";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useSelector } from "../../hooks/useSelector";
import { useServiceManager } from "../../hooks/useServiceManager";
import { shallowEqual } from "../../store/appStore";
import { selectHumanAgentDisplayState } from "../../store/selectors";
import { WriteableElementName } from "../../utils/constants";
import { carbonIconToReact } from "../../utils/carbonIcon";
import { doFocusRef, isDirectionRTL } from "../../utils/domUtils";
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
import {
  BUTTON_SIZE,
  BUTTON_KIND,
} from "@carbon/web-components/es/components/button/button.js";
import {
  TAG_SIZE,
  TAG_TYPE,
} from "@carbon/web-components/es/components/tag/tag.js";

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
  headerDisplayName?: string;

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

  const LaunchIcon = carbonIconToReact(Launch16);
  const ViewIcon = carbonIconToReact(View16);
  const OpenFolderIcon = carbonIconToReact(FolderOpen16);
  const FoldersIcon = carbonIconToReact(Folders16);
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

  const [hasExplainabilityContent, setHasExplainabilityContent] =
    useState(false);

  const explainabilitySlotRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      return undefined;
    }

    const checkSlotContent = () => {
      const slotElement = node.querySelector("slot");

      if (!slotElement) {
        setHasExplainabilityContent(false);
        return;
      }

      // Check if slot has assigned nodes (web component mode)
      if (
        "assignedNodes" in slotElement &&
        typeof (slotElement as HTMLSlotElement).assignedNodes === "function"
      ) {
        const assigned = (slotElement as HTMLSlotElement).assignedNodes();

        // Check if assigned nodes have actual content
        const hasContent = assigned.some((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            return (node.textContent?.trim().length ?? 0) > 0;
          }
          // For element nodes, check if they have any content (children or text)
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const hasChildren = element.children.length > 0;
            const hasText = (element.textContent?.trim().length ?? 0) > 0;
            return hasChildren || hasText;
          }
          return false;
        });
        setHasExplainabilityContent(hasContent);
      } else {
        // React mode - the slot element itself will have children when content is provided
        // In React, content is rendered as children of the slot element, not assigned nodes
        const hasContent = Array.from(slotElement.childNodes).some((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return (child.textContent?.trim().length ?? 0) > 0;
          }
          return child.nodeType === Node.ELEMENT_NODE;
        });
        setHasExplainabilityContent(hasContent);
      }
    };

    // Initial check
    checkSlotContent();

    // Listen for slotchange events
    const slotElement = node.querySelector("slot");
    if (slotElement) {
      slotElement.addEventListener("slotchange", checkSlotContent);
      return () =>
        slotElement.removeEventListener("slotchange", checkSlotContent);
    }

    return undefined;
  }, []);

  const explainabilityPopoverContentElement = (
    <div ref={explainabilitySlotRef}>
      <WriteableElement
        slotName={WriteableElementName.EXPLAINABILITY_POPOVER_CONTENT}
        id={`explainabilityPopoverContent${serviceManager.namespace.suffix}`}
      />
    </div>
  );
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
            <div role="dialog" slot="body-text">
              {explainabilityPopoverContentElement}
              {!hasExplainabilityContent && (
                <div className="cds-aichat-explainability-popover--content">
                  <header className="cds-aichat-explainability-popover--content__header">
                    <div className="cds-aichat-explainability-popover--content__eyebrow-row">
                      <span className="cds-aichat-explainability-popover--content__label">
                        AI explained
                      </span>
                      <Tag
                        className="cds-aichat--header__slug-confidence"
                        size={TAG_SIZE.SMALL}
                        type={"outline" as TAG_TYPE}
                      >
                        Confidence: 89%
                      </Tag>
                    </div>
                    <h2 className="cds-aichat-explainability-popover--content__title">
                      Name of feature
                    </h2>
                    <p className="cds-aichat-explainability-popover--content__description">
                      High level 1-2 sentence description of how the AI is being
                      used in the UI.
                    </p>
                  </header>
                  <section className="cds-aichat-explainability-popover--content__section">
                    <div>
                      <h3>How it works</h3>
                      <MarkdownWithDefaults
                        text={
                          "1. **Key word.** Description of key word.\n2. **Key word.** Description of key word.\n3. **Key word.** Description of key word."
                        }
                      />
                    </div>
                    <div>
                      <h3>Data types used</h3>
                      <MarkdownWithDefaults
                        text={
                          "- **Data type 1.** Explain how it's used.\n- **Data type 2.** Explain how it's used.\n- **Data type 3.** Explain how it's used."
                        }
                      />
                    </div>
                  </section>
                  <section
                    className="cds-aichat-explainability-popover--content__section"
                    aria-labelledby="explainability-ai-model"
                  >
                    <div>
                      <h3>AI model</h3>
                      <Link
                        href="https://example.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <LaunchIcon
                          slot="icon"
                          className="icon"
                          aria-label="Launch"
                        />
                        granite.13b.v2.instruct
                      </Link>
                    </div>
                    <div>
                      <h4>Additional details</h4>
                      <p>
                        Additional information about data used to fine tune
                        and/or train the model
                      </p>
                    </div>
                  </section>
                  <section
                    className="cds-aichat-explainability-popover--content__section"
                    aria-labelledby="explainability-training-data"
                  >
                    <div>
                      <h3>Training data set</h3>
                      <Link
                        href="https://example.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <LaunchIcon
                          slot="icon"
                          className="icon"
                          aria-label="Launch"
                        />
                        IBM Security data piles
                      </Link>
                    </div>
                  </section>
                  {aiSlugAfterDescriptionElement}
                </div>
              )}
            </div>
            {!hasExplainabilityContent && (
              <>
                <IconButton
                  slot="actions"
                  size={BUTTON_SIZE.LARGE}
                  kind={BUTTON_KIND.GHOST}
                >
                  <FoldersIcon slot="icon" />
                  <span slot="tooltip-content">Folders</span>
                </IconButton>
                <IconButton
                  slot="actions"
                  size={BUTTON_SIZE.LARGE}
                  kind={BUTTON_KIND.GHOST}
                >
                  <OpenFolderIcon slot="icon" />
                  <span slot="tooltip-content">Open Folder</span>
                </IconButton>
                <IconButton
                  slot="actions"
                  size={BUTTON_SIZE.LARGE}
                  kind={BUTTON_KIND.GHOST}
                >
                  <ViewIcon slot="icon" />
                  <span slot="tooltip-content">View</span>
                </IconButton>
                <AILabelActionButton slot="actions">
                  View details
                </AILabelActionButton>
              </>
            )}
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
