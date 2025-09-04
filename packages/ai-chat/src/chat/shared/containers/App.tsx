/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "intl-pluralrules";

import isEqual from "lodash-es/isEqual.js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import cx from "classnames";
import { RawIntlProvider, useIntl } from "react-intl";
import {
  Provider as ReduxProvider,
  useDispatch,
  useSelector,
} from "react-redux";

import { ServiceManager } from "../services/ServiceManager";
import {
  attachUserDefinedResponseHandlers,
  initServiceManagerAndInstance,
  mergePublicConfig,
  performInitialViewChange,
} from "../utils/chatBoot";
import styles from "../styles/export.scss";
import { UserDefinedResponsePortalsContainer } from "../../react/components/UserDefinedResponsePortalsContainer";
import { WriteableElementsPortalsContainer } from "../../react/components/WriteableElementsPortalsContainer";

import { LanguagePackContext } from "./../contexts/LanguagePackContext";
import { WindowSizeContext } from "./../contexts/WindowSizeContext";
import {
  HasServiceManager,
  ServiceManagerContext,
} from "./../hocs/withServiceManager";
import { AriaAnnouncerProvider } from "../components/aria/AriaAnnouncerProvider";
import { useOnMount } from "./../hooks/useOnMount";
import appActions from "./../store/actions";
import { AppState } from "../../../types/state/AppState";
import { Dimension } from "../../../types/utilities/Dimension";
import {
  IS_PHONE,
  IS_PHONE_IN_PORTRAIT_MODE,
  isBrowser,
} from "./../utils/browserUtils";
import { consoleError } from "./../utils/miscUtils";
import {
  convertCSSVariablesToString,
  getThemeClassNames,
} from "./../utils/styleUtils";
import MainWindow from "./main/MainWindow";
import { MainWindowFunctions } from "./main/MainWindowFunctions";

import { detectConfigChanges } from "../utils/configChangeDetection";
import { applyConfigChangesDynamically } from "../utils/dynamicConfigUpdates";

import {
  RenderUserDefinedState,
  RenderUserDefinedResponse,
  RenderWriteableElementResponse,
} from "../../../types/component/ChatContainer";
import type {
  ServiceDesk,
  ServiceDeskFactoryParameters,
  ServiceDeskPublicConfig,
} from "../../../types/config/ServiceDeskConfig";
import { ChatInstance } from "../../../types/instance/ChatInstance";
import { PublicConfig } from "../../../types/config/PublicConfig";
import { LauncherContainer } from "./../components/launcher/LauncherContainer";
import { enLanguagePack, LanguagePack } from "../../../types/instance/apiTypes";
import { DeepPartial } from "../../../types/utilities/DeepPartial";
import { setIntl } from "../utils/intlUtils";

/**
 * Props for the top-level Chat container. This component is responsible for
 * bootstrapping services and the chat instance, rendering the application shell,
 * and handling dynamic updates when the public config changes.
 */
interface AppProps {
  config: PublicConfig;
  strings?: DeepPartial<LanguagePack>;
  onBeforeRender?: (instance: ChatInstance) => Promise<void> | void;
  onAfterRender?: (instance: ChatInstance) => Promise<void> | void;
  renderUserDefinedResponse?: RenderUserDefinedResponse;
  renderWriteableElements?: RenderWriteableElementResponse;
  container: HTMLElement;
  element?: HTMLElement;
  setParentInstance?: React.Dispatch<React.SetStateAction<ChatInstance>>;
  chatWrapper?: HTMLElement;
  serviceDeskFactory?: (
    parameters: ServiceDeskFactoryParameters,
  ) => Promise<ServiceDesk>;
  serviceDesk?: ServiceDeskPublicConfig;
}

/**
 * Top-level Chat component that initializes the ServiceManager and ChatInstance,
 * then renders the app shell. Subsequent config changes are applied dynamically
 * without a hard reboot. If a change affects the human agent service while a
 * chat is active/connecting, the current human agent chat is ended quietly and
 * the service is recreated.
 */
