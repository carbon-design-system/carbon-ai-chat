/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from "lodash-es/isEqual.js";
import React, { useEffect, useRef, useState } from "react";
import { StoreProvider } from "./providers/StoreProvider";
import { WindowSizeProvider } from "./providers/WindowSizeProvider";
import { ServiceManagerProvider } from "./providers/ServiceManagerProvider";
import { IntlProvider } from "./providers/IntlProvider";
import { LanguagePackProvider } from "./providers/LanguagePackProvider";
import { AriaAnnouncerProvider } from "./providers/AriaAnnouncerProvider";
import { ServiceManager } from "./services/ServiceManager";
import {
  attachUserDefinedResponseHandlers,
  initServiceManagerAndInstance,
  mergePublicConfig,
  performInitialViewChange,
} from "./utils/chatBoot";
import { UserDefinedResponsePortalsContainer } from "./components/UserDefinedResponsePortalsContainer";
import { WriteableElementsPortalsContainer } from "./components/WriteableElementsPortalsContainer";

import { useOnMount } from "./hooks/useOnMount";
import appActions from "./store/actions";
import { consoleError } from "./utils/miscUtils";
import { isBrowser } from "./utils/browserUtils";

import { detectConfigChanges } from "./utils/configChangeDetection";
import { applyConfigChangesDynamically } from "./utils/dynamicConfigUpdates";

import {
  RenderUserDefinedState,
  RenderUserDefinedResponse,
  RenderWriteableElementResponse,
} from "../types/component/ChatContainer";
import type {
  ServiceDesk,
  ServiceDeskFactoryParameters,
  ServiceDeskPublicConfig,
} from "../types/config/ServiceDeskConfig";
import { ChatInstance } from "../types/instance/ChatInstance";
import { PublicConfig } from "../types/config/PublicConfig";
import { enLanguagePack, LanguagePack } from "../types/config/PublicConfig";
import { DeepPartial } from "../types/utilities/DeepPartial";
import { Dimension } from "../types/utilities/Dimension";
import { setIntl } from "./utils/intlUtils";
import AppShell from "./AppShell";

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
export function ChatAppEntry({
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
  const [instance, setInstance] = useState<ChatInstance | null>(null);
  const [serviceManager, setServiceManager] = useState<ServiceManager | null>(
    null,
  );
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

  const previousConfigRef = useRef<PublicConfig | null>(null);

  /**
   * On mount, fully initialize services and the chat instance, then render.
   */
  useOnMount(() => {
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
          publicConfig.serviceDeskFactory = serviceDeskFactory;
        }
        if (serviceDesk) {
          publicConfig.serviceDesk = serviceDesk;
        }
        const { serviceManager, instance } =
          await initServiceManagerAndInstance({
            publicConfig,
            container,
            customHostElement: element,
          });

        // Apply strings overrides before initial render, if provided
        if (strings && Object.keys(strings).length) {
          const merged: LanguagePack = {
            ...enLanguagePack,
            ...strings,
          };
          const locale =
            serviceManager.store.getState().config.public.locale || "en";
          setIntl(serviceManager, locale, merged);
          // Keep Redux language pack in sync so selectors/components read overrides
          serviceManager.store.dispatch(
            appActions.changeState({
              config: { derived: { languagePack: merged } },
            }),
          );
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

        previousConfigRef.current = publicConfig;

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

    if (
      serviceManager &&
      instance &&
      config &&
      !isEqual(previousConfig, config)
    ) {
      // Build effective configs that include top-level service desk props for change detection
      const prevEffective = mergePublicConfig(previousConfig || {});
      const nextEffective = mergePublicConfig(config);
      if (serviceDeskFactory) {
        nextEffective.serviceDeskFactory = serviceDeskFactory;
      }
      if (serviceDesk) {
        nextEffective.serviceDesk = serviceDesk;
      }
      const configChanges = detectConfigChanges(prevEffective, nextEffective);

      const currentServiceManager = serviceManager;

      const handleDynamicUpdate = async () => {
        try {
          const publicConfig = nextEffective;
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
      previousConfigRef.current = nextEffective;
    }
  }, [config, serviceDeskFactory, serviceDesk, instance, serviceManager]);

  // Dynamically apply strings overrides on prop change
  useEffect(() => {
    if (!serviceManager) {
      return;
    }
    const overrides = strings as DeepPartial<LanguagePack> | undefined;
    if (overrides) {
      const merged: LanguagePack = { ...enLanguagePack, ...overrides };
      const locale =
        serviceManager.store.getState().config.public.locale || "en";
      setIntl(serviceManager, locale, merged);
      // Update Redux language pack so state reflects overrides
      serviceManager.store.dispatch(
        appActions.changeState({
          config: { derived: { languagePack: merged } },
        }),
      );
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

  const [windowSize, setWindowSize] = useState<Dimension>({
    width: isBrowser() ? window.innerWidth : 0,
    height: isBrowser() ? window.innerHeight : 0,
  });

  useOnMount(() => {
    if (!isBrowser) {
      return () => {};
    }

    const windowListener = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", windowListener);

    const visibilityListener = () => {
      serviceManager?.store.dispatch(
        appActions.setIsBrowserPageVisible(
          document.visibilityState === "visible",
        ),
      );
    };

    document.addEventListener("visibilitychange", visibilityListener);

    return () => {
      window.removeEventListener("resize", windowListener);
      document.removeEventListener("visibilitychange", visibilityListener);
      serviceManager?.themeWatcherService?.stopWatching();
    };
  });

  if (!(serviceManager && instance && beforeRenderComplete)) {
    return null;
  }

  return (
    <StoreProvider store={serviceManager.store}>
      <WindowSizeProvider windowSize={windowSize}>
        <ServiceManagerProvider serviceManager={serviceManager}>
          <IntlProvider intl={serviceManager.intl}>
            <LanguagePackProvider>
              <AriaAnnouncerProvider>
                <AppShell
                  serviceManager={serviceManager}
                  hostElement={serviceManager.customHostElement}
                />
                {renderUserDefinedResponse && (
                  <UserDefinedResponsePortalsContainer
                    chatInstance={instance}
                    renderUserDefinedResponse={renderUserDefinedResponse}
                    userDefinedResponseEventsBySlot={
                      userDefinedResponseEventsBySlot
                    }
                    chatWrapper={chatWrapper}
                  />
                )}

                {renderWriteableElements && (
                  <WriteableElementsPortalsContainer
                    chatInstance={instance}
                    renderResponseMap={renderWriteableElements}
                  />
                )}
              </AriaAnnouncerProvider>
            </LanguagePackProvider>
          </IntlProvider>
        </ServiceManagerProvider>
      </WindowSizeProvider>
    </StoreProvider>
  );
}

export default ChatAppEntry;
