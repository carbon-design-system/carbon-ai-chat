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
import cx from 'classnames';
import { createComponent } from '@lit/react';
import { createPortal } from 'react-dom';
import { transformReactIconToCarbonIcon } from '@carbon/ai-chat-components/es/globals/utils/iconTransform.js';
import NativeChatShell, {
  type ShellLayoutBindings,
  type ShellLayoutInputs,
  type ShellLayoutTargets,
} from './components/shell/ChatShell';
import { useNativeInputConfig } from './hooks/useNativeInputConfig';
import { useNativeInputHandle } from './hooks/useNativeInputHandle';
import type { InputFunctions, InputProps } from './utils/inputTypes';
import type CDSButton from '@carbon/web-components/es/components/button/button.js';
import { useIntl } from './hooks/useIntl';
import { useHistoryMobileDetection } from './hooks/useHistoryMobileDetection';
import { useAriaAnnouncer } from './hooks/useAriaAnnouncer';
import { matchesShortcut } from './utils/keyboardUtils';
import {
  composerHasFocus,
  selectCustomPromptLineVisible,
  requestComposerFocus,
} from './utils/customPromptLine';
import { getDeepActiveElement } from './utils/domUtils';

import AppShellErrorBoundary from './AppShellErrorBoundary';
import MessagesComponent, {
  MessagesComponentClass,
} from './components-legacy/MessagesComponent';
import { createUnmappingMemoizer } from './utils/memoizerUtils';
import { WriteableElementName } from './utils/constants';
import { LocalMessageItem } from '../types/messaging/LocalMessageItem';
import { useAppShellPanels } from './AppShellPanels';

import { HasServiceManager } from './hocs/withServiceManager';
import { useMobileViewportLayout } from './hooks/useMobileViewportLayout';
import { useSelector, useStateAccessSelector } from './hooks/useSelector';
import { useWindowOpenState } from './hooks/useWindowOpenState';
import { useFocusManager } from './hooks/useFocusManager';
import { useStyleInjection } from './hooks/useStyleInjection';
import { useDerivedState } from './hooks/useDerivedState';
import { useHumanAgentCallbacks } from './hooks/useHumanAgentCallbacks';
import { useAssistantUploadCallbacks } from './hooks/useAssistantUploadCallbacks';
import { usePanelCallbacks } from './hooks/usePanelCallbacks';
import { useInputCallbacks } from './hooks/useInputCallbacks';
import { useResizeObserver } from './hooks/useResizeObserver';
import {
  useChatViewState,
  useChatViewStateInstance,
} from './hooks/useChatViewState';
import type { ChatViewStateSnapshot } from './services/chatViewState';
import type { ExtensionHosts } from './services/extensionHosts';
import actions from './store/actions';
import {
  selectHumanAgentDisplayState,
  selectInputIsReadonly,
  selectInputFieldVisible,
  selectInputUploadAndStreamingFields,
  selectLanguagePack,
  selectStopStreamingButtonVisible,
} from './store/selectors';
import { shallowEqual } from './store/appStore';
import {
  consoleError,
  consoleWarn,
  createDidCatchErrorData,
  isEnableDebugLog,
} from './utils/miscUtils';
import { useWriteableElementPresence } from './hooks/useWriteableElementPresence';
import {
  IS_PHONE,
  IS_PHONE_IN_PORTRAIT_MODE,
  isBrowser,
} from './utils/browserUtils';
import { SCROLLBAR_WIDTH } from './utils/domUtils';
import {
  adoptOnRoot,
  setVarsForSelector,
} from '@carbon/ai-chat-components/es/components/shared/dynamic-css-var-sheet.js';

const SCROLLBAR_WIDTH_ATTR = 'data-cds-aichat-widget-id';
let scrollbarWidthCounter = 0;
import { calculateChatWidthBreakpoint } from './utils/breakpointUtils';
import {
  convertCSSVariablesToString,
  getThemeClassNames,
} from './utils/styleUtils';

import {
  AppState,
  ChatWidthBreakpoint,
  PendingUpload,
} from '../types/state/AppState';
import type { PublicChatState } from '../types/instance/PublicChatState';
import type { AutoScrollOptions } from '../types/utilities/HasDoAutoScroll';
import type { MainWindowFunctions } from './utils/mainWindowFunctions';
import { HasRequestFocus } from '../types/utilities/HasRequestFocus';
import { MessageSendSource, BusEventType } from '../types/events/eventBusTypes';
import type { JSONContent } from '@tiptap/core';
import { CarbonTheme } from '../types/config/CarbonTheme';
import { FileStatusValue } from './utils/constants';
import type { FileUpload } from '../types/config/ServiceDeskConfig';

import styles from './AppShell.scss';

const NativeShell = createComponent({
  tagName: 'cds-aichat-chat-shell',
  elementClass: NativeChatShell,
  react: React,
});

function ShellMessages({
  shell,
  targets,
  children,
}: {
  shell: NativeChatShell;
  targets: ShellLayoutTargets;
  children: React.ReactNode;
}) {
  useEffect(() => {
    shell.commitMessages(targets.messages, targets.generation);
  }, [shell, targets]);
  return createPortal(children, targets.messages);
}

const applicationStylesheet =
  typeof CSSStyleSheet !== 'undefined' ? new CSSStyleSheet() : null;
const cssVariableOverrideStylesheet =
  typeof CSSStyleSheet !== 'undefined' ? new CSSStyleSheet() : null;

const WIDTH_BREAKPOINT_STANDARD = 'cds-aichat--standard-width';
const WIDTH_BREAKPOINT_NARROW = 'cds-aichat--narrow-width';
const WIDTH_BREAKPOINT_WIDE = 'cds-aichat--wide-width';

