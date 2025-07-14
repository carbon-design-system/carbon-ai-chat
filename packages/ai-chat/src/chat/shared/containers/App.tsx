/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "intl-pluralrules";

import cx from "classnames";
import React, { Suspense, useMemo, useRef, useState } from "react";
import { RawIntlProvider, useIntl } from "react-intl";
import {
  Provider as ReduxProvider,
  useDispatch,
  useSelector,
} from "react-redux";

import { AriaAnnouncerProvider } from "../components/aria/AriaAnnouncerProvider";
import { LauncherContainer } from "../components/launcher/LauncherContainer";
import { LanguagePackContext } from "../contexts/LanguagePackContext";
import { WindowSizeContext } from "../contexts/WindowSizeContext";
import {
  HasServiceManager,
  ServiceManagerContext,
} from "../hocs/withServiceManager";
import { useOnMount } from "../hooks/useOnMount";
import actions from "../store/actions";
import { AppState } from "../../../types/state/AppState";
import { Dimension } from "../../../types/utilities/Dimension";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { IS_PHONE, IS_PHONE_IN_PORTRAIT_MODE } from "../utils/browserUtils";
import { consoleDebug, consoleError } from "../utils/miscUtils";
import {
  convertCSSVariablesToString,
  getThemeClassNames,
} from "../utils/styleUtils";
import MainWindow from "./main/MainWindow";
import { MainWindowFunctions } from "./main/MainWindowFunctions";
import { EnglishLanguagePack } from "../../../types/instance/apiTypes";
import { lazyTourComponent } from "../../dynamic-imports/dynamic-imports";

const TourContainerLazy = lazyTourComponent();

interface AppProps extends HasServiceManager {
  hostElement?: Element;
  applicationStyles: string;
  fontStyles?: string;
}

function App({
  serviceManager,
  hostElement,
  applicationStyles,
  fontStyles,
}: AppProps) {
  const { store } = serviceManager;
  const { config } = store.getState();

  if (config.public.debug) {
    consoleDebug("[render] Called render");
  }

  const combinedStyles = `${
    fontStyles ? `${fontStyles} ` : ""
  }${applicationStyles}`;

  return (
    <ReduxProvider store={store}>
      <AppContainer
        serviceManager={serviceManager}
        hostElement={hostElement}
        applicationStyles={combinedStyles}
      />
    </ReduxProvider>
  );
}

interface AppContainerProps extends HasServiceManager {
  hostElement?: Element;
  applicationStyles: string;
}

function AppContainer({
  serviceManager,
  hostElement,
  applicationStyles,
}: AppContainerProps) {
  const languagePack = useSelector((state: AppState) => state.languagePack);
  const cssVariableOverrides = useSelector(
    (state: AppState) => state.cssVariableOverrides
  );
  const theme = useSelector((state: AppState) => state.theme);
  const config = useSelector((state: AppState) => state.config);
  const layout = useSelector((state: AppState) => state.layout);

  const { namespace } = serviceManager;
  const { originalName } = namespace;

  const dispatch = useDispatch();

  const [windowSize, setWindowSize] = useState<Dimension>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const cssVariableOverrideString = useMemo(() => {
    return convertCSSVariablesToString(cssVariableOverrides);
  }, [cssVariableOverrides]);

  // If direction is "rtl" then the Carbon AI chat will render with the right-to-left styles.
  // If direction is anything else, the Carbon AI chat uses left-to-right styles by default.
  // If document.dir cannot be determined, using auto will inherit directionality from the page.
  const dir = document.dir || "auto";

  useOnMount(() => {
    // Add the listener for updating the window size.
    const windowListener = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", windowListener);

    // Add the listener for detecting page visibilities changes.
    const visibilityListener = () => {
      dispatch(
        actions.setIsBrowserPageVisible(document.visibilityState === "visible")
      );
    };
    document.addEventListener("visibilitychange", visibilityListener);

    return () => {
      window.removeEventListener("resize", windowListener);
      document.removeEventListener("visibilitychange", visibilityListener);
    };
  });

  return (
    <div
      className="WACContainer"
      data-namespace={originalName}
      ref={(node) => {
        if (node && hostElement) {
          // React doesn't let us set "!important" in a style value inline.
          node.style.setProperty("height", "100%", "important");
          node.style.setProperty("width", "100%", "important");
        }
      }}
    >
      <div className="WACContainer--styles">
        <style data-base-styles="true" nonce={config.public.cspNonce}>
          {applicationStyles || `.WACContainer { visibility: hidden; }`}
        </style>
        <style data-variables-custom="true" nonce={config.public.cspNonce}>
          {cssVariableOverrideString}
        </style>
      </div>
      <div
        className={cx(`WACContainer--render`, getThemeClassNames(theme), {
          "WACContainer-disableMobileEnhancements":
            hostElement && config.public.disableCustomElementMobileEnhancements,
          "WAC-isPhone":
            IS_PHONE && !config.public.disableCustomElementMobileEnhancements,
          "WAC-isPhonePortraitMode":
            IS_PHONE_IN_PORTRAIT_MODE &&
            !config.public.disableCustomElementMobileEnhancements,
          "WAC--frameless": !layout?.showFrame,
        })}
        dir={dir}
      >
        <WindowSizeContext.Provider value={windowSize}>
          <ServiceManagerContext.Provider value={serviceManager}>
            <RawIntlProvider value={serviceManager.intl}>
              <LanguagePackContext.Provider value={languagePack}>
                <AriaAnnouncerProvider>
                  <MainContainer
                    serviceManager={serviceManager}
                    hostElement={hostElement}
                  />
                </AriaAnnouncerProvider>
              </LanguagePackContext.Provider>
            </RawIntlProvider>
          </ServiceManagerContext.Provider>
        </WindowSizeContext.Provider>
      </div>
    </div>
  );
}

