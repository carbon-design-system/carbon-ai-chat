/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import FocusTrap from "focus-trap-react";
import React, {
  Ref,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useSelector } from "../hooks/useSelector";

import { AppState, CustomPanelConfigOptions } from "../../types/state/AppState";
import { HasChildren } from "../../types/utilities/HasChildren";
import { HasClassName } from "../../types/utilities/HasClassName";
import { HasRequestFocus } from "../../types/utilities/HasRequestFocus";
import { IS_MOBILE } from "../utils/browserUtils";
import { Header } from "./header/Header";
import { selectHasOpenPanelWithBackButton } from "../store/selectors";
import { useLanguagePack } from "../hooks/useLanguagePack";
import { MinimizeButtonIconType } from "../../types/config/PublicConfig";

interface BasePanelComponentProps
  extends HasClassName, HasChildren, CustomPanelConfigOptions {
  /**
   * Determines if the base panel should is open and allow us to track the panel opening. This will also make focus
   * trap active.
   */
  isOpen?: boolean;

  /**
   * The aria-label string for the back button.
   */
  labelBackButton?: string;

  /**
   * The name of the event being tracked. This is for tracking the panel being opened.
   */
  eventName?: string;

  /**
   * The description of the event being tracked. This is for tracking the panel being opened.
   */
  eventDescription?: string;

  /**
   * Controls whether to show the AI label in the header. When undefined, falls back to global config.
   */
  showAiLabel?: boolean;

  /**
   * Controls whether to show the restart button in the header. When undefined, falls back to global config.
   */
  showRestartButton?: boolean;

  /**
   * Indicates if the chat header config should be used for panel headers when a custom title is not provided.
   */
  enableChatHeaderConfig?: boolean;

  /**
   * Overflow items to display in the header menu. When undefined and {@link enableChatHeaderConfig} is true, the header
   * configuration menu items will be used automatically.
   */
  overflowItems?: string[];

  /**
   * Callback invoked when an overflow item is selected. When undefined and {@link enableChatHeaderConfig} is true, the
   * associated handler from the header configuration menu item will be used automatically.
   */
  overflowClicked?: (index: number) => void;
}

/**
 * This component is a custom panel that renders external content similar to custom response types.
 */
