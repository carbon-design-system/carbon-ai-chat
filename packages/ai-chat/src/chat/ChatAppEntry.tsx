/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChatContext } from './contexts/ChatContext';
import { AriaAnnouncerRegion } from './components/aria/AriaAnnouncerRegion';
import { ServiceManager } from './services/ServiceManager';
import type { ChatViewState } from './services/chatViewState';
import { ExtensionHosts } from './services/extensionHosts';
import { UserDefinedResponsePortalsContainer } from './components/portals/UserDefinedResponsePortalsContainer';
import { CustomFooterPortalsContainer } from './components/portals/CustomFooterPortalsContainer';
import { CustomRequestFooterPortalsContainer } from './components/portals/CustomRequestFooterPortalsContainer';
import { WriteableElementsPortalsContainer } from './components/portals/WriteableElementsPortalsContainer';
import { LightDomPortalsContainer } from './components/portals/LightDomPortalsContainer';
import { InputNodePortalsContainer } from './components/portals/InputNodePortalsContainer';

import {
  RenderUserDefinedResponse,
  RenderUserDefinedInputNode,
  RenderCustomMessageFooter,
  RenderCustomRequestFooter,
  RenderWriteableElementResponse,
} from '../types/component/ChatContainer';
import { ChatInstance } from '../types/instance/ChatInstance';
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
  viewState: ChatViewState;
  instance: ChatInstance;
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
  /** Removes empty user-defined-response hosts for web-component callbacks. */
  removeEmptyUserDefinedResponseHost?: boolean;
  /** Removes empty custom-message-footer hosts for web-component callbacks. */
  removeEmptyCustomMessageFooterHost?: boolean;
  /**
   * Stable live check owned by the container: returns true when the host has
   * set a `renderCustomRequestFooter` callback. ORed with the React prop, so a
   * web-component property that reaches the element before the React commit
   * still collects footers.
   */
  isCustomRequestFooterEnabled?: () => boolean;
  renderWriteableElements?: RenderWriteableElementResponse;
  /** The page-level element whose light DOM holds portal hosts for extension content. */
  chatWrapper?: HTMLElement;
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
 * memoized portal siblings of `AppShell` — those re-render independently.
 */
function ChatAppEntry({
  serviceManager,
  viewState,
  instance,
  renderReady,
  initialViewReady,
  onListenersReady,
  onInitialViewCommitted,
  renderUserDefinedResponse,
  renderUserDefinedInputNode,
  renderCustomMessageFooter,
  renderCustomRequestFooter,
  removeEmptyUserDefinedResponseHost,
  removeEmptyCustomMessageFooterHost,
  isCustomRequestFooterEnabled,
  renderWriteableElements,
  chatWrapper,
}: ChatAppEntryProps) {
  // Request footers arrive before the render gate opens, as for history
  // inserted in onBeforeRender, while the adapter cannot report yet. The
  // service asks on each event, so a prop that arrives later still counts.
  const renderCustomRequestFooterRef = useRef(renderCustomRequestFooter);
  renderCustomRequestFooterRef.current = renderCustomRequestFooter;
  const isCustomRequestFooterEnabledRef = useRef(isCustomRequestFooterEnabled);
  isCustomRequestFooterEnabledRef.current = isCustomRequestFooterEnabled;

  // One per mount: the React wrapper keys this entry by mount, so the chat
  // wrapper never changes for it.
  const [hosts] = useState(
    () =>
      new ExtensionHosts(
        instance,
        chatWrapper,
        serviceManager.store,
        () =>
          Boolean(renderCustomRequestFooterRef.current) ||
          Boolean(isCustomRequestFooterEnabledRef.current?.())
      )
  );

  const onListenersReadyRef = useRef(onListenersReady);
  onListenersReadyRef.current = onListenersReady;
  const onInitialViewCommittedRef = useRef(onInitialViewCommitted);
  onInitialViewCommittedRef.current = onInitialViewCommitted;

  // Connects before the host's onBeforeRender runs, so content that callback
  // emits is already collected when the shell first renders.
  useEffect(() => {
    hosts.connect();
    onListenersReadyRef.current();
    return () => hosts.disconnect();
  }, [hosts]);

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
    <ChatContext.Provider value={viewState}>
      {/* The extension adapters come first: their layout effects attach
          the hosts before the shell's own layout effects measure. */}
      {renderUserDefinedResponse && (
        <UserDefinedResponsePortalsContainer
          chatInstance={instance}
          renderUserDefinedResponse={renderUserDefinedResponse}
          removeEmptyHost={removeEmptyUserDefinedResponseHost}
          hosts={hosts}
        />
      )}

      {renderCustomMessageFooter && (
        <CustomFooterPortalsContainer
          chatInstance={instance}
          renderCustomMessageFooter={renderCustomMessageFooter}
          removeEmptyHost={removeEmptyCustomMessageFooterHost}
          hosts={hosts}
        />
      )}

      {renderCustomRequestFooter && (
        <CustomRequestFooterPortalsContainer
          chatInstance={instance}
          renderCustomRequestFooter={renderCustomRequestFooter}
          hosts={hosts}
        />
      )}

      {renderWriteableElements && (
        <WriteableElementsPortalsContainer
          chatInstance={instance}
          renderResponseMap={renderWriteableElements}
        />
      )}

      <LightDomPortalsContainer hosts={hosts} />

      <AppShell
        serviceManager={serviceManager}
        hostElement={serviceManager.customHostElement}
        writeableElementsPresentKeys={writeableElementsPresentKeys}
      />

      {/* After the shell: inline input-node hosts mount into targets the
          sent bubbles register. */}
      {renderUserDefinedInputNode && (
        <InputNodePortalsContainer
          chatInstance={instance}
          renderUserDefinedInputNode={renderUserDefinedInputNode}
          hosts={hosts}
        />
      )}

      <AriaAnnouncerRegion announcer={viewState.announcer} />
    </ChatContext.Provider>
  );
}

export { ChatAppEntry, ChatAppEntryProps };
