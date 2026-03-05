/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import cx from "classnames";
import type CDSButton from "@carbon/web-components/es/components/button/button.js";
import { useIntl } from "./hooks/useIntl";

import { RenderWriteableElementResponse } from "../types/component/ChatContainer";
import AppShellErrorBoundary from "./AppShellErrorBoundary";
import { LauncherContainer } from "./components-legacy/launcher/LauncherContainer";
import { InputFunctions } from "./components-legacy/input/Input";
import Layer from "./components/carbon/Layer";
import ChatShell from "@carbon/ai-chat-components/es/react/chat-shell.js";
import { Header } from "./components-legacy/header/Header";
import MessagesComponent, {
  MessagesComponentClass,
} from "./components-legacy/MessagesComponent";
import { HomeScreen } from "./components/homeScreen/HomeScreen";
import { Input } from "./components-legacy/input/Input";
import { AppShellWriteableElements } from "./AppShellWriteableElements";
import { EndHumanAgentChatModal } from "./components/modals/EndHumanAgentChatModal";
import { RequestScreenShareModal } from "./components/modals/RequestScreenShareModal";
import WriteableElement from "./components/util/WriteableElement";
import { createUnmappingMemoizer } from "./utils/memoizerUtils";
import { WriteableElementName } from "./utils/constants";
import { LocalMessageItem } from "../types/messaging/LocalMessageItem";
import { AppShellPanels } from "./AppShellPanels";

import { HasServiceManager } from "./hocs/withServiceManager";
import { useMobileViewportLayout } from "./hooks/useMobileViewportLayout";
import { useOnMount } from "./hooks/useOnMount";
import { useSelector } from "./hooks/useSelector";
import { useWindowOpenState } from "./hooks/useWindowOpenState";
import { useAutoFocusManagement } from "./hooks/useAutoFocusManagement";
import { useFocusManager } from "./hooks/useFocusManager";
import { useWorkspaceAnnouncements } from "./hooks/useWorkspaceAnnouncements";
import { useStyleInjection } from "./hooks/useStyleInjection";
import { useDerivedState } from "./hooks/useDerivedState";
import { useHumanAgentCallbacks } from "./hooks/useHumanAgentCallbacks";
import { useAssistantUploadCallbacks } from "./hooks/useAssistantUploadCallbacks";
import { usePanelCallbacks } from "./hooks/usePanelCallbacks";
import { useInputCallbacks } from "./hooks/useInputCallbacks";
import { useResizeObserver } from "./hooks/useResizeObserver";
import { ModalPortalRootProvider } from "./providers/ModalPortalRootProvider";
import actions from "./store/actions";
import {
  selectHumanAgentDisplayState,
  selectInputState,
} from "./store/selectors";
import {
  consoleError,
  createDidCatchErrorData,
  getAssistantName,
} from "./utils/miscUtils";
import {
  IS_PHONE,
  IS_PHONE_IN_PORTRAIT_MODE,
  isBrowser,
} from "./utils/browserUtils";
import { CornersType } from "./utils/constants";
import { SCROLLBAR_WIDTH } from "./utils/domUtils";
import { calculateChatWidthBreakpoint } from "./utils/breakpointUtils";
import {
  convertCSSVariablesToString,
  getThemeClassNames,
} from "./utils/styleUtils";

import {
  AppState,
  ChatWidthBreakpoint,
  PendingUpload,
} from "../types/state/AppState";
import {
  AutoScrollOptions,
  HasDoAutoScroll,
} from "../types/utilities/HasDoAutoScroll";
import { HasRequestFocus } from "../types/utilities/HasRequestFocus";
import { MessageSendSource } from "../types/events/eventBusTypes";
import { CarbonTheme } from "../types/config/PublicConfig";
import { FileStatusValue } from "./utils/constants";
import type { FileUpload } from "../types/config/ServiceDeskConfig";

import styles from "./AppShell.scss";
import { PageObjectId } from "../testing/PageObjectId";

const applicationStylesheet =
  typeof CSSStyleSheet !== "undefined" ? new CSSStyleSheet() : null;
const cssVariableOverrideStylesheet =
  typeof CSSStyleSheet !== "undefined" ? new CSSStyleSheet() : null;
