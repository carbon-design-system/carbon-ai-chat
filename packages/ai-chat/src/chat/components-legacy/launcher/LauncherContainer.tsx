/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useCallback, useEffect, useRef } from "react";
import { useSelector } from "../../hooks/useSelector";

import { useEffectDidUpdate } from "../../hooks/useEffectDidUpdate";
import { useServiceManager } from "../../hooks/useServiceManager";
import { shallowEqual } from "../../store/appStore";
import actions from "../../store/actions";
import { IS_PHONE } from "../../utils/browserUtils";
import { TIME_TO_ENTRANCE_ANIMATION_START } from "../../../types/config/LauncherConfig";
import { AppState, ViewType } from "../../../types/state/AppState";
import { Launcher } from "./Launcher";
import type { LauncherHandle } from "./Launcher";
import {
  MainWindowOpenReason,
  ViewChangeReason,
} from "../../../types/events/eventBusTypes";
import { PageObjectId } from "../../../testing/PageObjectId";

function LauncherContainer() {
  const serviceManager = useServiceManager();
  const languagePack = useSelector(
    (state: AppState) => ({
      launcher_mobileGreeting: state.languagePack.launcher_mobileGreeting,
      launcher_desktopGreeting: state.languagePack.launcher_desktopGreeting,
      launcher_ariaIsExpanded: state.languagePack.launcher_ariaIsExpanded,
      launcher_isClosed: state.languagePack.launcher_isClosed,
      launcher_isOpen: state.languagePack.launcher_isOpen,
    }),
    shallowEqual,
  );
  const launcherRef = useRef<LauncherHandle | null>(null);
  const autoExtendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasScheduledAutoExtendRef = useRef(false);

  const {
    viewState,
    launcherIsExpanded,
    launcherShouldStartCallToActionCounterIfEnabled,
    showUnreadIndicator,
  } = useSelector(
    (state: AppState) => ({
      viewState: state.persistedToBrowserStorage.viewState,
      launcherIsExpanded: state.persistedToBrowserStorage.launcherIsExpanded,
      launcherShouldStartCallToActionCounterIfEnabled:
        state.persistedToBrowserStorage
          .launcherShouldStartCallToActionCounterIfEnabled,
      showUnreadIndicator: state.persistedToBrowserStorage.showUnreadIndicator,
    }),
    shallowEqual,
  );
  const unreadMessageCount = useSelector(
    (state: AppState) => state.humanAgentState.numUnreadMessages,
  );
  // Select the launcher sub-object and the aiEnabled primitive separately rather
  // than the whole `derived` object: after config-reference reconciliation the
  // `launcher` reference is stable when unchanged, and `aiEnabled` is a
  // primitive — so neither re-renders on unrelated config changes (e.g. theme,
  // header, layout).
  const launcher = useSelector(
    (state: AppState) => state.config.derived.launcher,
  );
  const aiEnabled = useSelector(
    (state: AppState) => state.config.derived.themeWithDefaults.aiEnabled,
  );

  const { launcher: isLauncherVisible, mainWindow: isMainWindowOpen } =
    viewState;
  const launcherHidden = !isLauncherVisible;
  const initialViewChangeComplete = useSelector(
    (state: AppState) => state.initialViewChangeComplete,
  );

  const launcherConfig = IS_PHONE ? launcher.mobile : launcher.desktop;
  const timeToExpand =
    launcherConfig?.timeToExpand ?? TIME_TO_ENTRANCE_ANIMATION_START;
  const isExpandedLauncherEnabled =
    Boolean(launcherConfig?.isOn) &&
    Boolean(launcherShouldStartCallToActionCounterIfEnabled);
  const launcherGreetingMessage =
    launcherConfig?.title ||
    (IS_PHONE
      ? languagePack.launcher_mobileGreeting
      : languagePack.launcher_desktopGreeting);
  const launcherAvatarUrl = launcherConfig?.avatarUrlOverride;

  const clearAutoExtendTimeout = useCallback(() => {
    const timeoutId = autoExtendTimeoutRef.current;
    if (timeoutId) {
      clearTimeout(timeoutId);
      autoExtendTimeoutRef.current = null;
    }
  }, []);

  const setLauncherShouldStartCounter = useCallback(
    (value: boolean) => {
      serviceManager.store.dispatch(
        actions.setLauncherProperty(
          "launcherShouldStartCallToActionCounterIfEnabled",
          value,
        ),
      );
    },
    [serviceManager.store],
  );

  const setLauncherIsExpanded = useCallback(
    (value: boolean) => {
      serviceManager.store.dispatch(
        actions.setLauncherProperty("launcherIsExpanded", value),
      );
    },
    [serviceManager.store],
  );

  const scheduleAutoExtend = useCallback(() => {
    clearAutoExtendTimeout();
    autoExtendTimeoutRef.current = setTimeout(() => {
      autoExtendTimeoutRef.current = null;
      setLauncherShouldStartCounter(false);
      setLauncherIsExpanded(true);
    }, timeToExpand);
  }, [
    clearAutoExtendTimeout,
    setLauncherIsExpanded,
    setLauncherShouldStartCounter,
    timeToExpand,
  ]);

  const handleClose = useCallback(() => {
    clearAutoExtendTimeout();
    setLauncherIsExpanded(false);
    setLauncherShouldStartCounter(false);
  }, [
    clearAutoExtendTimeout,
    setLauncherIsExpanded,
    setLauncherShouldStartCounter,
  ]);

  const onDoToggle = useCallback(() => {
    // Otherwise try to open the main window on launcher click.
    return serviceManager.actions.changeView(ViewType.MAIN_WINDOW, {
      viewChangeReason: ViewChangeReason.LAUNCHER_CLICKED,
      mainWindowOpenReason: MainWindowOpenReason.DEFAULT_LAUNCHER,
    });
  }, [serviceManager.actions]);

  useEffectDidUpdate(() => {
    // If the main window is closed, and the launcher is visible, then we should request focus on the
    // launcher. We need to wait for the initial view change to complete before requesting focus when the viewState
    // changes. This is because we don't want to request focus after the first view change when
    // Chat.startInternal switches from all views closed to whatever the starting view state is. Instead
    // we want to wait to request focus until after user interactions that trigger changes to the viewState.
    if (isLauncherVisible && !isMainWindowOpen && initialViewChangeComplete) {
      launcherRef.current?.requestFocus();
    }
  }, [initialViewChangeComplete, isLauncherVisible, isMainWindowOpen]);

  useEffect(() => {
    if (!isExpandedLauncherEnabled) {
      clearAutoExtendTimeout();
      hasScheduledAutoExtendRef.current = false;
      return undefined;
    }

    if (hasScheduledAutoExtendRef.current) {
      return () => {
        clearAutoExtendTimeout();
      };
    }

    hasScheduledAutoExtendRef.current = true;
    scheduleAutoExtend();

    return () => {
      clearAutoExtendTimeout();
    };
  }, [
    clearAutoExtendTimeout,
    isExpandedLauncherEnabled,
    launcherIsExpanded,
    scheduleAutoExtend,
  ]);

  useEffect(() => () => clearAutoExtendTimeout(), [clearAutoExtendTimeout]);

  const shouldShowUnreadIndicator = showUnreadIndicator && !launcherIsExpanded;

  return (
    <Launcher
      launcherRef={launcherRef}
      onToggleOpen={onDoToggle}
      onClose={handleClose}
      launcherHidden={launcherHidden}
      extended={launcherIsExpanded}
      showUnreadIndicator={shouldShowUnreadIndicator}
      unreadMessageCount={
        shouldShowUnreadIndicator
          ? Math.max(unreadMessageCount, 1)
          : unreadMessageCount
      }
      mainWindowOpen={isMainWindowOpen}
      launcherGreetingMessage={launcherGreetingMessage}
      launcherAvatarUrl={launcherAvatarUrl}
      closeButtonLabel={languagePack.launcher_ariaIsExpanded}
      closedLabel={languagePack.launcher_isClosed}
      openLabel={languagePack.launcher_isOpen}
      formatUnreadMessageLabel={({ count }) =>
        serviceManager.intl.formatMessage(
          { id: "icon_ariaUnreadMessages" },
          {
            count: shouldShowUnreadIndicator ? Math.max(count, 1) : count,
          },
        )
      }
      aiEnabled={aiEnabled}
      dataTestId={PageObjectId.LAUNCHER}
    />
  );
}

export { LauncherContainer };
