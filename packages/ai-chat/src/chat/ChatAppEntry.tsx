/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppProviders } from './AppProviders';
import { ServiceManager } from './services/ServiceManager';
import {
  attachUserDefinedResponseHandlers,
  attachCustomFooterHandler,
  attachCustomRequestFooterHandler,
} from './utils/chatBoot';
import { UserDefinedResponsePortalsContainer } from './components/portals/UserDefinedResponsePortalsContainer';
import {
  CustomFooterSlotState,
  CustomFooterPortalsContainer,
} from './components/portals/CustomFooterPortalsContainer';
import {
  CustomRequestFooterSlotState,
  CustomRequestFooterPortalsContainer,
} from './components/portals/CustomRequestFooterPortalsContainer';
import { WriteableElementsPortalsContainer } from './components/portals/WriteableElementsPortalsContainer';
import { LightDomPortalsContainer } from './components/portals/LightDomPortalsContainer';
import { InputNodePortalsContainer } from './components/portals/InputNodePortalsContainer';

import {
  RenderUserDefinedState,
  RenderUserDefinedResponse,
  RenderUserDefinedInputNode,
  RenderCustomMessageFooter,
  RenderCustomRequestFooter,
  RenderWriteableElementResponse,
} from '../types/component/ChatContainer';
import { ChatInstance } from '../types/instance/ChatInstance';
import { Dimension } from '../types/utilities/Dimension';
import AppShell from './AppShell';

/**
 * What `cds-aichat-container` hands the renderer for one mount. The host's
 * render props ride alongside; the React wrapper supplies its current ones on
 * every render.
 *
 * @internal
 */
interface ChatAppEntryProps {
  serviceManager: ServiceManager;
  instance: ChatInstance;
  windowSize: Dimension;
  /** False until `onBeforeRender` settles. Nothing renders before then. */
  renderReady: boolean;
  /** True once the store holds the chat's initial view. */
  initialViewReady: boolean;
  /** Called once the slot trackers listen, before `onBeforeRender` runs. */
  onListenersReady: () => void;
  /** Called after the commit that renders the initial view. */
  onInitialViewCommitted: () => void;
  renderUserDefinedResponse?: RenderUserDefinedResponse;
  renderUserDefinedInputNode?: RenderUserDefinedInputNode;
  renderCustomMessageFooter?: RenderCustomMessageFooter;
  renderCustomRequestFooter?: RenderCustomRequestFooter;
  renderWriteableElements?: RenderWriteableElementResponse;
  /** The page-level element whose light DOM holds portal hosts for extension content. */
  chatWrapper?: HTMLElement;
  /**
   * The shadow root that holds the rendered app. Watched to prune editor
   * portal hosts; it differs from `chatWrapper`'s own shadow root when the
   * app renders inside a nested element.
   */
  observationRoot?: Node;
}

/**
 * Renders a chat whose services `cds-aichat-container` has already started. It
 * collects extension slots from the instance, then renders the app shell once
 * the host's `onBeforeRender` has settled.
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
function ChatAppEntry({
  serviceManager,
  instance,
  windowSize,
  renderReady,
  initialViewReady,
  onListenersReady,
  onInitialViewCommitted,
  renderUserDefinedResponse,
  renderUserDefinedInputNode,
  renderCustomMessageFooter,
  renderCustomRequestFooter,
  renderWriteableElements,
  chatWrapper,
  observationRoot,
}: ChatAppEntryProps) {
  const [userDefinedResponseEventsBySlot, setUserDefinedResponseEventsBySlot] =
    useState<Record<string, RenderUserDefinedState>>({});

  const [customFooterSlotsByName, setCustomFooterSlotsByName] = useState<
    Record<string, CustomFooterSlotState>
  >({});

  const [customRequestFooterSlotsByName, setCustomRequestFooterSlotsByName] =
    useState<Record<string, CustomRequestFooterSlotState>>({});

  // The trackers subscribe once, but this prop can arrive later — behind a
  // feature flag, or with async config. The handler reads the ref on each
  // event so a late arrival still gets footers.
  const renderCustomRequestFooterRef = useRef(renderCustomRequestFooter);
  renderCustomRequestFooterRef.current = renderCustomRequestFooter;

  const onListenersReadyRef = useRef(onListenersReady);
  onListenersReadyRef.current = onListenersReady;
  const onInitialViewCommittedRef = useRef(onInitialViewCommitted);
  onInitialViewCommittedRef.current = onInitialViewCommitted;

  // Subscribes before the host's onBeforeRender runs, so content that callback
  // emits is already collected when the shell first renders. The cleanups keep
  // a StrictMode effect replay from subscribing twice.
  useEffect(() => {
    const detachTrackers = [
      attachUserDefinedResponseHandlers(
        instance,
        setUserDefinedResponseEventsBySlot
      ),
      attachCustomFooterHandler(instance, setCustomFooterSlotsByName),
      attachCustomRequestFooterHandler(
        instance,
        setCustomRequestFooterSlotsByName,
        () => Boolean(renderCustomRequestFooterRef.current)
      ),
    ];
    onListenersReadyRef.current();
    return () => detachTrackers.forEach((detach) => detach());
  }, [instance]);

  useEffect(() => {
    if (initialViewReady) {
      onInitialViewCommittedRef.current();
    }
  }, [initialViewReady]);

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
            .join(' ')
        : undefined,
    [renderWriteableElements]
  );

  if (!renderReady) {
    return null;
  }

  return (
    <AppProviders serviceManager={serviceManager} windowSize={windowSize}>
      <AppShell
        serviceManager={serviceManager}
        hostElement={serviceManager.customHostElement}
        writeableElementsPresentKeys={writeableElementsPresentKeys}
      />
      {renderUserDefinedResponse && (
        <UserDefinedResponsePortalsContainer
          chatInstance={instance}
          renderUserDefinedResponse={renderUserDefinedResponse}
          userDefinedResponseEventsBySlot={userDefinedResponseEventsBySlot}
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

      {renderCustomRequestFooter && (
        <CustomRequestFooterPortalsContainer
          chatInstance={instance}
          renderCustomRequestFooter={renderCustomRequestFooter}
          customRequestFooterEventsBySlot={customRequestFooterSlotsByName}
          chatWrapper={chatWrapper}
        />
      )}

      {renderWriteableElements && (
        <WriteableElementsPortalsContainer
          chatInstance={instance}
          renderResponseMap={renderWriteableElements}
        />
      )}

      <LightDomPortalsContainer
        chatWrapper={chatWrapper}
        observationRoot={observationRoot}
      />

      {renderUserDefinedInputNode && (
        <InputNodePortalsContainer
          chatInstance={instance}
          renderUserDefinedInputNode={renderUserDefinedInputNode}
          chatWrapper={chatWrapper}
        />
      )}
    </AppProviders>
  );
}

export { ChatAppEntry, ChatAppEntryProps };
