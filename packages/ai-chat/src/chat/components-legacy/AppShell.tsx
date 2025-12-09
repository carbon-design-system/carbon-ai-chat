/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import cx from "classnames";
import { IntlProvider } from "../providers/IntlProvider";
import { useSelector } from "../hooks/useSelector";
import { useDispatch } from "../hooks/useDispatch";

import { LanguagePackProvider } from "../providers/LanguagePackProvider";
import { WindowSizeProvider } from "../providers/WindowSizeProvider";
import { HasServiceManager } from "../hocs/withServiceManager";
import { ServiceManagerProvider } from "../providers/ServiceManagerProvider";
import { AriaAnnouncerProvider } from "../providers/AriaAnnouncerProvider";
import { useOnMount } from "../hooks/useOnMount";
import appActions from "../store/actions";
import { AppState } from "../../types/state/AppState";
import { Dimension } from "../../types/utilities/Dimension";
import {
  IS_PHONE,
  IS_PHONE_IN_PORTRAIT_MODE,
  isBrowser,
} from "../utils/browserUtils";
import {
  convertCSSVariablesToString,
  getThemeClassNames,
} from "../utils/styleUtils";
import AppRegion from "./AppRegion";
import { useMobileViewportLayout } from "../hooks/useMobileViewportLayout";

interface AppShellProps extends HasServiceManager {
  hostElement?: Element;
  styles: string;
}

const applicationStylesheet =
  typeof CSSStyleSheet !== "undefined" ? new CSSStyleSheet() : null;
const cssVariableOverrideStylesheet =
  typeof CSSStyleSheet !== "undefined" ? new CSSStyleSheet() : null;
const visualViewportStylesheet =
  typeof CSSStyleSheet !== "undefined" ? new CSSStyleSheet() : null;

export default function AppShell({
  serviceManager,
  hostElement,
  styles,
}: AppShellProps) {
  const languagePack = useSelector(
    (state: AppState) => state.config.derived.languagePack,
  );
  const cssVariableOverrides = useSelector(
    (state: AppState) => state.config.derived.cssVariableOverrides,
  );
  const theme = useSelector(
    (state: AppState) => state.config.derived.themeWithDefaults,
  );
  const isMainWindowOpen = useSelector(
    (state: AppState) => state.persistedToBrowserStorage.viewState.mainWindow,
  );
  const config = useSelector((state: AppState) => state.config);
  const layout = useSelector((state: AppState) => state.config.derived.layout);

  const containerRef = useRef<HTMLDivElement>(null);

  const { namespace } = serviceManager;
  const { originalName } = namespace;

  const dispatch = useDispatch();

  const [windowSize, setWindowSize] = useState<Dimension>({
    width: isBrowser() ? window.innerWidth : 0,
    height: isBrowser() ? window.innerHeight : 0,
  });

  const useMobileEnhancements =
    IS_PHONE && !config.public.disableCustomElementMobileEnhancements;

  const cssVariableOverrideString = useMemo(() => {
    return convertCSSVariablesToString(cssVariableOverrides);
  }, [cssVariableOverrides]);

  const { style: visualViewportStyles } = useMobileViewportLayout({
    enabled: useMobileEnhancements,
    isOpen: isMainWindowOpen,
    margin: 4,
  });

  const dir = isBrowser() ? document.dir || "auto" : "auto";

  useOnMount(() => {
    if (!isBrowser) {
      return () => {};
    }

    const windowListener = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", windowListener);

    const visibilityListener = () => {
      dispatch(
        appActions.setIsBrowserPageVisible(
          document.visibilityState === "visible",
        ),
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
      containerRef.current.style.setProperty("height", "100%", "important");
      containerRef.current.style.setProperty("width", "100%", "important");
    }

    const rootNode = containerRef.current.getRootNode();
    const appStyles = styles;
    const cssVariableStyles = cssVariableOverrideString || "";
    const visualViewportCSS = Object.keys(visualViewportStyles || {}).length
      ? `.cds-aichat--container--render { ${Object.entries(visualViewportStyles)
          .map(([key, value]) => `${key}: ${value};`)
          .join(" ")} }`
      : "";

    if (rootNode instanceof ShadowRoot) {
      if (
        applicationStylesheet &&
        "replaceSync" in applicationStylesheet &&
        cssVariableOverrideStylesheet &&
        visualViewportStylesheet
      ) {
        applicationStylesheet.replaceSync(appStyles);
        cssVariableOverrideStylesheet.replaceSync(cssVariableStyles);
        visualViewportStylesheet.replaceSync(visualViewportCSS);
        rootNode.adoptedStyleSheets = [
          applicationStylesheet,
          cssVariableOverrideStylesheet,
          visualViewportStylesheet,
        ];
      } else {
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
        const viewportStyle = rootNode.querySelector(
          "style[data-visual-viewport-styles]",
        );
        if (viewportStyle) {
          viewportStyle.textContent = visualViewportCSS;
        } else {
          const visualViewportStyle = document.createElement("style");
          visualViewportStyle.dataset.visualViewportStyles = "true";
          visualViewportStyle.textContent = visualViewportCSS;
          rootNode.appendChild(visualViewportStyle);
        }
      }
    } else if (
      visualViewportStyles &&
      Object.keys(visualViewportStyles).length &&
      containerRef.current
    ) {
      const renderEl = containerRef.current.querySelector<HTMLElement>(
        ".cds-aichat--container--render",
      );
      if (renderEl) {
        Object.entries(visualViewportStyles).forEach(([key, value]) => {
          renderEl.style.setProperty(key, String(value));
        });
      }
    }
  }, [
    styles,
    containerRef,
    cssVariableOverrideString,
    hostElement,
    visualViewportStyles,
  ]);

  return (
    <div
      className="cds-aichat--container"
      data-namespace={originalName}
      ref={containerRef}
    >
      <div
        className={cx(
          `cds-aichat--container--render`,
          getThemeClassNames(theme),
          {
            "cds-aichat--container-disable-mobile-enhancements":
              hostElement &&
              config.public.disableCustomElementMobileEnhancements,
            "cds-aichat--is-phone":
              IS_PHONE && !config.public.disableCustomElementMobileEnhancements,
            "cds-aichat--is-phone-portrait-mode":
              IS_PHONE_IN_PORTRAIT_MODE &&
              !config.public.disableCustomElementMobileEnhancements,
            "cds-aichat--frameless": !layout?.showFrame,
          },
        )}
        data-theme={theme.derivedCarbonTheme}
        dir={dir}
      >
        <WindowSizeProvider windowSize={windowSize}>
          <ServiceManagerProvider serviceManager={serviceManager}>
            <IntlProvider intl={serviceManager.intl}>
              <LanguagePackProvider languagePack={languagePack}>
                <AriaAnnouncerProvider>
                  <AppRegion
                    serviceManager={serviceManager}
                    hostElement={hostElement}
                  />
                </AriaAnnouncerProvider>
              </LanguagePackProvider>
            </IntlProvider>
          </ServiceManagerProvider>
        </WindowSizeProvider>
      </div>
    </div>
  );
}