export function App({
  config,
  strings,
  onBeforeRender,
  onAfterRender,
  renderUserDefinedResponse,
  renderWriteableElements,
  container,
  setParentInstance,
  element,
  chatWrapper,
  serviceDeskFactory,
  serviceDesk,
}: AppProps) {
  const [instance, setInstance] = useState<ChatInstance>(null);
  const [serviceManager, setServiceManager] = useState<ServiceManager>(null);
  const [beforeRenderComplete, setBeforeRenderComplete] =
    useState<boolean>(false);
  const [afterRenderCallback, setAfterRenderCallback] = useState<
    (() => void) | null
  >(null);

  const setInstances = (i: ChatInstance) => {
    setInstance(i);
    setParentInstance?.(i);
  };

  const [userDefinedResponseEventsBySlot, setUserDefinedResponseEventsBySlot] =
    useState<Record<string, RenderUserDefinedState>>({});

  const previousConfigRef = useRef<PublicConfig>(null);

  /**
   * On mount, fully initialize services and the chat instance, then render.
   */
  useOnMount(() => {
    previousConfigRef.current = config;
    /**
     * Performs the first-time bootstrap of services and the chat instance.
     * Attaches user-defined response handlers, executes lifecycle callbacks,
     * renders the instance, and triggers the initial view change.
     */
    const initializeChat = async () => {
      try {
        // Merge top-level service desk props into an effective config used internally
        const publicConfig = mergePublicConfig(config);
        if (serviceDeskFactory) {
          (publicConfig as any).serviceDeskFactory = serviceDeskFactory;
        }
        if (serviceDesk) {
          (publicConfig as any).serviceDesk = serviceDesk;
        }
        const { serviceManager, instance } =
          await initServiceManagerAndInstance({
            publicConfig,
            container,
            customHostElement: element,
          });

        // Apply strings overrides before initial render, if provided
        if (strings && Object.keys(strings as any).length) {
          const merged: LanguagePack = {
            ...enLanguagePack,
            ...(strings as any),
          };
          const locale =
            serviceManager.store.getState().config.public.locale || "en";
          setIntl(serviceManager, locale, merged);
        }

        attachUserDefinedResponseHandlers(
          instance,
          setUserDefinedResponseEventsBySlot,
        );
        setInstances(instance);

        if (onBeforeRender) {
          await onBeforeRender(instance);
        }

        setServiceManager(serviceManager);
        setBeforeRenderComplete(true);
        await performInitialViewChange(serviceManager);
        serviceManager.store.dispatch(
          appActions.setInitialViewChangeComplete(true),
        );

        if (onAfterRender) {
          setAfterRenderCallback(() => () => onAfterRender(instance));
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
      }
    };

    initializeChat();
  });

  /**
   * Reacts to config changes to dynamic configuration updates to an existing ServiceManager.
   */
  useEffect(() => {
    const previousConfig = previousConfigRef.current;
    previousConfigRef.current = config;

    if (
      serviceManager &&
      instance &&
      config &&
      !isEqual(previousConfig, config)
    ) {
      // Build effective configs that include top-level service desk props for change detection
      const prevEffective = mergePublicConfig(previousConfig);
      const nextEffective = mergePublicConfig(config);
      if (serviceDeskFactory) {
        (nextEffective as any).serviceDeskFactory = serviceDeskFactory;
      }
      if (serviceDesk) {
        (nextEffective as any).serviceDesk = serviceDesk;
      }
      const configChanges = detectConfigChanges(
        prevEffective as any,
        nextEffective as any,
      );
      const currentServiceManager = serviceManager;

      const handleDynamicUpdate = async () => {
        try {
          const publicConfig = nextEffective as any;
          await applyConfigChangesDynamically(
            configChanges,
            publicConfig,
            currentServiceManager,
          );
        } catch (error) {
          consoleError("Failed to apply config changes dynamically:", error);
        }
      };
      handleDynamicUpdate();
    }
  }, [config, serviceDeskFactory, serviceDesk, instance, serviceManager]);

  // Dynamically apply strings overrides on prop change
  useEffect(() => {
    if (!serviceManager) {
      return;
    }
    const overrides = strings as DeepPartial<LanguagePack> | undefined;
    if (overrides) {
      const merged: LanguagePack = { ...enLanguagePack, ...(overrides as any) };
      const locale =
        serviceManager.store.getState().config.public.locale || "en";
      setIntl(serviceManager, locale, merged);
    }
  }, [strings, serviceManager]);

  /**
   * Defers the `onAfterRender` callback until after the initial render commits
   * and all prerequisites (instance, serviceManager, and before-render tasks)
   * are complete. This avoids invoking `onAfterRender` mid-render and keeps the
   * sequencing deterministic.
   */
  useEffect(() => {
    if (
      afterRenderCallback &&
      serviceManager &&
      instance &&
      beforeRenderComplete
    ) {
      const timeoutId = setTimeout(() => {
        afterRenderCallback();
        setAfterRenderCallback(null);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [afterRenderCallback, serviceManager, instance, beforeRenderComplete]);

  if (!(serviceManager && instance && beforeRenderComplete)) {
    return null;
  }

  const combinedStyles = `${styles}`;

  return (
    <>
      <ReduxProvider store={serviceManager.store}>
        <AppShell
          serviceManager={serviceManager}
          hostElement={serviceManager.customHostElement}
          applicationStyles={combinedStyles}
        />
      </ReduxProvider>

      {renderUserDefinedResponse && (
        <UserDefinedResponsePortalsContainer
          chatInstance={instance}
          renderUserDefinedResponse={renderUserDefinedResponse}
          userDefinedResponseEventsBySlot={userDefinedResponseEventsBySlot}
          chatWrapper={chatWrapper}
        />
      )}

      {renderWriteableElements && (
        <WriteableElementsPortalsContainer
          chatInstance={instance}
          renderResponseMap={renderWriteableElements}
        />
      )}
    </>
  );
}

// Below is the content that lived in shared/containers/App.tsx (app shell + main container)

interface AppShellProps extends HasServiceManager {
  hostElement?: Element;
  applicationStyles: string;
}

const applicationStylesheet =
  typeof CSSStyleSheet !== "undefined" ? new CSSStyleSheet() : null;
const cssVariableOverrideStylesheet =
  typeof CSSStyleSheet !== "undefined" ? new CSSStyleSheet() : null;

function AppShell({
  serviceManager,
  hostElement,
  applicationStyles,
}: AppShellProps) {
  const languagePack = useSelector((state: AppState) => state.languagePack);
  const cssVariableOverrides = useSelector(
    (state: AppState) => state.config.derived.cssVariableOverrides,
  );
  const theme = useSelector(
    (state: AppState) => state.config.derived.themeWithDefaults,
  );
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
    const appStyles =
      applicationStyles || ".WACContainer { visibility: hidden; }";
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

interface AppRegionProps extends HasServiceManager {
  hostElement?: Element;
}

function AppRegion({ hostElement, serviceManager }: AppRegionProps) {
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
