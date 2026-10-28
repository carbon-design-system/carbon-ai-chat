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
  useState,
} from 'react';
import { createComponent } from '@lit/react';
import { useSyncExternalStore } from 'use-sync-external-store/shim/index.js';
import { transformReactIconToCarbonIcon } from '@carbon/ai-chat-components/es/globals/utils/iconTransform.js';
import type CDSButton from '@carbon/web-components/es/components/button/button.js';
import type { HumanAgentConfirmation } from './services/chatViewState';
import type { ExtensionHosts } from './services/extensionHosts';
import NativePanels from './components/panels/NativePanels';
import {
  PanelContentAdapter,
  type PanelContentParts,
} from './components/panels/PanelContentAdapter';
import HydrationPanel from './components/panels/HydrationPanel';
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
import { DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS } from './store/reducerUtils';
import type { ButtonItem, MessageResponse } from '../types/messaging/Messages';
import type { AppState } from '../types/state/AppState';
import type { OnErrorData } from '../types/config/ErrorConfig';
import type { HasRequestFocus } from '../types/utilities/HasRequestFocus';
import type { MessageTypeComponentProps } from '../types/messaging/MessageTypeComponentProps';
import type { HasServiceManager } from './hocs/withServiceManager';
import type {
  PanelCompositionCallbacks,
  PanelName,
  PanelViewInputs,
} from './utils/panelComposition';

interface AppShellPanelsProps extends HasServiceManager {
  hosts: ExtensionHosts;
  endChatConfirmation: HumanAgentConfirmation | null;
  showEndChatConfirmation: boolean;
  confirmHumanAgentEndChat: () => void;
  hideConfirmEndChat: () => void;
  showScreenShareRequest: boolean;
  isHydratingComplete: boolean;
  shouldShowHydrationPanel: boolean;
  onPanelOpenStart: (isPanel: boolean) => void;
  onPanelOpenEnd: (event: CustomEvent) => void;
  onPanelCloseStart: (event: CustomEvent) => void;
  onPanelCloseEnd: (isPanel: boolean) => void;
  onClose: () => void;
  onRestart: () => void;
  onToggleHomeScreen: () => void;
  isHomeScreenActive: boolean;
  customPanelState: AppState['customPanelState'];
  customPanelRef: React.RefObject<HasRequestFocus | null>;
  historyPanelState: AppState['historyPanelState'];
  showDisclaimer: boolean;
  disclaimerRef: React.RefObject<CDSButton | null>;
  onAcceptDisclaimer: () => void;
  responsePanelState: AppState['responsePanelState'];
  responsePanelRef: React.RefObject<HasRequestFocus | null>;
  requestFocus: () => void;
  iFramePanelState: AppState['iFramePanelState'];
  iframePanelRef: React.RefObject<HasRequestFocus | null>;
  viewSourcePanelState: AppState['viewSourcePanelState'];
  viewSourcePanelRef: React.RefObject<HasRequestFocus | null>;
  allMessagesByID: AppState['allMessagesByID'];
  isInputReadonly: boolean;
  catastrophicErrorPanelState: AppState['catastrophicErrorPanelState'];
}

const NativePanelsRegion = createComponent({
  tagName: 'cds-aichat-native-panels',
  elementClass: NativePanels,
  react: React,
});

const noScroll = () => {};
const renderMessageComponent = (props: MessageTypeComponentProps) => (
  <MessageTypeComponent {...props} />
);

