/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from "lodash-es/isEqual.js";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StoreProvider } from "./providers/StoreProvider";
import { WindowSizeProvider } from "./providers/WindowSizeProvider";
import { ServiceManagerProvider } from "./providers/ServiceManagerProvider";
import { IntlProvider } from "./providers/IntlProvider";
import { AriaAnnouncerProvider } from "./providers/AriaAnnouncerProvider";
import { ServiceManager } from "./services/ServiceManager";
import {
  attachUserDefinedResponseHandlers,
  attachCustomFooterHandler,
  initServiceManagerAndInstance,
  mergePublicConfig,
  performInitialViewChange,
} from "./utils/chatBoot";
import { UserDefinedResponsePortalsContainer } from "./components/UserDefinedResponsePortalsContainer";
import {
  CustomFooterSlotState,
  CustomFooterPortalsContainer,
} from "./components/CustomFooterPortalsContainer";
import { WriteableElementsPortalsContainer } from "./components/WriteableElementsPortalsContainer";

import { useOnMount } from "./hooks/useOnMount";
import appActions from "./store/actions";
import { consoleError, consoleWarn } from "./utils/miscUtils";
import { isBrowser } from "./utils/browserUtils";

import { applyConfigChangesDynamically } from "./utils/dynamicConfigUpdates";

import {
  RenderUserDefinedState,
  RenderUserDefinedResponse,
  RenderCustomMessageFooter,
  RenderWriteableElementResponse,
} from "../types/component/ChatContainer";
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
  /**
   * The single effective config. Both surfaces reconstruct this from their
   * flattened inputs through the shared `resolveFlattenedConfig`, folding every
   * field — `strings`, `markdown`, `serviceDesk`, and `serviceDeskFactory`
   * included — so the core has exactly one config channel and no side-channel
   * props.
   */
  config: PublicConfig;
  onBeforeRender?: (instance: ChatInstance) => Promise<void> | void;
  onAfterRender?: (instance: ChatInstance) => Promise<void> | void;
  renderUserDefinedResponse?: RenderUserDefinedResponse;
  renderCustomMessageFooter?: RenderCustomMessageFooter;
  renderWriteableElements?: RenderWriteableElementResponse;
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
 *
 * Re-render boundary (important): the store-driven heavy tree (`AppShell` and
 * everything it renders) must never receive raw host render-props. Hosts that
 * pass live state rebuild those props with new identities on every render, which
 * would break `React.memo(AppShell)` and re-render the whole chat. Instead,
 * `AppShell` gets only `serviceManager`, store-derived values, and stable derived
 * signals computed here (e.g. `writeableElementsPresentKeys`). The raw host
 * render-props (`renderUserDefinedResponse`, `renderCustomMessageFooter`, and the
 * `renderWriteableElements` node map) flow only to their isolated, individually
 * memoized portal siblings of `AppShell` below — those re-render independently.
 */