function BasePanelComponent(
  {
    className,
    children,
    isOpen,
    hidePanelHeader,
    labelBackButton,
    title,
    hideBackButton,
    hideCloseButton,
    onClickRestart,
    showAiLabel,
    showRestartButton: showRestartButtonProp,
    enableChatHeaderConfig,
    overflowItems: overflowItemsProp,
    overflowClicked: overflowClickedProp,
    ...headerProps
  }: BasePanelComponentProps,
  ref: Ref<HasRequestFocus>,
) {
  const languagePack = useLanguagePack();
  const derivedHeaderConfig = useSelector(
    (state: AppState) => state.config.derived.header,
  );
  const isRestarting = useSelector((state: AppState) => state.isRestarting);
  const showRestartButtonFromConfig = derivedHeaderConfig?.showRestartButton;
  const showRestartButton =
    showRestartButtonProp !== undefined
      ? showRestartButtonProp
      : showRestartButtonFromConfig;
  const headerMenuOptions = derivedHeaderConfig?.menuOptions;

  // Check if AssistantHeader is showing through (panel with back button is open)
  const hasPanelWithBackButton = useSelector(selectHasOpenPanelWithBackButton);
  const isShowingAssistantHeaderThrough =
    hasPanelWithBackButton && !hideBackButton;

  const headerRef = useRef<HasRequestFocus>(undefined);
  const panelContainerRef = useRef<HTMLDivElement | null>(null);
  const [panelContainerElement, setPanelContainerElement] =
    useState<HTMLDivElement | null>(null);

  // Reuse the imperative handles from the header.
  useImperativeHandle(ref, () => headerRef.current);
  const [focusTrapActive, setFocusTrapActive] = useState(false);

  const getPanelBackButton = useCallback((): HTMLElement | null => {
    const backButtonHost =
      panelContainerRef.current?.querySelector<
        HTMLElement & { shadowRoot?: ShadowRoot | null }
      >(".cds-aichat--header__back-button") ?? null;
    if (!backButtonHost) {
      return null;
    }
    const innerButton = backButtonHost.shadowRoot?.querySelector(
      "button",
    ) as HTMLElement | null;
    return innerButton ?? backButtonHost;
  }, []);

  const setPanelContainerRef = useCallback((element: HTMLDivElement | null) => {
    panelContainerRef.current = element;
    setPanelContainerElement(element);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setFocusTrapActive(false);
      return undefined;
    }
    setFocusTrapActive(true);
    const timer = setTimeout(() => {
      try {
        const focusTarget =
          getPanelBackButton() ?? panelContainerRef.current ?? null;
        if (focusTarget && focusTarget.offsetParent !== null) {
          focusTarget.focus();
        }
      } catch (error) {
        console.warn("Manual focus failed:", error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [getPanelBackButton, isOpen]);

  const hasCustomTitle = title !== undefined && title !== null;
  const shouldEnableChatHeaderConfig =
    enableChatHeaderConfig ?? !hasCustomTitle;
  const shouldUseConfigChrome =
    shouldEnableChatHeaderConfig && !isShowingAssistantHeaderThrough;
  let headerTitleText: string | undefined;
  let headerDisplayName: string | undefined;
  if (shouldUseConfigChrome) {
    headerTitleText = derivedHeaderConfig?.title ?? undefined;
    headerDisplayName = derivedHeaderConfig?.name ?? undefined;
  } else if (hasCustomTitle) {
    headerDisplayName = title ?? undefined;
  }
  const isHeaderEnabled = derivedHeaderConfig?.isOn !== false;
  const shouldRenderHeader =
    !hidePanelHeader && (isHeaderEnabled || isShowingAssistantHeaderThrough);
  const overflowItemsFromConfig = useMemo(() => {
    if (!headerMenuOptions?.length) {
      return undefined;
    }
    return headerMenuOptions.map((option) => option.text);
  }, [headerMenuOptions]);
  const overflowClickedFromConfig = useCallback(
    (index: number) => {
      const option = headerMenuOptions?.[index];
      option?.handler?.();
    },
    [headerMenuOptions],
  );
  const isUsingConfigOverflowItems =
    shouldUseConfigChrome &&
    overflowItemsProp === undefined &&
    Boolean(overflowItemsFromConfig);
  const overflowItemsToUse = isShowingAssistantHeaderThrough
    ? undefined
    : (overflowItemsProp ?? overflowItemsFromConfig ?? undefined);
  const overflowClickedToUse = isShowingAssistantHeaderThrough
    ? undefined
    : (overflowClickedProp ??
      (isUsingConfigOverflowItems ? overflowClickedFromConfig : undefined));

  return (
    <>
      <FocusTrap
        active={focusTrapActive}
        containerElements={
          panelContainerElement ? [panelContainerElement] : undefined
        }
        focusTrapOptions={{
          clickOutsideDeactivates: true,
          returnFocusOnDeactivate: !IS_MOBILE,
          preventScroll: true,
          tabbableOptions: {
            getShadowRoot: true,
          },
          fallbackFocus: () =>
            getPanelBackButton() ?? panelContainerRef.current ?? undefined,
        }}
      />
      {/* tabIndex is set in case there is nothing to focus on, shouldn't really ever get hit */}
      <div className={className} ref={setPanelContainerRef} tabIndex={-1}>
        {shouldRenderHeader && (
          <Header
            {...headerProps}
            ref={headerRef}
            overflowItems={overflowItemsToUse}
            overflowClicked={overflowClickedToUse}
            showRestartButton={
              isShowingAssistantHeaderThrough ? false : showRestartButton
            }
            onClickRestart={onClickRestart}
            showBackButton={!hideBackButton}
            labelBackButton={labelBackButton}
            title={headerTitleText}
            displayName={headerDisplayName}
            showAiLabel={isShowingAssistantHeaderThrough ? false : showAiLabel}
            hideCloseButton={
              isShowingAssistantHeaderThrough ? true : hideCloseButton
            }
            closeButtonLabel={languagePack.launcher_isOpen}
            overflowMenuTooltip={languagePack.header_overflowMenu_options}
            overflowMenuAriaLabel={languagePack.components_overflow_ariaLabel}
            restartButtonLabel={languagePack.buttons_restart}
            aiSlugLabel={languagePack.ai_slug_label}
            aiSlugTitle={languagePack.ai_slug_title}
            aiSlugDescription={languagePack.ai_slug_description}
            minimizeButtonIconType={
              derivedHeaderConfig?.minimizeButtonIconType ??
              MinimizeButtonIconType.MINIMIZE
            }
            isRestarting={isRestarting}
          />
        )}
        <div className="cds-aichat--panel-content">{children}</div>
      </div>
    </>
  );
}

const BasePanelComponentExport = React.memo(
  React.forwardRef(BasePanelComponent),
);

export { BasePanelComponentExport as BasePanelComponent };
