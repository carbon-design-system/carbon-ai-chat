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
import { RawIntlProvider } from "react-intl";
import { useDispatch, useSelector } from "react-redux";

import { LanguagePackContext } from "../../contexts/LanguagePackContext";
import { WindowSizeContext } from "../../contexts/WindowSizeContext";
import {
  HasServiceManager,
  ServiceManagerContext,
} from "../../hocs/withServiceManager";
import { AriaAnnouncerProvider } from "../components/aria/AriaAnnouncerProvider";
import { useOnMount } from "../../hooks/useOnMount";
import appActions from "../../store/actions";
import { AppState } from "../../../types/state/AppState";
import { Dimension } from "../../../types/utilities/Dimension";
import {
  IS_PHONE,
  IS_PHONE_IN_PORTRAIT_MODE,
  isBrowser,
} from "../../utils/browserUtils";
import {
  convertCSSVariablesToString,
  getThemeClassNames,
} from "../../utils/styleUtils";
import AppRegion from "./AppRegion";

interface AppShellProps extends HasServiceManager {
  hostElement?: Element;
  styles: string;
}

const applicationStylesheet =
  typeof CSSStyleSheet !== "undefined" ? new CSSStyleSheet() : null;
const cssVariableOverrideStylesheet =
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
  const config = useSelector((state: AppState) => state.config);
  const layout = useSelector((state: AppState) => state.config.derived.layout);

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

  const dir = isBrowser ? document.dir || "auto" : "auto";

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

    if (rootNode instanceof ShadowRoot) {
      if (
        applicationStylesheet &&
        "replaceSync" in applicationStylesheet &&
        cssVariableOverrideStylesheet
      ) {
        applicationStylesheet.replaceSync(appStyles);
        cssVariableOverrideStylesheet.replaceSync(cssVariableStyles);
        rootNode.adoptedStyleSheets = [
          applicationStylesheet,
          cssVariableOverrideStylesheet,
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
      }
    }
  }, [styles, containerRef, cssVariableOverrideString, hostElement]);

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
            "cds-aichat---is-phone":
              IS_PHONE && !config.public.disableCustomElementMobileEnhancements,
            "cds-aichat---is-phone-portrait-mode":
              IS_PHONE_IN_PORTRAIT_MODE &&
              !config.public.disableCustomElementMobileEnhancements,
            "cds-aichat--frameless": !layout?.showFrame,
          },
        )}
        dir={dir}
      >
        <WindowSizeContext.Provider value={windowSize}>
          <ServiceManagerContext.Provider value={serviceManager}>
            <RawIntlProvider value={serviceManager.intl}>
              <LanguagePackContext.Provider value={languagePack}>
                <AriaAnnouncerProvider>
                  <AppRegion
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