// Module-level selectors — stable references so useSelector can use Object.is
// to skip re-renders when the slice hasn't changed.
//
// Config is read field-by-field rather than as the whole `state.config` object:
// `reconcileObjectReferences` (config changes) and the `UPDATE_THEME_STATE`
// spread keep each unchanged sub-object's reference stable, so a change to one
// config field (e.g. a theme switch) only fires the selector that reads it,
// instead of re-rendering AppShell for any config change at all.
const selectThemeWithDefaults = (state: AppState) =>
  state.config.derived.themeWithDefaults;
const selectLayoutConfig = (state: AppState) => state.config.derived.layout;
const selectLauncherConfig = (state: AppState) => state.config.derived.launcher;
const selectCssVariableOverrides = (state: AppState) =>
  state.config.derived.cssVariableOverrides;
const selectHeaderConfig = (state: AppState) => state.config.derived.header;
const selectMessageFocusToggleShortcut = (state: AppState) =>
  state.config.derived.keyboardShortcuts.messageFocusToggle;
const selectPublicConfig = (state: AppState) => state.config.public;
const selectPersistedToBrowserStorage = (state: AppState) =>
  state.persistedToBrowserStorage;
const selectIsHydrated = (state: AppState) => state.isHydrated;
const selectAssistantMessageState = (state: AppState) =>
  state.assistantMessageState;
const selectIsHydratingCounter = (state: PublicChatState) =>
  state.isHydratingCounter;
const selectHumanAgentStateSlice = (state: AppState) => state.humanAgentState;
const selectWorkspacePanelState = (state: AppState) =>
  state.workspacePanelState;
const selectHistoryPanelState = (state: AppState) => state.historyPanelState;
const selectAllMessageItemsByID = (state: AppState) =>
  state.allMessageItemsByID;
const selectAllMessagesByID = (state: AppState) => state.allMessagesByID;
const selectCatastrophicErrorType = (state: AppState) =>
  state.catastrophicErrorType;
const selectCatastrophicErrorPanelState = (state: AppState) =>
  state.catastrophicErrorPanelState;
const selectIFramePanelState = (state: AppState) => state.iFramePanelState;
const selectViewSourcePanelState = (state: AppState) =>
  state.viewSourcePanelState;
const selectCustomPanelState = (state: AppState) => state.customPanelState;
const selectResponsePanelState = (state: AppState) => state.responsePanelState;
const selectChatWidthBreakpoint = (state: AppState) =>
  state.chatWidthBreakpoint;
const selectHumanAgentConfirmation = (snapshot: ChatViewStateSnapshot) =>
  snapshot.humanAgentConfirmation;

interface AppShellProps extends HasServiceManager {
  hosts: ExtensionHosts;
  hostElement?: Element;
  /**
   * Value-stable signal of which writeable-element slots have host content,
   * computed in `ChatAppEntry`. AppShell never receives the raw
   * `renderWriteableElements` map so that a host re-render (new node values) does
   * not break `React.memo(AppShell)`. `undefined` means the host omitted the map
   * entirely (render all default elements); see {@link AppShellWriteableElements}.
   */
  writeableElementsPresentKeys?: string;
}

/**
 * The store-driven application shell. This is the heavy, memoized boundary of
 * the chat: it must depend only on `serviceManager`, store-derived values (via
 * `useSelector`), and stable derived signals. It must never receive raw host
 * render-props — those break `React.memo(AppShell)` whenever a host re-renders
 * with new prop identities. See `ChatAppEntry` for the boundary contract and
 * where host render-props are routed instead (isolated portal siblings).
 */