const visualViewportStylesheet =
  typeof CSSStyleSheet !== "undefined" ? new CSSStyleSheet() : null;

const WIDTH_BREAKPOINT_STANDARD = "cds-aichat--standard-width";
const WIDTH_BREAKPOINT_NARROW = "cds-aichat--narrow-width";
const WIDTH_BREAKPOINT_WIDE = "cds-aichat--wide-width";

interface AppShellProps extends HasServiceManager {
  hostElement?: Element;
  renderWriteableElements?: RenderWriteableElementResponse;
}

/**
 * These are the public imperative functions that are available on the MainWindow component. This interface is
 * declared here to avoid taking a dependency on a specific React component implementation elsewhere.
 */
export interface MainWindowFunctions extends HasRequestFocus, HasDoAutoScroll {
  /**
   * Scrolls to the (full) message with the given ID. Since there may be multiple message items in a given
   * message, this will scroll the first message to the top of the message window.
   *
   * @param messageID The (full) message ID to scroll to.
   * @param animate Whether or not the scroll should be animated. Defaults to true.
   */
  doScrollToMessage(messageID: string, animate?: boolean): void;

  /**
   * Returns the current scrollBottom value for the message scroll panel.
   */
  getMessagesScrollBottom(): number;
}

export default function AppShell({
  hostElement,
  serviceManager,
  renderWriteableElements,
}: AppShellProps) {
  const intl = useIntl();
  const appState = useSelector<AppState, AppState>((state) => state);
  const {
    config,
    persistedToBrowserStorage,
    isHydrated,
    assistantMessageState,
    humanAgentState,
    workspacePanelState,
    allMessageItemsByID,
    allMessagesByID,
    catastrophicErrorType,
    iFramePanelState,
    viewSourcePanelState,
    customPanelState,
    responsePanelState,
    chatWidthBreakpoint,
  } = appState;

  const {
    derived: {
      themeWithDefaults: theme,
      layout,
      languagePack,
      launcher,
      cssVariableOverrides,
      header,
    },
    public: publicConfig,
  } = config;
  const namespaceName = serviceManager.namespace.originalName;
  const languageKey = namespaceName
    ? "window_ariaChatRegionNamespace"
    : "window_ariaChatRegion";
  const regionLabel = intl.formatMessage(
    { id: languageKey },
    { namespace: namespaceName },
  );
  const viewState = persistedToBrowserStorage.viewState;
  const showLauncher = launcher.isOn && viewState.launcher;
  const cssVariableOverrideString = useMemo(
    () => convertCSSVariablesToString(cssVariableOverrides),
    [cssVariableOverrides],
  );
  const useMobileEnhancements =
    IS_PHONE && !publicConfig.disableCustomElementMobileEnhancements;
  const { style: visualViewportStyles } = useMobileViewportLayout({
    enabled: useMobileEnhancements,
    isOpen: viewState.mainWindow,
    margin: 4,
  });
  const dir = isBrowser() ? document.dir || "auto" : "auto";
  const mainWindowRef = useRef<MainWindowFunctions | null>(null);
  const [modalPortalHostElement, setModalPortalHostElement] =
    useState<Element | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationContainerRef = useRef<HTMLElement | null>(null);
  const disclaimerRef = useRef<CDSButton | null>(null);
  const iframePanelRef = useRef<HasRequestFocus | null>(null);
  const viewSourcePanelRef = useRef<HasRequestFocus | null>(null);
  const customPanelRef = useRef<HasRequestFocus | null>(null);
  const responsePanelRef = useRef<HasRequestFocus | null>(null);
  const messagesRef = useRef<MessagesComponentClass | null>(null);
  const inputRef = useRef<InputFunctions | null>(null);

  // Memoizer for messages array
  const messagesToArray = useMemo(
    () => createUnmappingMemoizer<LocalMessageItem>(),
    [],
  );
  const useCustomHostElement = Boolean(hostElement);
  const headerDisplayName = header?.name || publicConfig.assistantName;
  const inputState = selectInputState(appState);
  const agentDisplayState = selectHumanAgentDisplayState(appState);

  // Use derived state hook for memoized calculations
  const {
    showDisclaimer,
    showHomeScreen,
    shouldShowHydrationPanel,
    isHydratingComplete,
  } = useDerivedState({
    publicConfig,
    persistedToBrowserStorage,
    isHydratingCounter: assistantMessageState.isHydratingCounter,
    catastrophicErrorType,
    viewStateMainWindow: viewState.mainWindow,
  });

  // Create a ref to hold the requestFocus function to avoid circular dependency
  const requestFocusRef = useRef<(() => void) | null>(null);
  const requestFocusCallback = useCallback(() => {
    requestFocusRef.current?.();
  }, []);

  // Use window open state hook
  const { open, closing, widgetContainerRef } = useWindowOpenState({
    viewStateMainWindow: viewState.mainWindow,
    isHydrated,
    useCustomHostElement,
    requestFocus: requestFocusCallback,
  });

  // Auto-focus management - must come before useFocusManager
  const { shouldAutoFocus } = useAutoFocusManagement({
    shouldTakeFocusIfOpensAutomatically:
      publicConfig.shouldTakeFocusIfOpensAutomatically,
    hasSentNonWelcomeMessage:
      persistedToBrowserStorage.hasSentNonWelcomeMessage,
    localMessageIDs: assistantMessageState.localMessageIDs,
    allMessageItemsByID,
    allMessagesByID,
    requestFocus: requestFocusCallback,
  });

  // Focus manager - provides requestFocus function
  const requestFocus = useFocusManager({
    shouldAutoFocus,
    showDisclaimer,
    iFramePanelIsOpen: iFramePanelState.isOpen,
    viewSourcePanelIsOpen: viewSourcePanelState.isOpen,
    customPanelIsOpen: customPanelState.isOpen,
    responsePanelIsOpen: responsePanelState.isOpen,
    disclaimerRef,
    iframePanelRef,
    viewSourcePanelRef,
    customPanelRef,
    responsePanelRef,
    inputRef,
  });

  // Update the ref with the actual requestFocus function
  useEffect(() => {
    requestFocusRef.current = requestFocus;
  }, [requestFocus]);

  // Workspace announcements - announces when workspace opens/closes
  useWorkspaceAnnouncements({
    serviceManager,
  });

  // Style injection
  useStyleInjection({
    containerRef,
    hostElement,
    cssVariableOverrideString,
    visualViewportStyles,
    appStyles: styles,
    applicationStylesheet,
    cssVariableOverrideStylesheet,
    visualViewportStylesheet,
  });

  // Input callbacks
  const {
    onSendInput,
    onRestart,
    onClose,
    onToggleHomeScreen,
    onAcceptDisclaimer,
    requestInputFocus,
    shouldDisableInput,
    shouldDisableSend,
    showUploadButtonDisabled,
  } = useInputCallbacks({
    serviceManager,
    appState,
    inputState,
    agentDisplayState,
    isHydrated,
    messagesRef,
  });

  // Human agent callbacks
  const {
    showEndChatConfirmation,
    showConfirmEndChat,
    hideConfirmEndChat,
    confirmHumanAgentEndChat,
    onUserTyping,
    onFilesSelectedForUpload,
  } = useHumanAgentCallbacks({
    serviceManager,
    inputRef,
    isConnectingOrConnected: agentDisplayState.isConnectingOrConnected,
    allowMultipleFileUploads: inputState.allowMultipleFileUploads,
    requestInputFocus,
  });

  // Assistant upload callbacks (non-human-agent context)
  const { onAssistantFilesSelectedForUpload, onRemoveAssistantUpload } =
    useAssistantUploadCallbacks({ serviceManager });

  // Determine whether the assistant upload button should be shown.
  // It is shown when UploadConfig.is_on is true AND we are not in a human-agent session.
  const uploadConfig = publicConfig.upload;
  const isAssistantUploadEnabled =
    uploadConfig?.is_on === true &&
    Boolean(uploadConfig.onFileUpload) &&
    !agentDisplayState.isConnectingOrConnected;

  // Map PendingUpload[] → FileUpload[] so the shared Input component can render them.
  // PendingUpload uses status "uploading" | "complete" | "error"; FileUpload uses FileStatusValue.
  const assistantPendingUploadsForDisplay: FileUpload[] = useMemo(
    () =>
      inputState.pendingUploads.map((u: PendingUpload) => ({
        id: u.id,
        file: u.file,
        status:
          u.status === "uploading"
            ? FileStatusValue.UPLOADING
            : FileStatusValue.EDIT,
        isError: u.status === "error",
        errorMessage: u.errorMessage,
      })),
    [inputState.pendingUploads],
  );

  // Disable the assistant upload button when the max number of files has been reached.
  // Only disable if maxFiles is explicitly configured; if not set, there is no limit.
  const assistantUploadButtonDisabled =
    isAssistantUploadEnabled &&
    uploadConfig?.maxFiles !== undefined &&
    inputState.pendingUploads.length >= uploadConfig.maxFiles;

  // Panel callbacks
  const {
    onPanelOpenStart,
    onPanelOpenEnd,
    onPanelCloseStart,
    onPanelCloseEnd,
  } = usePanelCallbacks({ requestFocus });

  // Resize observer
  const handleResize = useCallback(() => {
    const container = widgetContainerRef.current;
    if (!container) {
      return;
    }
    const height = container.offsetHeight;
    const width = container.offsetWidth;
    const breakpoint = calculateChatWidthBreakpoint(width);
    serviceManager.store.dispatch(actions.setAppStateValue("chatWidth", width));
    serviceManager.store.dispatch(
      actions.setAppStateValue("chatHeight", height),
    );
    serviceManager.store.dispatch(
      actions.setAppStateValue("chatWidthBreakpoint", breakpoint),
    );
  }, [serviceManager, widgetContainerRef]);

  useResizeObserver({
    containerRef: widgetContainerRef,
    onResize: handleResize,
  });

  useOnMount(() => {
    function requestFocusWrapper() {
      try {
        const { persistedToBrowserStorage: persisted } =
          serviceManager.store.getState();
        const { viewState: storeViewState } = persisted;
        if (storeViewState.mainWindow) {
          mainWindowRef.current?.requestFocus();
        }
      } catch (error) {
        consoleError("An error occurred in App.requestFocus", error);
      }
    }
    serviceManager.appWindow = { requestFocus: requestFocusWrapper };
  });

  const handleBoundaryError = useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      serviceManager.actions.errorOccurred(
        createDidCatchErrorData("AppShell", error, errorInfo, true),
      );
    },
    [serviceManager],
  );

  const doAutoScroll = useCallback((options?: AutoScrollOptions) => {
    messagesRef.current?.doAutoScroll(options);
  }, []);

  const getMessagesScrollBottom = useCallback(() => {
    return messagesRef.current?.getContainerScrollBottom() ?? 0;
  }, []);

  const doScrollToMessage = useCallback((messageID: string, animate = true) => {
    messagesRef.current?.doScrollToMessage(messageID, animate);
  }, []);

  const mainWindowFunctions = useMemo<MainWindowFunctions>(
    () => ({
      requestFocus,
      doAutoScroll,
      doScrollToMessage,
      getMessagesScrollBottom,
    }),
    [doAutoScroll, doScrollToMessage, getMessagesScrollBottom, requestFocus],
  );

  useEffect(() => {
    mainWindowRef.current = mainWindowFunctions;
    serviceManager.mainWindow = mainWindowFunctions;
  }, [mainWindowFunctions, serviceManager]);
  // Set scrollbar width CSS variable
  useEffect(() => {
    const container = widgetContainerRef.current;
    if (container) {
      container.style.setProperty(
        "--cds-aichat-scrollbar-width",
        `${SCROLLBAR_WIDTH()}px`,
      );
    }
  }, [widgetContainerRef]);

  return (
    <div
      className={cx(
        `cds-aichat--container--render`,
        getThemeClassNames(theme),
        {
          "cds-aichat--container-disable-mobile-enhancements":
            hostElement && publicConfig.disableCustomElementMobileEnhancements,
          "cds-aichat--is-phone":
            IS_PHONE && !publicConfig.disableCustomElementMobileEnhancements,
          "cds-aichat--is-phone-portrait-mode":
            IS_PHONE_IN_PORTRAIT_MODE &&
            !publicConfig.disableCustomElementMobileEnhancements,
        },
      )}
      data-theme={theme.derivedCarbonTheme}
      dir={dir}
      data-namespace={namespaceName}
      ref={containerRef}
      role="region"
      aria-label={regionLabel}
    >
      <AppShellErrorBoundary onError={handleBoundaryError}>
        <ModalPortalRootProvider hostElement={modalPortalHostElement}>
          <Layer
            className={cx("cds-aichat--widget__layer", {
              "cds-aichat--widget__layer--hidden": !open,
            })}
            level={
              theme.derivedCarbonTheme === CarbonTheme.G10 ||
              theme.derivedCarbonTheme === CarbonTheme.G100
                ? 1
                : 0
            }
          >
            <ChatShell
              data-testid={PageObjectId.CHAT_WIDGET}
              className={cx("cds-aichat--widget", {
                "cds-aichat--widget--default-element": !useCustomHostElement,
                "cds-aichat--widget--launched": !closing,
                "cds-aichat--widget--closing": closing,
                "cds-aichat--widget--closed": !open,
                "cds-aichat--widget--max-width":
                  chatWidthBreakpoint === ChatWidthBreakpoint.WIDE &&
                  layout.hasContentMaxWidth,
                [WIDTH_BREAKPOINT_NARROW]:
                  chatWidthBreakpoint === ChatWidthBreakpoint.NARROW,
                [WIDTH_BREAKPOINT_STANDARD]:
                  chatWidthBreakpoint === ChatWidthBreakpoint.STANDARD,
                [WIDTH_BREAKPOINT_WIDE]:
                  chatWidthBreakpoint === ChatWidthBreakpoint.WIDE,
              })}
              ref={(el) => {
                widgetContainerRef.current = el;
                animationContainerRef.current = el;
              }}
              onScroll={(e: { currentTarget: { scrollTop: number } }) => {
                if (e.currentTarget.scrollTop !== 0) {
                  e.currentTarget.scrollTop = 0;
                }
              }}
              aiEnabled={theme.aiEnabled}
              showFrame={layout?.showFrame}
              roundedCorners={theme.corners === CornersType.ROUND}
              contentMaxWidth={layout.hasContentMaxWidth}
              showWorkspace={workspacePanelState.isOpen}
              workspaceLocation={workspacePanelState.options.preferredLocation}
              workspaceAriaLabel={languagePack.aria_workspaceRegion}
              historyAriaLabel={languagePack.aria_historyRegion}
              messagesAriaLabel={languagePack.aria_messagesRegion}
            >
              <AppShellPanels
                serviceManager={serviceManager}
                languagePack={languagePack}
                assistantName={getAssistantName(
                  config.public.aiEnabled,
                  config,
                )}
                isHydratingComplete={isHydratingComplete}
                shouldShowHydrationPanel={shouldShowHydrationPanel}
                onPanelOpenStart={onPanelOpenStart}
                onPanelOpenEnd={onPanelOpenEnd}
                onPanelCloseStart={onPanelCloseStart}
                onPanelCloseEnd={onPanelCloseEnd}
                onClose={onClose}
                onRestart={onRestart}
                onToggleHomeScreen={onToggleHomeScreen}
                isHomeScreenActive={showHomeScreen}
                customPanelState={customPanelState}
                customPanelRef={customPanelRef}
                publicConfig={publicConfig}
                showDisclaimer={showDisclaimer}
                disclaimerRef={disclaimerRef}
                onAcceptDisclaimer={onAcceptDisclaimer}
                responsePanelState={responsePanelState}
                responsePanelRef={responsePanelRef}
                requestFocus={requestFocus}
                iFramePanelState={iFramePanelState}
                iframePanelRef={iframePanelRef}
                viewSourcePanelState={viewSourcePanelState}
                viewSourcePanelRef={viewSourcePanelRef}
                allMessagesByID={allMessagesByID}
                inputState={inputState}
                config={config}
                catastrophicErrorType={catastrophicErrorType}
              />

              {config.derived.header?.isOn && (
                <div slot="header">
                  <Header
                    onClose={onClose}
                    onRestart={onRestart}
                    headerDisplayName={headerDisplayName}
                    onToggleHomeScreen={onToggleHomeScreen}
                    isHomeScreenActive={showHomeScreen}
                  />
                </div>
              )}

              <AppShellWriteableElements
                serviceManager={serviceManager}
                showHomeScreen={showHomeScreen}
                renderWriteableElements={renderWriteableElements}
              />

              <div
                slot="messages"
                className="cds-aichat--widget--expand-to-fit"
                data-testid={PageObjectId.MAIN_PANEL}
              >
                {showHomeScreen ? (
                  <HomeScreen
                    isHydrated={true}
                    homescreen={publicConfig.homescreen}
                    onSendInput={onSendInput}
                    onToggleHomeScreen={onToggleHomeScreen}
                  />
                ) : (
                  <MessagesComponent
                    ref={messagesRef}
                    messageState={assistantMessageState}
                    localMessageItems={messagesToArray(
                      assistantMessageState.localMessageIDs,
                      allMessageItemsByID,
                    )}
                    requestInputFocus={requestInputFocus}
                    assistantName={publicConfig.assistantName}
                    intl={intl}
                    onEndHumanAgentChat={showConfirmEndChat}
                    locale={publicConfig.locale || "en"}
                    useAITheme={theme.aiEnabled}
                    carbonTheme={theme.derivedCarbonTheme}
                  />
                )}
              </div>

              <div slot="input">
                <Input
                  ref={inputRef}
                  languagePack={languagePack}
                  serviceManager={serviceManager}
                  disableInput={shouldDisableInput()}
                  disableSend={shouldDisableSend()}
                  isInputVisible={inputState.fieldVisible}
                  onSendInput={(text: string) =>
                    onSendInput(text, MessageSendSource.MESSAGE_INPUT)
                  }
                  onUserTyping={onUserTyping}
                  showUploadButton={
                    inputState.allowFileUploads || isAssistantUploadEnabled
                  }
                  disableUploadButton={
                    inputState.allowFileUploads
                      ? showUploadButtonDisabled
                      : assistantUploadButtonDisabled
                  }
                  allowedFileUploadTypes={
                    inputState.allowFileUploads
                      ? inputState.allowedFileUploadTypes
                      : uploadConfig?.accept
                  }
                  allowMultipleFileUploads={
                    inputState.allowFileUploads
                      ? inputState.allowMultipleFileUploads
                      : uploadConfig?.maxFiles === undefined ||
                        uploadConfig.maxFiles > 1
                  }
                  pendingUploads={
                    inputState.allowFileUploads
                      ? inputState.files
                      : assistantPendingUploadsForDisplay
                  }
                  onFilesSelectedForUpload={
                    inputState.allowFileUploads
                      ? onFilesSelectedForUpload
                      : onAssistantFilesSelectedForUpload
                  }
                  onRemoveFile={
                    isAssistantUploadEnabled && !inputState.allowFileUploads
                      ? onRemoveAssistantUpload
                      : undefined
                  }
                  placeholder={
                    languagePack[agentDisplayState.inputPlaceholderKey]
                  }
                  isStopStreamingButtonVisible={
                    inputState.stopStreamingButtonState.isVisible
                  }
                  isStopStreamingButtonDisabled={
                    inputState.stopStreamingButtonState.isDisabled
                  }
                  maxInputChars={config.public.input?.maxInputCharacters}
                  trackInputState
                />
              </div>

              <div
                slot="workspace"
                className="cds-aichat--widget--expand-to-fit"
              >
                <WriteableElement
                  slotName={WriteableElementName.WORKSPACE_PANEL_ELEMENT}
                  className="cds-aichat--workspace-writeable-element cds-aichat--widget--expand-to-fit"
                  id={`workspacePanelElement${serviceManager.namespace.suffix}`}
                />
              </div>
            </ChatShell>
            {/* Modals rendered outside shell */}
            {showEndChatConfirmation && (
              <EndHumanAgentChatModal
                onConfirm={confirmHumanAgentEndChat}
                onCancel={hideConfirmEndChat}
              />
            )}
            {humanAgentState.showScreenShareRequest && (
              <RequestScreenShareModal />
            )}
          </Layer>
        </ModalPortalRootProvider>
      </AppShellErrorBoundary>
      {showLauncher && <LauncherContainer />}
      <div className="cds-aichat--modal-host" ref={setModalPortalHostElement} />
    </div>
  );
}
