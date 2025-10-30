/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useCallback, useEffect, useRef } from "react";
import { useSelector } from "../../hooks/useSelector";

import { useEffectDidUpdate } from "../../hooks/useEffectDidUpdate";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useServiceManager } from "../../hooks/useServiceManager";
import actions from "../../store/actions";
import { IS_PHONE } from "../../utils/browserUtils";
import { TIME_TO_ENTRANCE_ANIMATION_START } from "../../../types/config/LauncherConfig";
import { AppState, ViewType } from "../../../types/state/AppState";
import { Launcher } from "./Launcher";
import type { LauncherHandle } from "./Launcher";
import { MainWindowOpenReason } from "../../../types/events/eventBusTypes";
import { PageObjectId } from "../../utils/PageObjectId";

function LauncherContainer() {
  const serviceManager = useServiceManager();
  const languagePack = useLanguagePack();
  const launcherRef = useRef<LauncherHandle | null>(null);
  const autoExtendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasScheduledAutoExtendRef = useRef(false);

  const {
    viewState,
    launcherIsExpanded,
    launcherWasReduced,
    showUnreadIndicator,
  } = useSelector((state: AppState) => state.persistedToBrowserStorage);
  const unreadHumanAgentCount = useSelector(
    (state: AppState) => state.humanAgentState.numUnreadMessages,
  );
  const { launcher, themeWithDefaults } = useSelector(
    (state: AppState) => state.config.derived,
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
  const isExpandedLauncherEnabled = Boolean(launcherConfig?.isOn);
  const launcherGreetingMessage =
    launcherConfig?.title ||
    (IS_PHONE
      ? languagePack.launcher_mobileGreeting
      : languagePack.launcher_desktopGreeting);
  const aiEnabled = themeWithDefaults.aiEnabled;
  const launcherAvatarUrl = launcherConfig?.avatarUrlOverride;
  const showCloseButton = !IS_PHONE;

  const clearAutoExtendTimeout = useCallback(() => {
    const timeoutId = autoExtendTimeoutRef.current;
    if (timeoutId) {
      clearTimeout(timeoutId);
      autoExtendTimeoutRef.current = null;
    }
  }, []);

  const setLauncherWasReduced = useCallback(
    (value: boolean) => {
      serviceManager.store.dispatch(
        actions.setLauncherProperty("launcherWasReduced", value),
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
      setLauncherWasReduced(false);
      setLauncherIsExpanded(true);
    }, timeToExpand);
  }, [
    clearAutoExtendTimeout,
    setLauncherIsExpanded,
    setLauncherWasReduced,
    timeToExpand,
  ]);

  const handleClose = useCallback(() => {
    clearAutoExtendTimeout();
    setLauncherIsExpanded(false);
  }, [clearAutoExtendTimeout, setLauncherIsExpanded]);

  const onDoToggle = useCallback(() => {
    // Otherwise try to open the main window on launcher click.
    return serviceManager.actions.changeView(ViewType.MAIN_WINDOW, {
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

    if (launcherWasReduced || launcherIsExpanded) {
      clearAutoExtendTimeout();
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
    launcherWasReduced,
    scheduleAutoExtend,
  ]);

  useEffect(() => () => clearAutoExtendTimeout(), [clearAutoExtendTimeout]);

  return (
    <Launcher
      launcherRef={launcherRef}
      onToggleOpen={onDoToggle}
      onClose={handleClose}
      launcherHidden={launcherHidden}
      extended={launcherIsExpanded}
      wasReduced={launcherWasReduced}
      setLauncherWasReduced={setLauncherWasReduced}
      showUnreadIndicator={showUnreadIndicator}
      unreadHumanAgentCount={unreadHumanAgentCount}
      mainWindowOpen={isMainWindowOpen}
      launcherGreetingMessage={launcherGreetingMessage}
      launcherAvatarUrl={launcherAvatarUrl}
      showCloseButton={showCloseButton}
      closeButtonLabel={languagePack.launcher_ariaIsExpanded}
      closedLabel={languagePack.launcher_isClosed}
      openLabel={languagePack.launcher_isOpen}
      formatUnreadMessageLabel={({ count }) =>
        serviceManager.intl.formatMessage(
          { id: "icon_ariaUnreadMessages" },
          { count },
        )
      }
      aiEnabled={aiEnabled}
      dataTestId={PageObjectId.LAUNCHER}
    />
  );
}

export { LauncherContainer };
