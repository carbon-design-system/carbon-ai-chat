/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim/index.js';
import type { ExtensionHosts } from './services/extensionHosts';
import type { ShellContentState } from './utils/shellLifecycle';
import {
  PanelContentAdapter,
  type PanelContentParts,
} from './components/panels/PanelContentAdapter';
import IFramePanel from './components/panels/IFramePanel';
import ViewSourcePanel from './components/panels/ViewSourcePanel';
import CatastrophicErrorPanel from './components/panels/CatastrophicErrorPanel';
import { PanelContentErrorBoundary } from './components/panels/PanelContentErrorBoundary';
import { BodyMessageComponents } from './components/responseTypes/message/BodyMessageComponents';
import { FooterButtonComponents } from './components/responseTypes/button/FooterButtonComponents';
import { MessageTypeComponent } from './components-legacy/MessageTypeComponent';
import { MarkdownWithDefaults } from './components/helpers/MarkdownWithDefaults/MarkdownWithDefaults';
import WriteableElement from './components/helpers/WriteableElement/WriteableElement';
import { useSelector } from './hooks/useSelector';
import { useChatViewStateInstance } from './hooks/useChatViewState';
import actions from './store/actions';
import type { ButtonItem, MessageResponse } from '../types/messaging/Messages';
import type { AppState } from '../types/state/AppState';
import type { OnErrorData } from '../types/config/ErrorConfig';
import type { MessageTypeComponentProps } from '../types/messaging/MessageTypeComponentProps';
import type { ServiceManager } from './services/ServiceManager';

const noScroll = () => {};
const renderMessageComponent = (props: MessageTypeComponentProps) => (
  <MessageTypeComponent {...props} />
);

export function useAppShellPanels({
  serviceManager,
  hosts,
  content,
  onRevision,
}: {
  serviceManager: ServiceManager;
  hosts: ExtensionHosts;
  content: ShellContentState;
  onRevision: (parts: PanelContentParts) => void;
}) {
  const viewState = useChatViewStateInstance();
  const {
    customPanelState,
    responsePanelState,
    catastrophicErrorPanelState,
    iFramePanelState,
    viewSourcePanelState,
    isInputReadonly,
  } = content.inputs;
  const { onRestart } = content.callbacks;
  const requestFocus = content.requestFocus;
  const allMessagesByID = useSelector(
    (state: AppState) => state.allMessagesByID
  );
  const requests = useSyncExternalStore(
    hosts.subscribePanelContent,
    hosts.getPanelContentSnapshot,
    hosts.getPanelContentSnapshot
  );
  const errorText = useSelector(
    (state: AppState) => state.languagePack.errors_singleMessage
  );
  const onPanelContentError = useCallback(
    (errorData: OnErrorData) => {
      serviceManager.actions.errorOccurred(errorData);
      serviceManager.store.dispatch(
        actions.announceMessage({ messageID: 'errors_singleMessage' })
      );
    },
    [serviceManager]
  );
  const item = responsePanelState.localMessageItem;
  const originalMessage = allMessagesByID[item?.fullMessageID] as
    MessageResponse | undefined;
  const customTitle = customPanelState.options.title;
  const responseTitle = (item?.item as ButtonItem | undefined)?.panel?.title;
  const iframeTitle =
    iFramePanelState.messageItem?.title ?? iFramePanelState.messageItem?.source;
  const citationTitle = viewSourcePanelState.citationItem?.title;
  const parts = useMemo<PanelContentParts>(() => {
    const responseProps =
      item && originalMessage
        ? {
            message: item,
            originalMessage,
            requestInputFocus: requestFocus,
            disableUserInputs: isInputReadonly,
            isMessageForInput: responsePanelState.isMessageForInput,
            scrollElementIntoView: noScroll,
            serviceManager,
            hideFeedback: true,
            showChainOfThought: false,
            allowNewFeedback: false,
            renderMessageComponent,
          }
        : undefined;
    return {
      'error-body': (
        <CatastrophicErrorPanel
          title={catastrophicErrorPanelState?.title}
          bodyText={catastrophicErrorPanelState?.bodyText}
          hideRetryButton={catastrophicErrorPanelState?.hideRetryButton}
          onRestart={onRestart}
        />
      ),
      'custom-title': customTitle && (
        <MarkdownWithDefaults text={customTitle} />
      ),
      'custom-body': (
        <WriteableElement
          slotName="customPanelElement"
          className="cds-aichat--custom-panel__content-container"
        />
      ),
      'response-title': responseTitle && (
        <MarkdownWithDefaults text={responseTitle} />
      ),
      'response-body': responseProps && (
        <PanelContentErrorBoundary
          key={item.ui_state.id}
          errorText={errorText}
          onError={onPanelContentError}
          isBody>
          <BodyMessageComponents {...responseProps} />
        </PanelContentErrorBoundary>
      ),
      'response-footer': responseProps && (
        <PanelContentErrorBoundary
          key={item.ui_state.id}
          errorText={errorText}
          onError={onPanelContentError}>
          <FooterButtonComponents {...responseProps} />
        </PanelContentErrorBoundary>
      ),
      'iframe-title': iframeTitle && (
        <MarkdownWithDefaults text={iframeTitle} />
      ),
      'iframe-body': <IFramePanel messageItem={iFramePanelState.messageItem} />,
      'citation-title': citationTitle && (
        <MarkdownWithDefaults text={citationTitle} />
      ),
      'citation-body': (
        <ViewSourcePanel
          citationItem={viewSourcePanelState.citationItem}
          relatedSearchResult={viewSourcePanelState.relatedSearchResult}
        />
      ),
      'history-body': (
        <WriteableElement
          slotName="historyPanelElement"
          className="cds-aichat--history-panel__content-container"
        />
      ),
    };
  }, [
    catastrophicErrorPanelState?.title,
    catastrophicErrorPanelState?.bodyText,
    catastrophicErrorPanelState?.hideRetryButton,
    onRestart,
    customTitle,
    responseTitle,
    item,
    originalMessage,
    requestFocus,
    isInputReadonly,
    responsePanelState.isMessageForInput,
    serviceManager,
    errorText,
    onPanelContentError,
    iframeTitle,
    iFramePanelState.messageItem,
    citationTitle,
    viewSourcePanelState.citationItem,
    viewSourcePanelState.relatedSearchResult,
  ]);

  const releaseInitialCommit = useRef<() => void>(undefined);
  useLayoutEffect(() => {
    const release = viewState.holdInitialReactCommit();
    releaseInitialCommit.current = release;
    return release;
  }, [viewState]);
  useLayoutEffect(() => {
    onRevision(parts);
  }, [onRevision, parts]);
  useEffect(() => {
    if (
      content.nativePanelsReady &&
      requests.every((request) =>
        hosts.isPanelContentCommitted(request.panel, parts)
      )
    ) {
      releaseInitialCommit.current?.();
    }
  }, [requests, hosts, parts, content.nativePanelsReady]);
  return requests.map((request) => (
    <PanelContentAdapter
      key={request.panel}
      hosts={hosts}
      request={request}
      parts={parts}
    />
  ));
}
