/*
 *  Copyright IBM Corp. 2025, 2026
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
  attachCustomFooterHandler,
  initServiceManagerAndInstance,
  mergePublicConfig,
  performInitialViewChange,
} from "./utils/chatBoot";
import { UserDefinedResponsePortalsContainer } from "./components/portals/UserDefinedResponsePortalsContainer";
import {
  CustomFooterSlotState,
  CustomFooterPortalsContainer,
} from "./components/portals/CustomFooterPortalsContainer";
import { WriteableElementsPortalsContainer } from "./components/portals/WriteableElementsPortalsContainer";
import { LightDomPortalsContainer } from "./components/portals/LightDomPortalsContainer";
import { InputNodePortalsContainer } from "./components/portals/InputNodePortalsContainer";

import { useOnMount } from "./hooks/useOnMount";
import appActions from "./store/actions";
import { consoleError } from "./utils/miscUtils";
import { isBrowser } from "./utils/browserUtils";

import { detectConfigChanges } from "./utils/configChangeDetection";
import { applyConfigChangesDynamically } from "./utils/dynamicConfigUpdates";
import { resolvePromptLineMode } from "./components/input/promptLineMode";
import { preloadBuildCarbonExtensions } from "./components/input/buildExtensionsLoader";
import { preloadPromptLineRich } from "@carbon/ai-chat-components/es/components/input/src/prompt-line-rich-loader.js";

import {
  RenderUserDefinedState,
  RenderUserDefinedResponse,
  RenderUserDefinedInputNode,
  RenderCustomMessageFooter,
  RenderWriteableElementResponse,
} from "../types/component/ChatContainer";
import {
  MarkdownConfigContext,
  type MarkdownConfigContextValue,
} from "./contexts/MarkdownConfigContext";
import { ChatInstance } from "../types/instance/ChatInstance";
import { PublicConfig } from "../types/config/PublicConfig";
import { Dimension } from "../types/utilities/Dimension";
import AppShell from "./AppShell";

/**
 * Props for the top-level Chat container. This component is responsible for
 * bootstrapping services and the chat instance, rendering the application shell,
 * and handling dynamic updates when the public config changes.
 */
interface AppProps {
  config: PublicConfig;
  onBeforeRender?: (instance: ChatInstance) => Promise<void> | void;
  onAfterRender?: (instance: ChatInstance) => Promise<void> | void;
  renderUserDefinedResponse?: RenderUserDefinedResponse;
  renderUserDefinedInputNode?: RenderUserDefinedInputNode;
  renderCustomMessageFooter?: RenderCustomMessageFooter;
  renderWriteableElements?: RenderWriteableElementResponse;
  /**
   * Merged markdown config provided through {@link MarkdownConfigContext} for
   * deep consumers. Accepts either the React-flavor (`ChatContainerProps`) or
   * the web-component flavor (`WCMarkdown`) thanks to the permissive
   * {@link MarkdownConfigContextValue} type.
   * @experimental
   */
  markdown?: MarkdownConfigContextValue;
  container: HTMLElement;
  element?: HTMLElement;
  setParentInstance?: React.Dispatch<React.SetStateAction<ChatInstance>>;
  chatWrapper?: HTMLElement;
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
  onBeforeRender,
  onAfterRender,
  renderUserDefinedResponse,
  renderUserDefinedInputNode,
  renderCustomMessageFooter,
  renderWriteableElements,
  markdown,
  container,
  setParentInstance,
  element,
  chatWrapper,
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

  const [customFooterSlotsByName, setCustomFooterSlotsByName] = useState<
    Record<string, CustomFooterSlotState>
  >({});

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
        const publicConfig = mergePublicConfig(config);
        // Seed the previous config immediately to avoid dynamic updates during boot.
        previousConfigRef.current = publicConfig;

        const { serviceManager, instance } =
          await initServiceManagerAndInstance({
            publicConfig,
            container,
            customHostElement: element,
          });

        attachUserDefinedResponseHandlers(
          instance,
          setUserDefinedResponseEventsBySlot,
        );

        attachCustomFooterHandler(instance, setCustomFooterSlotsByName);

        setInstances(instance);

        if (onBeforeRender) {
          await onBeforeRender(instance);
        }

        // Warm the Tiptap chunks before the first render commits so a chat
        // configured for the rich editor mounts it directly (no textarea→editor
        // flash) and the prompt-line is present before hydration completes and
        // before `onAfterRender` resolves. Lite chats skip this and never
        // download Tiptap.
        if (resolvePromptLineMode(publicConfig.input) === "rich") {
          await Promise.all([
            preloadPromptLineRich(),
            preloadBuildCarbonExtensions(),
          ]);
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
    if (!serviceManager || !instance || !config || !beforeRenderComplete) {
      return;
    }

    const nextEffective = mergePublicConfig(config);

    const previousEffective = previousConfigRef.current;
    if (!previousEffective) {
      // Skip the initial run so we don't dispatch during first render.
      previousConfigRef.current = nextEffective;
      return;
    }

    if (isEqual(previousEffective, nextEffective)) {
      return;
    }

    const configChanges = detectConfigChanges(previousEffective, nextEffective);
    const currentServiceManager = serviceManager;

    const handleDynamicUpdate = async () => {
      try {
        await applyConfigChangesDynamically(
          configChanges,
          nextEffective,
          currentServiceManager,
        );
      } catch (error) {
        consoleError("Failed to apply config changes dynamically:", error);
      }
    };
    handleDynamicUpdate();
    previousConfigRef.current = nextEffective;
  }, [config, instance, serviceManager, beforeRenderComplete]);

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
              <MarkdownConfigContext.Provider value={markdown}>
                <AriaAnnouncerProvider>
                  <AppShell
                    serviceManager={serviceManager}
                    hostElement={serviceManager.customHostElement}
                    renderWriteableElements={renderWriteableElements}
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

                  {renderCustomMessageFooter && (
                    <CustomFooterPortalsContainer
                      chatInstance={instance}
                      renderCustomMessageFooter={renderCustomMessageFooter}
                      customFooterEventsBySlot={customFooterSlotsByName}
                      chatWrapper={chatWrapper}
                    />
                  )}

                  {renderWriteableElements && (
                    <WriteableElementsPortalsContainer
                      chatInstance={instance}
                      renderResponseMap={renderWriteableElements}
                    />
                  )}

                  <LightDomPortalsContainer chatWrapper={chatWrapper} />

                  {renderUserDefinedInputNode && (
                    <InputNodePortalsContainer
                      chatInstance={instance}
                      renderUserDefinedInputNode={renderUserDefinedInputNode}
                      chatWrapper={chatWrapper}
                    />
                  )}
                </AriaAnnouncerProvider>
              </MarkdownConfigContext.Provider>
            </LanguagePackProvider>
          </IntlProvider>
        </ServiceManagerProvider>
      </WindowSizeProvider>
    </StoreProvider>
  );
}

export default ChatAppEntry;