function AppShell({
  hostElement,
  serviceManager,
  hosts,
  writeableElementsPresentKeys,
}: AppShellProps) {
  const intl = useIntl();
  const ariaAnnouncer = useAriaAnnouncer();

  // Extension consumers can call public APIs from their first passive effect.
  useLayoutEffect(() => {
    serviceManager.ariaAnnouncer = ariaAnnouncer;
    return () => {
      if (serviceManager.ariaAnnouncer === ariaAnnouncer) {
        serviceManager.ariaAnnouncer = undefined;
      }
    };
  }, [serviceManager, ariaAnnouncer]);

  const persistedToBrowserStorage = useSelector(
    selectPersistedToBrowserStorage
  );
  const isHydrated = useSelector(selectIsHydrated);
  const assistantMessageState = useSelector(selectAssistantMessageState);
  const isHydratingCounter = useStateAccessSelector(
    serviceManager.instance.state,
    selectIsHydratingCounter
  );
  const humanAgentState = useSelector(selectHumanAgentStateSlice);
  const workspacePanelState = useSelector(selectWorkspacePanelState);
  const historyPanelState = useSelector(selectHistoryPanelState);
  const allMessageItemsByID = useSelector(selectAllMessageItemsByID);
  const allMessagesByID = useSelector(selectAllMessagesByID);
  const catastrophicErrorType = useSelector(selectCatastrophicErrorType);
  const catastrophicErrorPanelState = useSelector(
    selectCatastrophicErrorPanelState
  );
  const iFramePanelState = useSelector(selectIFramePanelState);
  const viewSourcePanelState = useSelector(selectViewSourcePanelState);
  const customPanelState = useSelector(selectCustomPanelState);
  const responsePanelState = useSelector(selectResponsePanelState);
  const chatWidthBreakpoint = useSelector(selectChatWidthBreakpoint);

  const languagePack = useSelector(selectLanguagePack);
  const theme = useSelector(selectThemeWithDefaults);
  const layout = useSelector(selectLayoutConfig);
  const launcher = useSelector(selectLauncherConfig);
  const cssVariableOverrides = useSelector(selectCssVariableOverrides);
  const header = useSelector(selectHeaderConfig);
  const messageFocusToggleShortcut = useSelector(
    selectMessageFocusToggleShortcut
  );
  const publicConfig = useSelector(selectPublicConfig);
  const namespaceName = serviceManager.namespace.originalName;
  const languageKey = namespaceName
    ? 'window_ariaChatRegionNamespace'
    : 'window_ariaChatRegion';
  const regionLabel = intl.formatMessage(
    { id: languageKey },
    { namespace: namespaceName }
  );
  const viewState = persistedToBrowserStorage.viewState;
  const showLauncher = launcher.isOn && viewState.launcher;
  const cssVariableOverrideString = useMemo(
    () => convertCSSVariablesToString(cssVariableOverrides),
    [cssVariableOverrides]
  );
  const useMobileEnhancements =
    IS_PHONE && !publicConfig.disableCustomElementMobileEnhancements;
  const dir = isBrowser() ? document.dir || 'auto' : 'auto';
  const mainWindowRef = useRef<MainWindowFunctions | null>(null);
  const humanAgentConfirmation = useChatViewState(selectHumanAgentConfirmation);
  const chatViewState = useChatViewStateInstance();
  const [targets, setTargets] = useState<ShellLayoutTargets>();
  const nativeShellRef = useRef<NativeChatShell | null>(null);
  const readyTargets = useRef<ShellLayoutTargets | undefined>(undefined);
  const releaseInitialCommit = useRef<(() => void) | undefined>(undefined);
  const containerRef = useMemo(
    () => ({ current: targets?.container ?? null }),
    [targets?.container]
  );
  const widgetContainerRef = useMemo(
    () => ({ current: targets?.widget ?? null }),
    [targets?.widget]
  );
  const inputIsVisible = useSelector(selectCustomPromptLineVisible);
  const disclaimerRef = useRef<CDSButton | null>(null);
  const iframePanelRef = useRef<HasRequestFocus | null>(null);
  const viewSourcePanelRef = useRef<HasRequestFocus | null>(null);
  const customPanelRef = useRef<HasRequestFocus | null>(null);
  const responsePanelRef = useRef<HasRequestFocus | null>(null);
  const messagesRef = useRef<MessagesComponentClass | null>(null);
  const inputRef = useRef<InputFunctions | null>(null);
  const customPromptLinePresent = useWriteableElementPresence(
    WriteableElementName.CUSTOM_PROMPT_LINE,
    serviceManager.writeableElements,
    writeableElementsPresentKeys
      ?.split(' ')
      .includes(WriteableElementName.CUSTOM_PROMPT_LINE)
  );
  const restoreDraft = useRef(false);
  if (customPromptLinePresent) {
    restoreDraft.current = true;
  }
  const setInputRef = useCallback(
    (input: InputFunctions | null) => {
      if (input || serviceManager.inputComponent === inputRef.current) {
        serviceManager.inputComponent = input;
      }
      inputRef.current = input;
    },
    [serviceManager]
  );
  const composerRef = useMemo(
    () => ({
      current: {
        requestFocus: () => requestComposerFocus(serviceManager),
        hasFocus: () => composerHasFocus(serviceManager),
      },
    }),
    [serviceManager]
  );
  const hadComposerFocus = useRef(false);
  useEffect(() => {
    const trackFocus = () => {
      hadComposerFocus.current = composerHasFocus(serviceManager);
    };
    document.addEventListener('focusin', trackFocus, true);
    return () => document.removeEventListener('focusin', trackFocus, true);
  }, [serviceManager]);
  useEffect(() => {
    if (!hadComposerFocus.current) {
      return undefined;
    }
    const frame = requestAnimationFrame(() =>
      requestComposerFocus(serviceManager)
    );
    return () => cancelAnimationFrame(frame);
  }, [customPromptLinePresent, serviceManager]);

  useMobileViewportLayout({
    enabled: useMobileEnhancements,
    containerRef,
    margin: 4,
  });

  // Memoizer for messages array
  const messagesToArray = useMemo(
    () => createUnmappingMemoizer<LocalMessageItem>(),
    []
  );
  const useCustomHostElement = Boolean(hostElement);
  // Narrow subscription to just the fields AppShell consumes from the active
  // input slice: file-upload + stop-streaming-button. With `shallowEqual`, this
  // avoids re-rendering on every keystroke (rawValue/displayValue updates).
  const inputFields = useSelector(
    selectInputUploadAndStreamingFields,
    shallowEqual
  );
  // Effective input flags derived from config + runtime override.
  const isInputReadonly = useSelector(selectInputIsReadonly);
  const isInputFieldVisible = useSelector(selectInputFieldVisible);
  const isStopStreamingButtonVisible = useSelector(
    selectStopStreamingButtonVisible
  );
  const agentDisplayState = useSelector(
    selectHumanAgentDisplayState,
    shallowEqual
  );

  // Use derived state hook for memoized calculations
  const {
    showDisclaimer,
    showHomeScreen,
    shouldShowHydrationPanel,
    isHydratingComplete,
  } = useDerivedState({
    publicConfig,
    persistedToBrowserStorage,
    isHydratingCounter,
    catastrophicErrorType,
    viewStateMainWindow: viewState.mainWindow,
  });

  // Create a ref to hold the requestFocus function to avoid circular dependency
  const requestFocusRef = useRef<(() => void) | null>(null);
  const requestFocusCallback = useCallback(() => {
    const shell = nativeShellRef.current;
    if (!shell) {
      return;
    }
    if (readyTargets.current) {
      requestFocusRef.current?.();
      return;
    }
    void shell.whenReady().then((ready) => {
      if (ready && nativeShellRef.current === shell) {
        requestFocusRef.current?.();
      }
    });
  }, []);

  // Use window open state hook
  const {
    open,
    closing,
    widgetContainerRef: windowWidgetRef,
  } = useWindowOpenState({
    viewStateMainWindow: viewState.mainWindow,
    isHydrated,
    useCustomHostElement,
    requestFocus: requestFocusCallback,
  });

  // Auto-focus is based on config only - no dynamic toggling to avoid
  // interrupting screen reader announcements when messages arrive
  const shouldAutoFocus =
    publicConfig.shouldTakeFocusIfOpensAutomatically ?? true;

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
    inputRef: composerRef,
  });

  // Update the ref with the actual requestFocus function
  useEffect(() => {
    requestFocusRef.current = requestFocus;
  }, [requestFocus]);

  // Announce home screen visibility changes
  useEffect(() => {
    // Skip announcement on initial mount
    if (!isHydrated) {
      return;
    }

    if (showHomeScreen) {
      ariaAnnouncer(languagePack.homeScreen_shown);
    } else if (persistedToBrowserStorage.hasSentNonWelcomeMessage) {
      // Only announce returning to conversation if user has sent messages
      ariaAnnouncer(languagePack.homeScreen_hidden);
    }
  }, [
    showHomeScreen,
    isHydrated,
    ariaAnnouncer,
    languagePack,
    persistedToBrowserStorage.hasSentNonWelcomeMessage,
  ]);

  // Style injection
  useStyleInjection({
    containerRef,
    hostElement,
    cssVariableOverrideString,
    appStyles: styles,
    applicationStylesheet,
    cssVariableOverrideStylesheet,
  });

  // Input callbacks
  const {
    onSendInput,
    onStopStreaming,
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
    agentDisplayState,
    isHydrated,
    messagesRef,
    humanAgentFileUploadInProgress: humanAgentState.fileUploadInProgress,
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
    isConnectingOrConnected: agentDisplayState.isConnectingOrConnected,
    allowMultipleFileUploads: inputFields.allowMultipleFileUploads,
    requestInputFocus,
  });

  // Assistant upload callbacks (non-human-agent context)
  const { onAssistantFilesSelectedForUpload, onRemoveAssistantUpload } =
    useAssistantUploadCallbacks({ serviceManager });

  // Determine whether the assistant upload button should be shown.
  // It is shown when UploadConfig.isOn is true AND we are not in a human-agent session.
  const uploadConfig = publicConfig.upload;
  const isAssistantUploadEnabled =
    uploadConfig?.isOn === true &&
    Boolean(uploadConfig.onFileUpload) &&
    !agentDisplayState.isConnectingOrConnected;

  // Map PendingUpload[] → FileUpload[] so the shared Input component can render them.
  // PendingUpload uses status "uploading" | "complete" | "error"; FileUpload uses FileStatusValue.
  const assistantPendingUploadsForDisplay: FileUpload[] = useMemo(
    () =>
      inputFields.pendingUploads.map((u: PendingUpload) => ({
        id: u.id,
        file: u.file,
        status:
          u.status === 'uploading'
            ? FileStatusValue.UPLOADING
            : FileStatusValue.EDIT,
        isError: u.status === 'error',
        errorMessage: u.errorMessage,
      })),
    [inputFields.pendingUploads]
  );

  // Disable the assistant upload button when the max number of files has been reached.
  // Only disable if maxFiles is explicitly configured; if not set, there is no limit.
  const assistantUploadButtonDisabled =
    isAssistantUploadEnabled &&
    uploadConfig?.maxFiles !== undefined &&
    inputFields.pendingUploads.length >= uploadConfig.maxFiles;

  // One error entry per errored attachment, each naming the file. Rendered as
  // stacked rows in the field-messaging slot so every failure is visible at once
  // rather than only the first. Errors from `inputFields.files` (host-managed
  // uploads) and `inputFields.pendingUploads` (assistant-managed) are merged and
  // sorted alphabetically by file name — matching the chip ordering.
  const inputUploadErrors = useMemo(() => {
    type ErrorEntry = {
      id: string;
      filename: string;
      title: string;
      description?: string;
    };

    const entries: ErrorEntry[] = [];

    for (const f of inputFields.files) {
      if (!f.isError) {
        continue;
      }
      const filename = f.file?.name ?? '';
      entries.push({
        id: f.id,
        filename,
        title: intl.formatMessage(
          { id: 'fileSharing_uploadErrorTitleWithName' },
          { filename }
        ),
        description: [
          f.errorMessage,
          languagePack.fileSharing_uploadErrorRecovery,
        ]
          .filter(Boolean)
          .join(' '),
      });
    }

    for (const u of inputFields.pendingUploads) {
      if (u.status !== 'error') {
        continue;
      }
      const filename = u.file?.name ?? '';
      entries.push({
        id: u.id,
        filename,
        title: intl.formatMessage(
          { id: 'fileSharing_uploadErrorTitleWithName' },
          { filename }
        ),
        description: [
          u.errorMessage,
          languagePack.fileSharing_uploadErrorRecovery,
        ]
          .filter(Boolean)
          .join(' '),
      });
    }

    entries.sort((a, b) =>
      a.filename.localeCompare(b.filename, undefined, { sensitivity: 'base' })
    );

    return entries.length > 0 ? entries : undefined;
  }, [
    inputFields.files,
    inputFields.pendingUploads,
    intl,
    languagePack.fileSharing_uploadErrorRecovery,
  ]);

  // Config-provided error only; upload errors go through `inputUploadErrors`.
  const inputError = publicConfig.input?.error;

  // Disable the human-agent upload button once its (optional) max number of files
  // is reached, on top of the existing connection/streaming gating.
  const humanAgentUploadButtonDisabled =
    showUploadButtonDisabled ||
    (inputFields.maxFiles !== undefined &&
      inputFields.files.length >= inputFields.maxFiles);

  // Panel callbacks
  const {
    onPanelOpenStart,
    onPanelOpenEnd,
    onPanelCloseStart,
    onPanelCloseEnd,
  } = usePanelCallbacks({ requestFocus });

  const customHeaderPresent = useWriteableElementPresence(
    WriteableElementName.CUSTOM_HEADER,
    serviceManager.writeableElements,
    writeableElementsPresentKeys
      ?.split(' ')
      .includes(WriteableElementName.CUSTOM_HEADER)
  );

  // Header config override for mobile history
  const headerConfigOverride = useMemo(() => {
    const showMobileMenu = publicConfig.history?.showMobileMenu ?? true;

    if (
      !publicConfig.history?.isOn ||
      !historyPanelState.isMobile ||
      !showMobileMenu ||
      customHeaderPresent
    ) {
      return undefined;
    }

    return {
      isOn: true,
      menuOptions: [
        {
          text: languagePack.history_new_chat,
          handler: () => {
            serviceManager.fire({
              type: BusEventType.HISTORY_PANEL_NEW_CHAT,
            });
          },
        },
        {
          text: languagePack.history_view_chats,
          handler: () => {
            serviceManager.fire({
              type: BusEventType.HISTORY_PANEL_PRE_OPEN,
            });

            serviceManager.store.dispatch(actions.setHistoryPanelOpen(true));
          },
        },
        ...(header?.menuOptions || []),
      ],
    };
  }, [
    historyPanelState.isMobile,
    header,
    serviceManager,
    languagePack.history_new_chat,
    languagePack.history_view_chats,
    publicConfig.history?.isOn,
    publicConfig.history?.showMobileMenu,
    customHeaderPresent,
  ]);

  const customHeaderMobileWarningFired = useRef(false);

  // True when the host is responsible for providing mobile history menu controls
  // (open/close) because CUSTOM_HEADER suppresses the built-in menu.
  const isHostControlledHistoryMenu =
    customHeaderPresent &&
    publicConfig.history?.isOn &&
    historyPanelState.isMobile;

  useEffect(() => {
    if (
      isHostControlledHistoryMenu &&
      !customHeaderMobileWarningFired.current &&
      isEnableDebugLog()
    ) {
      customHeaderMobileWarningFired.current = true;
      consoleWarn(
        'CUSTOM_HEADER is present while the history panel is in its mobile layout. The built-in mobile history menu no longer renders; supply your own controls. See docs/CustomHistory.md.'
      );
    }
  }, [isHostControlledHistoryMenu]);

  // History mobile detection hook
  const updateHistoryMobileDetection = useHistoryMobileDetection({
    container: widgetContainerRef.current,
    useCustomHostElement,
    serviceManager,
  });

  // Resize observer
  const handleResize = useCallback(() => {
    const container = widgetContainerRef.current;
    if (!container) {
      return;
    }
    const height = container.offsetHeight;
    const width = container.offsetWidth;
    const breakpoint = calculateChatWidthBreakpoint(width);
    serviceManager.store.dispatch(actions.setAppStateValue('chatWidth', width));
    serviceManager.store.dispatch(
      actions.setAppStateValue('chatHeight', height)
    );
    serviceManager.store.dispatch(
      actions.setAppStateValue('chatWidthBreakpoint', breakpoint)
    );

    // Update history mobile detection
    updateHistoryMobileDetection(width);
  }, [widgetContainerRef, serviceManager, updateHistoryMobileDetection]);

  useResizeObserver({
    containerRef: widgetContainerRef,
    onResize: handleResize,
  });

  useLayoutEffect(() => {
    function requestFocusWrapper() {
      try {
        const { persistedToBrowserStorage: persisted } =
          serviceManager.store.getState();
        const { viewState: storeViewState } = persisted;
        if (storeViewState.mainWindow) {
          mainWindowRef.current?.requestFocus();
        }
      } catch (error) {
        consoleError('An error occurred in App.requestFocus', error);
      }
    }
    const appWindow = { requestFocus: requestFocusWrapper };
    serviceManager.appWindow = appWindow;
    return () => {
      if (serviceManager.appWindow === appWindow) {
        serviceManager.appWindow = undefined;
      }
    };
  }, [serviceManager]);

  const handleBoundaryError = useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      serviceManager.actions.errorOccurred(
        createDidCatchErrorData('AppShell', error, errorInfo, true)
      );
    },
    [serviceManager]
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

  const handleFocusToggle = useCallback(() => {
    if (composerRef.current.hasFocus()) {
      if (!messagesRef.current) {
        return false;
      }
      messagesRef.current.requestFocusOnFirstItemOfLastMessage();
      return true;
    }
    return composerRef.current.requestFocus();
  }, [composerRef]);

  // Stable wrapper so <Input> receives a referentially stable onSendInput prop.
  // When the home screen is active the single unconditional <Input> acts as the
  // home-screen prompt line, so it must emit HOME_SCREEN_INPUT; otherwise it is
  // the message-list input and emits MESSAGE_INPUT.
  const onSendInputFromInput = useCallback(
    (text: string, displayContent?: JSONContent) =>
      onSendInput(
        text,
        showHomeScreen
          ? MessageSendSource.HOME_SCREEN_INPUT
          : MessageSendSource.MESSAGE_INPUT,
        undefined,
        displayContent
      ),
    [onSendInput, showHomeScreen]
  );

  // Add keyboard event listener for focus toggle shortcut and Escape to exit message navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        messageFocusToggleShortcut.isOn &&
        matchesShortcut(event, messageFocusToggleShortcut)
      ) {
        if (handleFocusToggle()) {
          event.preventDefault();
          event.stopPropagation();
        }
      } else if (event.key === 'Escape') {
        // If focus is in the messages area, return to input field
        // Use getDeepActiveElement to traverse all shadow DOM levels
        const activeElement = getDeepActiveElement();

        // Search within containerRef, not the entire document
        const messagesWrapper = containerRef.current?.querySelector(
          '.cds-aichat--messages__wrapper'
        );
        const messagesContainer = containerRef.current?.querySelector(
          '.cds-aichat--messages'
        );
        if (composerRef.current.hasFocus()) {
          composerRef.current.requestFocus();
        } else if (
          activeElement &&
          (messagesWrapper?.contains(activeElement) ||
            messagesContainer?.contains(activeElement))
        ) {
          if (composerRef.current.requestFocus()) {
            event.preventDefault();
          }
        }
      }
    };

    // Only attach listener when chat is open and container is available
    if (viewState.mainWindow && containerRef.current) {
      const container = containerRef.current;
      container.addEventListener('keydown', handleKeyDown);
      return () => {
        container.removeEventListener('keydown', handleKeyDown);
      };
    }

    return undefined;
  }, [
    messageFocusToggleShortcut,
    composerRef,
    handleFocusToggle,
    viewState.mainWindow,
    containerRef,
  ]);

  const mainWindowFunctions = useMemo<MainWindowFunctions>(
    () => ({
      requestFocus,
      doAutoScroll,
      doScrollToMessage,
      getMessagesScrollBottom,
    }),
    [doAutoScroll, doScrollToMessage, getMessagesScrollBottom, requestFocus]
  );

  useLayoutEffect(() => {
    mainWindowRef.current = mainWindowFunctions;
    serviceManager.mainWindow = mainWindowFunctions;
    return () => {
      if (mainWindowRef.current === mainWindowFunctions) {
        mainWindowRef.current = null;
      }
      if (serviceManager.mainWindow === mainWindowFunctions) {
        serviceManager.mainWindow = undefined;
      }
    };
  }, [mainWindowFunctions, serviceManager]);

  // Set scrollbar width CSS variable. Written via the shared dynamic
  // stylesheet.
  useEffect(() => {
    const container = widgetContainerRef.current;
    if (!container) {
      return;
    }
    let id = container.getAttribute(SCROLLBAR_WIDTH_ATTR);
    if (!id) {
      id = `widget-${++scrollbarWidthCounter}`;
      container.setAttribute(SCROLLBAR_WIDTH_ATTR, id);
    }
    const root = container.getRootNode();
    if (root instanceof Document || root instanceof ShadowRoot) {
      adoptOnRoot(root);
    }
    setVarsForSelector(`[${SCROLLBAR_WIDTH_ATTR}="${id}"]`, {
      '--cds-aichat-scrollbar-width': `${SCROLLBAR_WIDTH()}px`,
    });
  }, [widgetContainerRef]);

  const inputConfig = useNativeInputConfig();
  const { setInputRef: setInputElement, handleInputHandleChange } =
    useNativeInputHandle(setInputRef);
  const panels = useAppShellPanels({
    hosts,
    endChatConfirmation: humanAgentConfirmation,
    showEndChatConfirmation,
    confirmHumanAgentEndChat,
    hideConfirmEndChat,
    showScreenShareRequest: humanAgentState.showScreenShareRequest,
    serviceManager,
    isHydratingComplete,
    shouldShowHydrationPanel,
    onPanelOpenStart,
    onPanelOpenEnd,
    onPanelCloseStart,
    onPanelCloseEnd,
    onClose,
    onRestart,
    onToggleHomeScreen,
    isHomeScreenActive: showHomeScreen,
    customPanelState,
    customPanelRef,
    showDisclaimer,
    disclaimerRef,
    onAcceptDisclaimer,
    responsePanelState,
    responsePanelRef,
    requestFocus,
    historyPanelState,
    iFramePanelState,
    iframePanelRef,
    viewSourcePanelState,
    viewSourcePanelRef,
    allMessagesByID,
    isInputReadonly,
    catastrophicErrorPanelState,
  });
  const { setNativeElement: setPanelElement } = panels;
  const inputSnapshot: InputProps = {
    restoreDraft: restoreDraft.current,
    disableInput: shouldDisableInput(),
    disableSend: shouldDisableSend(),
    isInputVisible: isInputFieldVisible,
    onSendInput: onSendInputFromInput,
    onStopStreaming,
    onUserTyping,
    showUploadButton: inputFields.allowFileUploads || isAssistantUploadEnabled,
    disableUploadButton: inputFields.allowFileUploads
      ? humanAgentUploadButtonDisabled
      : assistantUploadButtonDisabled,
    allowedFileUploadTypes: inputFields.allowFileUploads
      ? inputFields.allowedFileUploadTypes
      : uploadConfig?.accept,
    allowMultipleFileUploads: inputFields.allowFileUploads
      ? inputFields.allowMultipleFileUploads
      : uploadConfig?.maxFiles === undefined || uploadConfig.maxFiles > 1,
    maxFileSizeBytes: inputFields.allowFileUploads
      ? inputFields.maxFileSizeBytes
      : uploadConfig?.maxFileSizeBytes,
    maxFiles: inputFields.allowFileUploads
      ? inputFields.maxFiles
      : uploadConfig?.maxFiles,
    pendingUploads: inputFields.allowFileUploads
      ? inputFields.files
      : assistantPendingUploadsForDisplay,
    onFilesSelectedForUpload: inputFields.allowFileUploads
      ? onFilesSelectedForUpload
      : onAssistantFilesSelectedForUpload,
    onRemoveFile:
      isAssistantUploadEnabled && !inputFields.allowFileUploads
        ? onRemoveAssistantUpload
        : undefined,
    placeholder: languagePack[agentDisplayState.inputPlaceholderKey],
    isStopStreamingButtonVisible,
    isStopStreamingButtonDisabled:
      inputFields.stopStreamingButtonState.isDisabled ||
      inputFields.stopStreamingButtonState.isMetadataDisabled,
    maxInputChars: publicConfig.input?.maxInputCharacters,
    trackInputState: true,
    rounded:
      chatWidthBreakpoint === ChatWidthBreakpoint.WIDE &&
      layout.hasContentMaxWidth &&
      (!IS_PHONE_IN_PORTRAIT_MODE ||
        !!publicConfig.disableCustomElementMobileEnhancements),
    error: inputError,
    uploadErrors: inputUploadErrors,
  };
  const inputProps = useMemo(
    () => ({
      restoreDraft: inputSnapshot.restoreDraft,
      disableInput: inputSnapshot.disableInput,
      disableSend: inputSnapshot.disableSend,
      isInputVisible: inputSnapshot.isInputVisible,
      onSendInput: inputSnapshot.onSendInput,
      onStopStreaming: inputSnapshot.onStopStreaming,
      onUserTyping: inputSnapshot.onUserTyping,
      showUploadButton: inputSnapshot.showUploadButton,
      disableUploadButton: inputSnapshot.disableUploadButton,
      allowedFileUploadTypes: inputSnapshot.allowedFileUploadTypes,
      allowMultipleFileUploads: inputSnapshot.allowMultipleFileUploads,
      maxFileSizeBytes: inputSnapshot.maxFileSizeBytes,
      maxFiles: inputSnapshot.maxFiles,
      pendingUploads: inputSnapshot.pendingUploads,
      onFilesSelectedForUpload: inputSnapshot.onFilesSelectedForUpload,
      onRemoveFile: inputSnapshot.onRemoveFile,
      placeholder: inputSnapshot.placeholder,
      isStopStreamingButtonVisible: inputSnapshot.isStopStreamingButtonVisible,
      isStopStreamingButtonDisabled:
        inputSnapshot.isStopStreamingButtonDisabled,
      maxInputChars: inputSnapshot.maxInputChars,
      trackInputState: inputSnapshot.trackInputState,
      rounded: inputSnapshot.rounded,
      error: inputSnapshot.error,
      uploadErrors: inputSnapshot.uploadErrors,
    }),
    [
      inputSnapshot.restoreDraft,
      inputSnapshot.disableInput,
      inputSnapshot.disableSend,
      inputSnapshot.isInputVisible,
      inputSnapshot.onSendInput,
      inputSnapshot.onStopStreaming,
      inputSnapshot.onUserTyping,
      inputSnapshot.showUploadButton,
      inputSnapshot.disableUploadButton,
      inputSnapshot.allowedFileUploadTypes,
      inputSnapshot.allowMultipleFileUploads,
      inputSnapshot.maxFileSizeBytes,
      inputSnapshot.maxFiles,
      inputSnapshot.pendingUploads,
      inputSnapshot.onFilesSelectedForUpload,
      inputSnapshot.onRemoveFile,
      inputSnapshot.placeholder,
      inputSnapshot.isStopStreamingButtonVisible,
      inputSnapshot.isStopStreamingButtonDisabled,
      inputSnapshot.maxInputChars,
      inputSnapshot.trackInputState,
      inputSnapshot.rounded,
      inputSnapshot.error,
      inputSnapshot.uploadErrors,
    ]
  );

  const bindings = useMemo<ShellLayoutBindings>(
    () => ({
      setInputElement,
      onInputHandleChange: handleInputHandleChange,
      setPanelElement,
    }),
    [setInputElement, handleInputHandleChange, setPanelElement]
  );
  const onTargetsReady = useCallback(
    (next: ShellLayoutTargets | undefined) => {
      readyTargets.current = undefined;
      windowWidgetRef.current = next?.widget ?? null;
      setTargets(next);
    },
    [windowWidgetRef]
  );
  const setNativeShell = useCallback(
    (element: NativeChatShell | null) => {
      nativeShellRef.current = element;
      if (!element) {
        readyTargets.current = undefined;
        setInputElement(null);
        setPanelElement(null);
        windowWidgetRef.current = null;
      }
    },
    [setInputElement, setPanelElement, windowWidgetRef]
  );
  useLayoutEffect(() => {
    const release = chatViewState.holdInitialReactCommit();
    releaseInitialCommit.current = release;
    return release;
  }, [chatViewState]);
  useEffect(() => {
    const shell = nativeShellRef.current;
    if (!shell) {
      return undefined;
    }
    let current = true;
    void shell.whenReady().then((ready) => {
      if (!current || nativeShellRef.current !== shell) {
        return;
      }
      if (ready) {
        readyTargets.current = targets;
      }
      releaseInitialCommit.current?.();
    });
    return () => {
      current = false;
    };
  }, [targets]);

  const shellLayout: ShellLayoutInputs = {
    container: {
      className: cx(
        'cds-aichat--container--render',
        getThemeClassNames(theme),
        {
          'cds-aichat--container-disable-mobile-enhancements':
            hostElement && publicConfig.disableCustomElementMobileEnhancements,
          'cds-aichat--is-phone':
            IS_PHONE && !publicConfig.disableCustomElementMobileEnhancements,
          'cds-aichat--is-phone-portrait-mode':
            IS_PHONE_IN_PORTRAIT_MODE &&
            !publicConfig.disableCustomElementMobileEnhancements,
        }
      ),
      theme: theme.derivedCarbonTheme,
      dir,
      namespace: namespaceName,
      label: regionLabel,
    },
    layer: {
      className: cx('cds-aichat--widget__layer', {
        'cds-aichat--widget__layer--hidden': !open,
      }),
      level:
        theme.derivedCarbonTheme === CarbonTheme.G10 ||
        theme.derivedCarbonTheme === CarbonTheme.G100
          ? 1
          : 0,
    },
    shell: {
      className: cx('cds-aichat--widget', {
        'cds-aichat-float--open': !useCustomHostElement && open,
        'cds-aichat-float--opening': !useCustomHostElement && !closing && open,
        'cds-aichat-float--closing': !useCustomHostElement && closing,
        'cds-aichat-float--close': !useCustomHostElement && !open,
        'cds-aichat-float--mobile':
          !useCustomHostElement &&
          IS_PHONE &&
          !publicConfig.disableCustomElementMobileEnhancements,
        'cds-aichat--widget--max-width':
          chatWidthBreakpoint === ChatWidthBreakpoint.WIDE &&
          layout.hasContentMaxWidth,
        [WIDTH_BREAKPOINT_NARROW]:
          chatWidthBreakpoint === ChatWidthBreakpoint.NARROW,
        [WIDTH_BREAKPOINT_STANDARD]:
          chatWidthBreakpoint === ChatWidthBreakpoint.STANDARD,
        [WIDTH_BREAKPOINT_WIDE]:
          chatWidthBreakpoint === ChatWidthBreakpoint.WIDE,
      }),
      onPanelFocusFallback: requestInputFocus,
      props: {
        aiEnabled: theme.aiEnabled,
        showFrame: layout?.showFrame,
        cornerAll:
          theme.corners.startStart === theme.corners.startEnd &&
          theme.corners.startStart === theme.corners.endStart &&
          theme.corners.startStart === theme.corners.endEnd
            ? theme.corners.startStart
            : undefined,
        cornerStartStart: theme.corners.startStart,
        cornerStartEnd: theme.corners.startEnd,
        cornerEndStart: theme.corners.endStart,
        cornerEndEnd: theme.corners.endEnd,
        contentMaxWidth: layout.hasContentMaxWidth,
        showWorkspace: workspacePanelState.isOpen,
        workspaceLocation: workspacePanelState.options.preferredLocation,
        showHistory:
          (publicConfig.history?.isOn ?? false) && historyPanelState.isOpen,
        workspaceAriaLabel: languagePack.aria_workspaceRegion,
        historyAriaLabel: languagePack.aria_historyRegion,
        messagesAriaLabel: languagePack.aria_messagesRegion,
        panelOpenedAnnouncement: languagePack.panel_opened,
        panelClosedAnnouncement: languagePack.panel_closed,
        workspaceOpenedAnnouncement: workspacePanelState.options.title
          ? intl.formatMessage(
              { id: 'workspace_opened' },
              { title: workspacePanelState.options.title }
            )
          : languagePack.workspace_opened_no_title,
        workspaceClosedAnnouncement: languagePack.workspace_closed,
        historyShownAnnouncement: languagePack.history_shown,
        historyHiddenAnnouncement: languagePack.history_hidden,
      },
    },
    panels: panels.nativeProps,
    header:
      !customHeaderPresent && (header?.isOn || headerConfigOverride?.isOn)
        ? {
            onClose,
            onRestart,
            onToggleHomeScreen,
            isHomeScreenActive: showHomeScreen,
            headerConfigOverride,
            transformIcon: transformReactIconToCarbonIcon,
          }
        : undefined,
    showHomeScreen,
    home: { isHydrated: true, onSendInput, onToggleHomeScreen },
    input: !customPromptLinePresent
      ? {
          inputProps,
          contentOwner: hosts.autocompleteContent,
          ...inputConfig,
        }
      : undefined,
    writeables: {
      suffix: serviceManager.namespace.suffix,
      showHomeScreen,
      writeableElementsPresentKeys,
      inputIsVisible,
      hasContentMaxWidth: header.hasContentMaxWidth ?? false,
      headerIsOn: header.isOn ?? true,
    },
    showLauncher,
  };

  return (
    <AppShellErrorBoundary onError={handleBoundaryError}>
      <NativeShell
        ref={setNativeShell}
        layout={shellLayout}
        bindings={bindings}
        onTargetsReady={onTargetsReady}
      />
      {panels.content}
      {!showHomeScreen && targets?.messages && nativeShellRef.current && (
        <ShellMessages shell={nativeShellRef.current} targets={targets}>
          <MessagesComponent
            ref={messagesRef}
            messageState={assistantMessageState}
            localMessageItems={messagesToArray(
              assistantMessageState.localMessageIDs,
              allMessageItemsByID
            )}
            requestInputFocus={requestInputFocus}
            assistantName={publicConfig.assistantName}
            assistantAvatarUrl={publicConfig.assistantAvatarUrl}
            intl={intl}
            onEndHumanAgentChat={showConfirmEndChat}
            locale={publicConfig.locale || 'en'}
            carbonTheme={theme.derivedCarbonTheme}
          />
        </ShellMessages>
      )}
    </AppShellErrorBoundary>
  );
}

export default React.memo(AppShell);