interface MainContainerProps extends HasServiceManager {
  hostElement?: Element;
}

function MainContainer(props: MainContainerProps) {
  const { hostElement, serviceManager } = props;

  // We always render the launcher (unless state.launcher.config.is_on is set to false), but we hide it with CSS
  // if the tour or main Carbon AI chat window are open.
  const showLauncher = useSelector(
    (state: AppState) => state.launcher.config.is_on
  );
  const { viewState } = useSelector(
    (state: AppState) => state.persistedToBrowserStorage.launcherState
  );

  const tourContainerRef = useRef<HasRequestFocus>();
  const mainWindowRef = useRef<MainWindowFunctions>();
  const showTour = viewState.tour;

  // This indicates if the tour has been opened at least once. The tour isn't rendered until it's been opened the first
  // time. Rendering of the tour is delayed to prevent the tour buttons being clicked by pen testing tools. After the
  // tour has been opened once it's simply shown and hidden using CSS, instead of unmounting it. CSS is used to show
  // and hide the tour so that the scroll position and video playback positions can be preserved within steps when
  // the tour is hidden.
  const showedTourOnce = useRef(showTour);
  showedTourOnce.current = showTour || showedTourOnce.current;

  const intl = useIntl();
  const namespace = serviceManager.namespace.originalName;
  const languageKey: keyof EnglishLanguagePack = namespace
    ? "window_ariaChatRegionNamespace"
    : "window_ariaChatRegion";
  const regionLabel = intl.formatMessage({ id: languageKey }, { namespace });

  useOnMount(() => {
    /**
     * Puts focus on the default element for the currently open window in the application.
     */
    function requestFocus() {
      try {
        const { persistedToBrowserStorage } = serviceManager.store.getState();
        const { viewState } = persistedToBrowserStorage.launcherState;

        if (viewState.tour) {
          // If there is a tour visible prioritize focusing on that over the main window.
          tourContainerRef.current?.requestFocus();
        } else if (viewState.mainWindow) {
          // If there is no tour visible then focus on the main window.
          mainWindowRef.current?.requestFocus();
        }
      } catch (error) {
        consoleError("An error occurred in App.requestFocus", error);
      }
    }

    serviceManager.appWindow = { requestFocus };
  });

  // Always render the main window and let it control whether it should be visible with css. Only render the tour
  // once it's been opened once.
  return (
    <div
      className="WACWidget__regionContainer"
      role="region"
      aria-label={regionLabel}
    >
      <MainWindow
        mainWindowRef={mainWindowRef}
        useCustomHostElement={Boolean(hostElement)}
        serviceManager={serviceManager}
      />
      {showedTourOnce.current && (
        <Suspense fallback={null}>
          <TourContainerLazy ref={tourContainerRef} />
        </Suspense>
      )}
      {showLauncher && <LauncherContainer />}
    </div>
  );
}

export default App;