export const AppShellPanels = React.memo(function AppShellPanels({
  serviceManager,
  hosts,
  endChatConfirmation,
  showEndChatConfirmation,
  confirmHumanAgentEndChat,
  hideConfirmEndChat,
  showScreenShareRequest,
  isHydratingComplete,
  shouldShowHydrationPanel,
  onPanelOpenStart,
  onPanelOpenEnd,
  onPanelCloseStart,
  onPanelCloseEnd,
  onClose,
  onRestart,
  onToggleHomeScreen,
  isHomeScreenActive,
  customPanelState,
  customPanelRef,
  historyPanelState,
  showDisclaimer,
  disclaimerRef,
  onAcceptDisclaimer,
  responsePanelState,
  responsePanelRef,
  requestFocus,
  iFramePanelState,
  iframePanelRef,
  viewSourcePanelState,
  viewSourcePanelRef,
  allMessagesByID,
  isInputReadonly,
  catastrophicErrorPanelState,
}: AppShellPanelsProps) {
  const viewState = useChatViewStateInstance();
  const native = useRef<NativePanels>(null);
  const active = useRef(true);
  const latestDisclaimerRef = useRef(disclaimerRef);
  latestDisclaimerRef.current = disclaimerRef;
  const publishedButton = useRef<CDSButton | null>(null);
  const [nativeReady, setNativeReady] = useState(false);
  const releaseInitialCommit = useRef<() => void>(undefined);
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
      'hydration-body': <HydrationPanel isHydrated={isHydratingComplete} />,
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
    isHydratingComplete,
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

  const inputs = useMemo<PanelViewInputs>(
    () => ({
      endChatConfirmation,
      showEndChatConfirmation,
      showScreenShareRequest,
      isHydratingComplete,
      shouldShowHydrationPanel,
      isHomeScreenActive,
      customPanelState,
      historyPanelState,
      showDisclaimer,
      responsePanelState,
      responseHasMessage: Boolean(originalMessage),
      iFramePanelState,
      viewSourcePanelState,
      isInputReadonly,
      catastrophicErrorPanelState,
      contentRevision: parts,
    }),
    [
      endChatConfirmation,
      showEndChatConfirmation,
      showScreenShareRequest,
      isHydratingComplete,
      shouldShowHydrationPanel,
      isHomeScreenActive,
      customPanelState,
      historyPanelState,
      showDisclaimer,
      responsePanelState,
      originalMessage,
      iFramePanelState,
      viewSourcePanelState,
      isInputReadonly,
      catastrophicErrorPanelState,
      parts,
    ]
  );
  const callbacks = useMemo<PanelCompositionCallbacks>(
    () => ({
      onPanelOpenStart,
      onPanelOpenEnd,
      onPanelCloseStart,
      onPanelCloseEnd,
      onClose,
      onRestart,
      onToggleHomeScreen,
      onAcceptDisclaimer,
      confirmHumanAgentEndChat,
      hideConfirmEndChat,
      fireCustomPanelEvent: (type) => {
        serviceManager.eventBus.fire({ type }, serviceManager.instance);
      },
      resetCustomPanelOptions: () => {
        serviceManager.store.dispatch(
          actions.setCustomPanelConfigOptions(
            DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS
          )
        );
      },
      closeCustomPanel: () => {
        serviceManager.store.dispatch(actions.setCustomPanelOpen(false));
      },
      closeResponsePanel: () => {
        serviceManager.store.dispatch(actions.setResponsePanelIsOpen(false));
      },
      clearResponsePanelContent: () => {
        serviceManager.store.dispatch(
          actions.setResponsePanelContent(null, false)
        );
      },
      closeIFramePanel: () => {
        serviceManager.store.dispatch(actions.closeIFramePanel());
      },
      closeViewSourcePanel: () => {
        serviceManager.store.dispatch(actions.setViewSourcePanelIsOpen(false));
      },
      closeHistoryPanel: () => {
        serviceManager.store.dispatch(actions.setHistoryPanelOpen(false));
      },
      updateScreenShareRequest: (state) => {
        serviceManager.humanAgentService?.screenShareUpdateRequestState(state);
      },
      announce: (text) => viewState.announcer.announce(text),
    }),
    [
      onPanelOpenStart,
      onPanelOpenEnd,
      onPanelCloseStart,
      onPanelCloseEnd,
      onClose,
      onRestart,
      onToggleHomeScreen,
      onAcceptDisclaimer,
      confirmHumanAgentEndChat,
      hideConfirmEndChat,
      serviceManager,
      viewState,
    ]
  );

  const onTargetsReady = useCallback(() => {
    if (!active.current) {
      return;
    }
    const button = native.current?.disclaimerButton() ?? null;
    latestDisclaimerRef.current.current = button;
    publishedButton.current = button;
    setNativeReady(Boolean(native.current?.isConnected));
  }, []);
  useLayoutEffect(() => {
    active.current = true;
    const release = viewState.holdInitialReactCommit();
    releaseInitialCommit.current = release;
    return () => {
      active.current = false;
      release();
    };
  }, [viewState]);
  useLayoutEffect(() => {
    const assignments = [
      [customPanelRef, 'custom'],
      [responsePanelRef, 'response'],
      [iframePanelRef, 'iframe'],
      [viewSourcePanelRef, 'citation'],
    ] as const;
    const owned = assignments
      .filter(
        ([, name]) => name !== 'response' || Boolean(item && originalMessage)
      )
      .map(([ref, name]) => {
        const handle = {
          requestFocus: () =>
            native.current?.requestPanelFocus(name as PanelName) ?? false,
        };
        ref.current = handle;
        return { ref, handle };
      });
    const button = native.current?.disclaimerButton() ?? null;
    disclaimerRef.current = button;
    publishedButton.current = button;
    return () => {
      owned.forEach(({ ref, handle }) => {
        if (ref.current === handle) {
          ref.current = null;
        }
      });
      if (disclaimerRef.current === publishedButton.current) {
        disclaimerRef.current = null;
      }
    };
  }, [
    customPanelRef,
    responsePanelRef,
    iframePanelRef,
    viewSourcePanelRef,
    disclaimerRef,
    item,
    originalMessage,
  ]);
  useEffect(() => {
    if (
      nativeReady &&
      requests.every((request) =>
        hosts.isPanelContentCommitted(request.panel, parts)
      )
    ) {
      releaseInitialCommit.current?.();
    }
  }, [nativeReady, requests, hosts, parts]);

  return (
    <>
      <NativePanelsRegion
        slot="panels"
        ref={native}
        inputs={inputs}
        callbacks={callbacks}
        hosts={hosts}
        transformHeaderIcon={transformReactIconToCarbonIcon}
        onTargetsReady={onTargetsReady}
      />
      {requests.map((request) => (
        <PanelContentAdapter
          key={request.panel}
          hosts={hosts}
          request={request}
          parts={parts}
        />
      ))}
    </>
  );
});