export function ChatAppEntry({
  config,
  onBeforeRender,
  onAfterRender,
  renderUserDefinedResponse,
  renderCustomMessageFooter,
  renderWriteableElements,
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

  // Tracks which props we've already warned about so a host that re-creates an
  // object prop every render gets the diagnostic once, not on every commit.
  const unstablePropsWarnedRef = useRef<Set<string>>(new Set());

  /**
   * Dev-only diagnostic: a heavy object prop changed identity but its content is
   * unchanged, meaning the host is re-creating it every render and paying for
   * avoidable reconciliation. Gated behind `config.debug` and emitted once per
   * prop. See the prop-stability contract in `src/types/AGENTS.md`.
   */
  const warnUnstableProp = useCallback(
    (name: string) => {
      if (!serviceManager?.store.getState().config.public.debug) {
        return;
      }
      if (unstablePropsWarnedRef.current.has(name)) {
        return;
      }
      unstablePropsWarnedRef.current.add(name);
      consoleWarn(
        `The \`${name}\` prop changed identity without changing content. Memoize it ` +
          `(e.g. useMemo / useCallback) so it does not trigger avoidable work on every render.`,
      );
    },
    [serviceManager],
  );

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
        // `config` is already the single effective config — both surfaces folded
        // every flattened field (strings, markdown, serviceDesk,
        // serviceDeskFactory) into it via `resolveFlattenedConfig` before this
        // point, so the merge with defaults is all that's left.
        const publicConfig = mergePublicConfig(config);
        // Seed the previous config immediately to avoid dynamic updates during boot.
        previousConfigRef.current = publicConfig;

        const { serviceManager, instance } =
          await initServiceManagerAndInstance({
            publicConfig,
            container,
            customHostElement: element,
          });

        // Set the host markdown config before first paint so the initial
        // markdown render already has its custom renderers / plugins. `markdown`
        // lives in its own `markdownConfig` slice (not read from the config
        // tree), so lift it off `config` here. Read from the original `config`
        // prop, not `publicConfig`, to keep the consumer's plugin/renderer
        // references stable for the slice's `isEqual` guard.
        if (config.markdown) {
          serviceManager.store.dispatch(
            appActions.setAppStateValue("markdownConfig", config.markdown),
          );
        }

        attachUserDefinedResponseHandlers(
          instance,
          setUserDefinedResponseEventsBySlot,
        );

        attachCustomFooterHandler(instance, setCustomFooterSlotsByName);

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
    if (!serviceManager || !instance || !config || !beforeRenderComplete) {
      return;
    }

    // `config` already carries every field (strings/markdown/serviceDesk/
    // serviceDeskFactory folded in by both surfaces), so the merged config is
    // the whole change-detection input — no side-channel props to reconcile.
    const nextEffective = mergePublicConfig(config);

    const previousEffective = previousConfigRef.current;
    if (!previousEffective) {
      // Skip the initial run so we don't dispatch during first render.
      previousConfigRef.current = nextEffective;
      return;
    }

    if (isEqual(previousEffective, nextEffective)) {
      // The effect re-ran (a `config`/`strings`/`serviceDesk` prop changed
      // identity) but nothing actually changed — surface the churn in debug mode.
      warnUnstableProp("config");
      return;
    }

    const currentServiceManager = serviceManager;

    const handleDynamicUpdate = async () => {
      try {
        await applyConfigChangesDynamically(
          previousEffective,
          nextEffective,
          currentServiceManager,
        );
      } catch (error) {
        consoleError("Failed to apply config changes dynamically:", error);
      }
    };
    handleDynamicUpdate();
    previousConfigRef.current = nextEffective;
  }, [
    config,
    instance,
    serviceManager,
    beforeRenderComplete,
    warnUnstableProp,
  ]);

  // Keep the markdownConfig slice in sync with `config.markdown`. The markdown
  // config is stored in its own slice rather than read off the config tree, so
  // it is lifted here. Guarded by isEqual so a host passing an inline object
  // (new identity, same content) does not churn the slice and re-render every
  // markdown message.
  const markdown = config.markdown;
  useEffect(() => {
    if (!serviceManager) {
      return;
    }
    const current = serviceManager.store.getState().markdownConfig;
    if (isEqual(current, markdown)) {
      // A new `markdown` identity with unchanged content — diagnose the churn.
      if (markdown !== undefined && markdown !== current) {
        warnUnstableProp("markdown");
      }
      return;
    }
    serviceManager.store.dispatch(
      appActions.setAppStateValue("markdownConfig", markdown),
    );
  }, [markdown, serviceManager, warnUnstableProp]);

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

  // Stable signal of which writeable-element slots have content. A host that
  // passes live state typically rebuilds the `renderWriteableElements` map every
  // render with new node *values*; the SET of present keys, however, is stable.
  // AppShell only needs to know which slots to render placeholders for, so we
  // hand it this value-stable string (sorted => order-independent) instead of
  // the churning map. That keeps React.memo(AppShell) intact across host
  // re-renders; the live nodes still flow to WriteableElementsPortalsContainer
  // below. `undefined` (host omitted the map) preserves "render all" back-compat.
  // A space separator is safe: writeable-element slot names are identifiers.
  const writeableElementsPresentKeys = useMemo(
    () =>
      renderWriteableElements
        ? Object.entries(renderWriteableElements)
            .filter(([, node]) => node != null)
            .map(([key]) => key)
            .sort()
            .join(" ")
        : undefined,
    [renderWriteableElements],
  );

  if (!(serviceManager && instance && beforeRenderComplete)) {
    return null;
  }

  return (
    <StoreProvider store={serviceManager.store}>
      <WindowSizeProvider windowSize={windowSize}>
        <ServiceManagerProvider serviceManager={serviceManager}>
          <IntlProvider intl={serviceManager.intl}>
            <AriaAnnouncerProvider>
              <AppShell
                serviceManager={serviceManager}
                hostElement={serviceManager.customHostElement}
                writeableElementsPresentKeys={writeableElementsPresentKeys}
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
            </AriaAnnouncerProvider>
          </IntlProvider>
        </ServiceManagerProvider>
      </WindowSizeProvider>
    </StoreProvider>
  );
}

export default ChatAppEntry;
