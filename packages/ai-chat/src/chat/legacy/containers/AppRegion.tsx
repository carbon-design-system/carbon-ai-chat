/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useRef } from "react";
import { useIntl } from "react-intl";
import { useSelector } from "react-redux";

import { HasServiceManager } from "../../hocs/withServiceManager";
import { useOnMount } from "../../hooks/useOnMount";
import { AppState } from "../../../types/state/AppState";
import { consoleError } from "../../utils/miscUtils";
import MainWindow from "./main/MainWindow";
import { MainWindowFunctions } from "./main/MainWindowFunctions";
import { LauncherContainer } from "./../components/launcher/LauncherContainer";

interface AppRegionProps extends HasServiceManager {
  hostElement?: Element;
}

export default function AppRegion({
  hostElement,
  serviceManager,
}: AppRegionProps) {
  const intl = useIntl();
  const namespace = serviceManager.namespace.originalName;
  const languageKey = namespace
    ? "window_ariaChatRegionNamespace"
    : "window_ariaChatRegion";
  const regionLabel = intl.formatMessage(
    { id: languageKey as any },
    { namespace },
  );

  const showLauncher = useSelector(
    (state: AppState) => state.launcher.config.is_on,
  );
  const mainWindowRef = useRef<MainWindowFunctions>();

  useOnMount(() => {
    function requestFocus() {
      try {
        const { persistedToBrowserStorage } = serviceManager.store.getState();
        const { viewState } = persistedToBrowserStorage.launcherState;
        if (viewState.mainWindow) {
          mainWindowRef.current?.requestFocus();
        }
      } catch (error) {
        consoleError("An error occurred in App.requestFocus", error);
      }
    }
    serviceManager.appWindow = { requestFocus };
  });

  return (
    <div
      className="cds-aichat--widget__region-container"
      role="region"
      aria-label={regionLabel}
    >
      <MainWindow
        mainWindowRef={mainWindowRef}
        useCustomHostElement={Boolean(hostElement)}
      />
      {showLauncher && <LauncherContainer />}
    </div>
  );
}
