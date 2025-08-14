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
import React, { useMemo, useRef, useState, useEffect } from "react";
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
import {
  IS_PHONE,
  IS_PHONE_IN_PORTRAIT_MODE,
  isBrowser,
} from "../utils/browserUtils";
import { consoleDebug, consoleError } from "../utils/miscUtils";
import {
  convertCSSVariablesToString,
  getThemeClassNames,
} from "../utils/styleUtils";
import MainWindow from "./main/MainWindow";
import { MainWindowFunctions } from "./main/MainWindowFunctions";
import { EnglishLanguagePack } from "../../../types/instance/apiTypes";

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

const applicationStylesheet =
  typeof CSSStyleSheet !== "undefined" ? new CSSStyleSheet() : null;
const cssVariableOverrideStylesheet =
  typeof CSSStyleSheet !== "undefined" ? new CSSStyleSheet() : null;

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

  const containerRef = useRef<HTMLDivElement>(null);

  const { namespace } = serviceManager;
  const { originalName } = namespace;

  const dispatch = useDispatch();

  const [windowSize, setWindowSize] = useState<Dimension>({
    width: isBrowser ? window.innerWidth : 0,
    height: isBrowser ? window.innerHeight : 0,
  });

  const cssVariableOverrideString = useMemo(() => {
    return convertCSSVariablesToString(cssVariableOverrides);
  }, [cssVariableOverrides]);

  // If direction is "rtl" then the Carbon AI Chat will render with the right-to-left styles.
  // If direction is anything else, the Carbon AI Chat uses left-to-right styles by default.
  // If document.dir cannot be determined, using auto will inherit directionality from the page.
  const dir = isBrowser ? document.dir || "auto" : "auto";

  useOnMount(() => {
    if (!isBrowser) {
      return () => {};
    }

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

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    if (hostElement) {
      // React doesn't let us set "!important" in a style value inline.
      containerRef.current.style.setProperty("height", "100%", "important");
      containerRef.current.style.setProperty("width", "100%", "important");
    }

    const rootNode = containerRef.current.getRootNode();

    const appStyles =
      applicationStyles || ".WACContainer { visibility: hidden; }";
    const cssVariableStyles = cssVariableOverrideString || "";

    if (rootNode instanceof ShadowRoot) {
      if (applicationStylesheet && cssVariableOverrideStylesheet) {
        applicationStylesheet.replaceSync(appStyles);
        cssVariableOverrideStylesheet.replaceSync(cssVariableStyles);

        rootNode.adoptedStyleSheets = [
          applicationStylesheet,
          cssVariableOverrideStylesheet,
        ];
      } else {
        // have fallback when adoptedStylesheets are not supported (ie playwright testing)
        if (!rootNode.querySelector("style[data-base-styles]")) {
          const baseStyles = document.createElement("style");
          baseStyles.dataset.appStyles = "true";
          baseStyles.textContent = appStyles;
          rootNode.appendChild(baseStyles);
        }

        if (!rootNode.querySelector("style[data-variables-custom]")) {
          const variableCustomStyles = document.createElement("style");
          variableCustomStyles.dataset.overrideStyles = "true";
          variableCustomStyles.textContent = cssVariableStyles;
          rootNode.appendChild(variableCustomStyles);
        }
      }
    }
  }, [applicationStyles, containerRef, cssVariableOverrideString, hostElement]);

  return (
    <div
      className="WACContainer"
      data-namespace={originalName}
      ref={containerRef}
    >
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
  // if the main Carbon AI Chat window is open.
  const showLauncher = useSelector(
    (state: AppState) => state.launcher.config.is_on
  );

  const mainWindowRef = useRef<MainWindowFunctions>();

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
    // Always render the main window and let it control whether it should be visible with css.  return (
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
      {showLauncher && <LauncherContainer />}
    </div>
  );
}

export default App;
