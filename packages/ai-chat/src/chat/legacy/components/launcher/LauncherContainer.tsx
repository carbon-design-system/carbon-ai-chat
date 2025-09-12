/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useCallback, useRef } from "react";
import { useSelector } from "react-redux";

import { useEffectDidUpdate } from "../../../hooks/useEffectDidUpdate";
import { useServiceManager } from "../../../hooks/useServiceManager";
import { AppState, ViewType } from "../../../../types/state/AppState";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { IS_PHONE } from "../../../utils/browserUtils";
import { LauncherDesktopContainer } from "./LauncherDesktopContainer";
import { LauncherMobileContainer } from "./LauncherMobileContainer";
import { MainWindowOpenReason } from "../../../../types/events/eventBusTypes";

function LauncherContainer() {
  const serviceManager = useServiceManager();
  const launcherRef = useRef<HasRequestFocus>();
  const viewState = useSelector(
    (state: AppState) => state.persistedToBrowserStorage.viewState,
  );
  const initialViewChangeComplete = useSelector(
    (state: AppState) => state.initialViewChangeComplete,
  );
  const launcherHidden = !viewState.launcher;

  const requestFocus = useCallback(() => {
    launcherRef.current?.requestFocus();
  }, [launcherRef]);

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
    if (
      viewState.launcher &&
      !viewState.mainWindow &&
      initialViewChangeComplete
    ) {
      launcherRef.current?.requestFocus();
    }
  }, [viewState]);

  let launcherContainer;
  if (IS_PHONE) {
    launcherContainer = (
      <LauncherMobileContainer
        launcherRef={launcherRef}
        onToggleOpen={onDoToggle}
        launcherHidden={launcherHidden}
      />
    );
  } else {
    launcherContainer = (
      <LauncherDesktopContainer
        launcherRef={launcherRef}
        onDoToggle={onDoToggle}
        requestFocus={requestFocus}
        launcherHidden={launcherHidden}
      />
    );
  }
  return launcherContainer;
}

export { LauncherContainer };
