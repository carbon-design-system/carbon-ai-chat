/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from 'classnames';
import type { JSONContent } from '@tiptap/core';
import type { ChatViewState } from '../services/chatViewState';
import type { AppState, PendingUpload } from '../../types/state/AppState';
import { ChatWidthBreakpoint } from '../../types/state/AppState';
import { CarbonTheme } from '../../types/config/CarbonTheme';
import {
  MessageSendSource,
  BusEventType,
} from '../../types/events/eventBusTypes';
import type { FileUpload } from '../../types/config/ServiceDeskConfig';
import type { ExtensionHosts } from '../services/extensionHosts';
import type { MessagesComponentClass } from '../components-legacy/MessagesComponent';
import type {
  ShellLayoutInputs,
  ShellLayoutTargets,
} from '../components/shell/renderShellLayout';
import type {
  PanelViewInputs,
  PanelCompositionCallbacks,
} from './panelComposition';
import type { InputFunctions, InputProps } from './inputTypes';
import type { MainWindowFunctions } from './mainWindowFunctions';
import {
  InputCallbacks,
  requestInputFocus as focusInput,
  shouldDisableInput,
  shouldDisableSend,
  isUploadButtonDisabled,
} from '../services/inputCallbacks';
import { HumanAgentCallbacks } from '../services/humanAgentCallbacks';
import { WindowOpenState } from '../services/windowOpenState';
import { shallowEqual } from '../store/appStore';
import actions from '../store/actions';
import { DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS } from '../store/reducerUtils';
import {
  selectHumanAgentDisplayState,
  selectInputIsReadonly,
  selectInputIsDisabled,
  selectInputFieldVisible,
  selectInputUploadAndStreamingFields,
  selectStopStreamingButtonVisible,
} from '../store/selectors';
import { getDerivedState } from './derivedState';
import { requestFocus as focusTargets } from './focusManager';
import { connectMobileViewportLayout } from './mobileViewportLayout';
import { injectStyles } from './styleInjection';
import { observeResize } from './resizeObserver';
import { updateHistoryMobileDetection } from './historyMobileDetection';
import { calculateChatWidthBreakpoint } from './breakpointUtils';
import { createAssistantUploadCallbacks } from './assistantUploadCallbacks';
import { createPanelCallbacks } from './panelCallbacks';
import {
  composerHasFocus,
  requestComposerFocus,
  selectCustomPromptLineVisible,
} from './customPromptLine';
import { matchesShortcut } from './keyboardUtils';
import { getDeepActiveElement, SCROLLBAR_WIDTH } from './domUtils';
import { consoleError, consoleWarn, isEnableDebugLog } from './miscUtils';
import { IS_PHONE, IS_PHONE_IN_PORTRAIT_MODE, isBrowser } from './browserUtils';
import { convertCSSVariablesToString, getThemeClassNames } from './styleUtils';
import { WriteableElementName, FileStatusValue } from './constants';
import {
  hasMeaningfulContent,
  observeWriteableElementPresence,
} from './writeableElementPresence';
import {
  adoptOnRoot,
  setVarsForSelector,
} from '@carbon/ai-chat-components/es/components/shared/dynamic-css-var-sheet.js';
import styles from '../AppShell.scss';

const applicationStylesheet =
  typeof CSSStyleSheet !== 'undefined' ? new CSSStyleSheet() : null;
const cssVariableOverrideStylesheet =
  typeof CSSStyleSheet !== 'undefined' ? new CSSStyleSheet() : null;
const SCROLLBAR_WIDTH_ATTR = 'data-cds-aichat-widget-id';
let scrollbarWidthCounter = 0;
const announcerOwners = new WeakMap<
  ChatViewState['serviceManager'],
  ShellLifecycle
>();
const WIDTH_BREAKPOINT_STANDARD = 'cds-aichat--standard-width';
const WIDTH_BREAKPOINT_NARROW = 'cds-aichat--narrow-width';
const WIDTH_BREAKPOINT_WIDE = 'cds-aichat--wide-width';

export interface ShellOptions {
  hostElement?: Element;
  hosts: ExtensionHosts;
  writeableElementsPresentKeys?: string;
}
export type ShellInputConfig = Omit<
  NonNullable<ShellLayoutInputs['input']>,
  'inputProps' | 'contentOwner'
>;
export interface ShellContentState {
  nativePanelsReady: boolean;
  inputs: PanelViewInputs;
  callbacks: PanelCompositionCallbacks;
  requestFocus: () => void;
  requestInputFocus: () => void;
  showConfirmEndChat: () => void;
}

export function selectShellState(state: AppState) {
  const agent = selectHumanAgentDisplayState(state);
  return {
    theme: state.config.derived.themeWithDefaults,
    layout: state.config.derived.layout,
    launcher: state.config.derived.launcher,
    cssVariableOverrides: state.config.derived.cssVariableOverrides,
    header: state.config.derived.header,
    messageFocusToggleShortcut:
      state.config.derived.keyboardShortcuts.messageFocusToggle,
    publicConfig: state.config.public,
    languagePack: state.languagePack,
    isHydrated: state.isHydrated,
    mainWindow: state.persistedToBrowserStorage.viewState.mainWindow,
    launcherVisible: state.persistedToBrowserStorage.viewState.launcher,
    disclaimersAccepted: state.persistedToBrowserStorage.disclaimersAccepted,
    homeScreenOpen:
      state.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen,
    hasSentNonWelcomeMessage:
      state.persistedToBrowserStorage.hasSentNonWelcomeMessage,
    catastrophicErrorType: state.catastrophicErrorType,
    catastrophicErrorPanelState: state.catastrophicErrorPanelState,
    workspacePanelState: state.workspacePanelState,
    historyPanelState: state.historyPanelState,
    customPanelState: state.customPanelState,
    responsePanelState: state.responsePanelState,
    responseHasMessage: Boolean(
      state.allMessagesByID[
        state.responsePanelState.localMessageItem?.fullMessageID
      ]
    ),
    iFramePanelState: state.iFramePanelState,
    viewSourcePanelState: state.viewSourcePanelState,
    showScreenShareRequest: state.humanAgentState.showScreenShareRequest,
    fileUploadInProgress: state.humanAgentState.fileUploadInProgress,
    agentConnected: agent.isConnectingOrConnected,
    agentDisablesInput: agent.disableInput,
    inputPlaceholderKey: agent.inputPlaceholderKey,
    isInputReadonly: selectInputIsReadonly(state),
    isInputDisabled: selectInputIsDisabled(state),
    isInputFieldVisible: selectInputFieldVisible(state),
    customInputVisible: selectCustomPromptLineVisible(state),
    isStopStreamingButtonVisible: selectStopStreamingButtonVisible(state),
    chatWidthBreakpoint: state.chatWidthBreakpoint,
    ...selectInputUploadAndStreamingFields(state),
  };
}

export class ShellLifecycle {
  private connected = false;
  private registered = false;
  private generation = 0;
  private targets?: ShellLayoutTargets;
  private releases: (() => void)[] = [];
  private releaseResize?: () => void;
  private releaseMobile?: () => void;
  private releaseKeyboard?: () => void;
  private mobileEnabled?: boolean;
  private styleInputs?: unknown[];
  private announcementInputs?: unknown[];
  private hadComposerFocus = false;
  private focusFrame?: number;
  private presence = new Map<WriteableElementName, boolean>();
  private restoreDraft = false;
  private warnedCustomHeader = false;
  private inputHandle?: InputFunctions;
  private previousInputProps?: InputProps;
  private pendingUploads?: AppState['assistantInputState']['pendingUploads'];
  private displayUploads?: FileUpload[];
  private errorInputs?: unknown[];
  private uploadErrors?: InputProps['uploadErrors'];
  private previousContent?: ShellContentState;
  private panelsReady = false;
  private previousPanelInputs?: PanelViewInputs;
  private options?: ShellOptions;
  private inputConfig?: ShellInputConfig;
  private readonly initialContentRevision = {};
  private contentRevision: object = this.initialContentRevision;
  readonly inputCallbacks: InputCallbacks;
  readonly humanAgentCallbacks: HumanAgentCallbacks;
  private readonly uploads: ReturnType<typeof createAssistantUploadCallbacks>;
  private readonly window: WindowOpenState;
  readonly panelCallbacks: PanelCompositionCallbacks;
  readonly mainWindow: MainWindowFunctions;
  private readonly appWindow: { requestFocus: () => void };

  constructor(
    readonly viewState: ChatViewState,
    private invalidate: () => void,
    private getMessages: () => MessagesComponentClass | null,
    private whenReady: () => Promise<boolean>,
    private onContent: (content: ShellContentState) => void,
    private onPanelsReady: () => void,
    private transformIcon: ShellLayoutInputs['header']['transformIcon'],
    private isReady: () => boolean
  ) {
    const manager = viewState.serviceManager;
    this.inputCallbacks = new InputCallbacks(manager, () =>
      this.getMessages()?.doAutoScroll()
    );
    this.humanAgentCallbacks = new HumanAgentCallbacks(viewState);
    this.uploads = createAssistantUploadCallbacks(manager);
    this.window = new WindowOpenState(
      this.windowOptions(),
      () => this.targets?.widget ?? null
    );
    this.mainWindow = {
      requestFocus: this.requestFocus,
      doAutoScroll: (options) => this.getMessages()?.doAutoScroll(options),
      doScrollToMessage: (id, animate = true) =>
        this.getMessages()?.doScrollToMessage(id, animate),
      getMessagesScrollBottom: () =>
        this.getMessages()?.getContainerScrollBottom() ?? 0,
    };
    this.appWindow = {
      requestFocus: () => {
        try {
          if (
            manager.store.getState().persistedToBrowserStorage.viewState
              .mainWindow
          ) {
            this.mainWindow.requestFocus();
          }
        } catch (error) {
          consoleError('An error occurred in App.requestFocus', error);
        }
      },
    };
    this.panelCallbacks = {
      ...createPanelCallbacks(this.requestFocus),
      onClose: this.inputCallbacks.onClose,
      onRestart: this.inputCallbacks.onRestart,
      onToggleHomeScreen: this.inputCallbacks.onToggleHomeScreen,
      onAcceptDisclaimer: this.inputCallbacks.onAcceptDisclaimer,
      confirmHumanAgentEndChat:
        this.humanAgentCallbacks.confirmHumanAgentEndChat,
      hideConfirmEndChat: this.humanAgentCallbacks.hideConfirmEndChat,
      fireCustomPanelEvent: (type) => {
        manager.eventBus.fire({ type }, manager.instance);
      },
      resetCustomPanelOptions: () => {
        manager.store.dispatch(
          actions.setCustomPanelConfigOptions(
            DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS
          )
        );
      },
      closeCustomPanel: () => {
        manager.store.dispatch(actions.setCustomPanelOpen(false));
      },
      closeResponsePanel: () => {
        manager.store.dispatch(actions.setResponsePanelIsOpen(false));
      },
      clearResponsePanelContent: () => {
        manager.store.dispatch(actions.setResponsePanelContent(null, false));
      },
      closeIFramePanel: () => {
        manager.store.dispatch(actions.closeIFramePanel());
      },
      closeViewSourcePanel: () => {
        manager.store.dispatch(actions.setViewSourcePanelIsOpen(false));
      },
      closeHistoryPanel: () => {
        manager.store.dispatch(actions.setHistoryPanelOpen(false));
      },
      updateScreenShareRequest: (state) => {
        manager.humanAgentService?.screenShareUpdateRequestState(state);
      },
      announce: (text) => viewState.announcer.announce(text),
    };
  }

  configure(
    options: ShellOptions,
    inputConfig: ShellInputConfig,
    contentRevision?: object,
    transformIcon?: ShellLayoutInputs['header']['transformIcon']
  ) {
    this.options = options;
    this.transformIcon = transformIcon;
    this.inputConfig = inputConfig;
    this.contentRevision = contentRevision ?? this.initialContentRevision;
  }

  publishHandles() {
    const manager = this.viewState.serviceManager;
    manager.mainWindow = this.mainWindow;
    manager.appWindow = this.appWindow;
    manager.ariaAnnouncer = this.viewState.announcer.announce;
    announcerOwners.set(manager, this);
    this.registered = true;
  }

  connect() {
    if (this.connected) {
      return;
    }
    this.connected = true;
    this.publishHandles();
    const manager = this.viewState.serviceManager;
    this.releases.push(this.window.subscribe(this.invalidate));
    this.window.connect();
    const trackFocus = () => {
      this.hadComposerFocus = composerHasFocus(manager);
    };
    document.addEventListener('focusin', trackFocus, true);
    this.releases.push(() =>
      document.removeEventListener('focusin', trackFocus, true)
    );
    for (const name of [
      WriteableElementName.CUSTOM_HEADER,
      WriteableElementName.CUSTOM_PROMPT_LINE,
    ]) {
      this.releases.push(
        observeWriteableElementPresence(
          manager.writeableElements[name],
          (present) => {
            const previous = this.presence.get(name);
            this.presence.set(name, present);
            if (name === WriteableElementName.CUSTOM_PROMPT_LINE && present) {
              this.restoreDraft = true;
            }
            if (previous !== present) {
              this.invalidate();
              if (
                name === WriteableElementName.CUSTOM_PROMPT_LINE &&
                this.hadComposerFocus
              ) {
                if (this.focusFrame !== undefined) {
                  cancelAnimationFrame(this.focusFrame);
                }
                this.focusFrame = requestAnimationFrame(() => {
                  this.focusFrame = undefined;
                  if (this.connected) {
                    requestComposerFocus(manager);
                  }
                });
              }
            }
          }
        )
      );
    }
  }

  update() {
    if (this.connected) {
      this.window.update(this.windowOptions());
    }
  }

  private windowOptions() {
    const state = this.viewState.serviceManager.store.getState();
    return {
      viewStateMainWindow: state.persistedToBrowserStorage.viewState.mainWindow,
      isHydrated: state.isHydrated,
      useCustomHostElement: Boolean(this.options?.hostElement),
      requestFocus: this.requestReadyFocus,
    };
  }

  readonly requestReadyFocus = () => {
    if (this.isReady()) {
      this.requestFocus();
      return;
    }
    const generation = this.generation;
    void this.whenReady().then((ready) => {
      if (ready && this.connected && generation === this.generation) {
        this.requestFocus();
      }
    });
  };
  readonly requestFocus = () => {
    const state = this.viewState.serviceManager.store.getState();
    const derived = this.derived(state);
    const panels = this.targets?.panels;
    const handle = (
      name: Parameters<NonNullable<typeof panels>['requestPanelFocus']>[0]
    ) => ({ requestFocus: () => panels?.requestPanelFocus(name) ?? false });
    focusTargets({
      shouldAutoFocus:
        state.config.public.shouldTakeFocusIfOpensAutomatically ?? true,
      showDisclaimer: derived.showDisclaimer,
      iFramePanelIsOpen: state.iFramePanelState.isOpen,
      viewSourcePanelIsOpen: state.viewSourcePanelState.isOpen,
      customPanelIsOpen: state.customPanelState.isOpen,
      responsePanelIsOpen: state.responsePanelState.isOpen,
      disclaimer: panels?.disclaimerButton() ?? null,
      iframePanel: handle('iframe'),
      viewSourcePanel: handle('citation'),
      customPanel: handle('custom'),
      responsePanel:
        state.responsePanelState.localMessageItem &&
        state.allMessagesByID[
          state.responsePanelState.localMessageItem.fullMessageID
        ]
          ? handle('response')
          : null,
      input: {
        requestFocus: () => requestComposerFocus(this.viewState.serviceManager),
      },
    });
  };
  readonly requestInputFocus = () => {
    const manager = this.viewState.serviceManager;
    focusInput(
      selectHumanAgentDisplayState(manager.store.getState()),
      () => this.getMessages()?.requestHumanAgentBannerFocus(),
      () => requestComposerFocus(manager)
    );
  };
  private readonly sendFromInput = (
    text: string,
    displayContent?: JSONContent
  ) =>
    this.inputCallbacks.onSendInput(
      text,
      this.derived(this.viewState.serviceManager.store.getState())
        .showHomeScreen
        ? MessageSendSource.HOME_SCREEN_INPUT
        : MessageSendSource.MESSAGE_INPUT,
      undefined,
      displayContent
    );
  private readonly filesForAgent = (uploads: FileUpload[]) => {
    const state = this.viewState.serviceManager.store.getState();
    this.humanAgentCallbacks.onFilesSelectedForUpload(
      uploads,
      selectHumanAgentDisplayState(state).isConnectingOrConnected,
      selectInputUploadAndStreamingFields(state).allowMultipleFileUploads,
      this.requestInputFocus
    );
  };
  setInputHandle(handle: InputFunctions | null) {
    const manager = this.viewState.serviceManager;
    if (handle || manager.inputComponent === this.inputHandle) {
      manager.inputComponent = handle;
    }
    this.inputHandle = handle;
  }
  private derived(state: AppState) {
    return getDerivedState(
      {
        publicConfig: state.config.public,
        persistedToBrowserStorage: state.persistedToBrowserStorage,
        isHydratingCounter:
          this.viewState.serviceManager.instance.state.get().isHydratingCounter,
        catastrophicErrorType: state.catastrophicErrorType,
        viewStateMainWindow:
          state.persistedToBrowserStorage.viewState.mainWindow,
      },
      isBrowser() ? window.location.hostname : 'localhost'
    );
  }
  createLayout(): ShellLayoutInputs | undefined {
    if (!this.options || !this.inputConfig) {
      return undefined;
    }
    const serviceManager = this.viewState.serviceManager;
    const state = serviceManager.store.getState();
    const { hosts, hostElement, writeableElementsPresentKeys } = this.options;
    const {
      languagePack,
      workspacePanelState,
      historyPanelState,
      customPanelState,
      responsePanelState,
      iFramePanelState,
      viewSourcePanelState,
      catastrophicErrorPanelState,
      chatWidthBreakpoint,
      isHydrated,
    } = state;
    const {
      themeWithDefaults: theme,
      layout,
      launcher,
      header,
    } = state.config.derived;
    const publicConfig = state.config.public;
    const intl = this.viewState.getSnapshot().intl;
    const namespaceName = serviceManager.namespace.originalName;
    const regionLabel = intl.formatMessage(
      {
        id: namespaceName
          ? 'window_ariaChatRegionNamespace'
          : 'window_ariaChatRegion',
      },
      { namespace: namespaceName }
    );
    const dir = isBrowser() ? document.dir || 'auto' : 'auto';
    const useCustomHostElement = Boolean(hostElement);
    const { open, closing } = this.window.getSnapshot();
    const inputFields = selectInputUploadAndStreamingFields(state);
    const agentDisplayState = selectHumanAgentDisplayState(state);
    const isInputReadonly = selectInputIsReadonly(state);
    const isInputFieldVisible = selectInputFieldVisible(state);
    const isStopStreamingButtonVisible =
      selectStopStreamingButtonVisible(state);
    const {
      showDisclaimer,
      showHomeScreen,
      shouldShowHydrationPanel,
      isHydratingComplete,
    } = this.derived(state);
    const showLauncher =
      launcher.isOn && state.persistedToBrowserStorage.viewState.launcher;
    const inputIsVisible = selectCustomPromptLineVisible(state);
    const customPromptLinePresent =
      this.presence.get(WriteableElementName.CUSTOM_PROMPT_LINE) ??
      hasMeaningfulContent(
        serviceManager.writeableElements[
          WriteableElementName.CUSTOM_PROMPT_LINE
        ]
      );
    const customHeaderPresent =
      this.presence.get(WriteableElementName.CUSTOM_HEADER) ??
      hasMeaningfulContent(
        serviceManager.writeableElements[WriteableElementName.CUSTOM_HEADER]
      );
    if (customPromptLinePresent) {
      this.restoreDraft = true;
    }
    const restoreDraft = { current: this.restoreDraft };
    const {
      onSendInput,
      onStopStreaming,
      onRestart,
      onClose,
      onToggleHomeScreen,
    } = this.inputCallbacks;
    const requestInputFocus = this.requestInputFocus;
    const onSendInputFromInput = this.sendFromInput;
    const onUserTyping = this.humanAgentCallbacks.onUserTyping;
    const onFilesSelectedForUpload = this.filesForAgent;
    const { onAssistantFilesSelectedForUpload, onRemoveAssistantUpload } =
      this.uploads;
    const uploadConfig = publicConfig.upload;
    const isAssistantUploadEnabled =
      uploadConfig?.isOn === true &&
      Boolean(uploadConfig.onFileUpload) &&
      !agentDisplayState.isConnectingOrConnected;
    if (this.pendingUploads !== inputFields.pendingUploads) {
      this.pendingUploads = inputFields.pendingUploads;
      this.displayUploads = inputFields.pendingUploads.map(
        (u: PendingUpload) => ({
          id: u.id,
          file: u.file,
          status:
            u.status === 'uploading'
              ? FileStatusValue.UPLOADING
              : FileStatusValue.EDIT,
          isError: u.status === 'error',
          errorMessage: u.errorMessage,
        })
      );
    }
    const assistantPendingUploadsForDisplay = this.displayUploads;
    const assistantUploadButtonDisabled =
      isAssistantUploadEnabled &&
      uploadConfig?.maxFiles !== undefined &&
      inputFields.pendingUploads.length >= uploadConfig.maxFiles;
    const humanAgentUploadButtonDisabled =
      isUploadButtonDisabled(
        inputFields.files?.length ?? 0,
        state.humanAgentState.fileUploadInProgress,
        inputFields.allowMultipleFileUploads
      ) ||
      (inputFields.maxFiles !== undefined &&
        inputFields.files.length >= inputFields.maxFiles);
    const errorInputs = [
      inputFields.files,
      inputFields.pendingUploads,
      intl,
      languagePack.fileSharing_uploadErrorRecovery,
    ];
    if (!this.errorInputs || !shallowEqual(errorInputs, this.errorInputs)) {
      this.errorInputs = errorInputs;
      const errors: NonNullable<InputProps['uploadErrors']> = [];
      for (const upload of inputFields.files) {
        if (upload.isError) {
          const filename = upload.file?.name ?? '';
          errors.push({
            id: upload.id,
            filename,
            title: intl.formatMessage(
              { id: 'fileSharing_uploadErrorTitleWithName' },
              { filename }
            ),
            description: [
              upload.errorMessage,
              languagePack.fileSharing_uploadErrorRecovery,
            ]
              .filter(Boolean)
              .join(' '),
          });
        }
      }
      for (const upload of inputFields.pendingUploads) {
        if (upload.status === 'error') {
          const filename = upload.file?.name ?? '';
          errors.push({
            id: upload.id,
            filename,
            title: intl.formatMessage(
              { id: 'fileSharing_uploadErrorTitleWithName' },
              { filename }
            ),
            description: [
              upload.errorMessage,
              languagePack.fileSharing_uploadErrorRecovery,
            ]
              .filter(Boolean)
              .join(' '),
          });
        }
      }
      errors.sort((a, b) =>
        a.filename.localeCompare(b.filename, undefined, { sensitivity: 'base' })
      );
      this.uploadErrors = errors.length ? errors : undefined;
    }
    const inputUploadErrors = this.uploadErrors;
    const inputError = publicConfig.input?.error;
    const inputDisabled = shouldDisableInput(
      isInputReadonly,
      selectInputIsDisabled(state),
      agentDisplayState.disableInput
    );
    const headerConfigOverride =
      publicConfig.history?.isOn &&
      historyPanelState.isMobile &&
      (publicConfig.history?.showMobileMenu ?? true) &&
      !customHeaderPresent
        ? {
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
                  serviceManager.store.dispatch(
                    actions.setHistoryPanelOpen(true)
                  );
                },
              },
              ...(header?.menuOptions || []),
            ],
          }
        : undefined;
    const view = this.viewState.getSnapshot();
    const nextInputs: PanelViewInputs = {
      endChatConfirmation: view.humanAgentConfirmation,
      showEndChatConfirmation: view.endChatConfirmationOpen,
      showScreenShareRequest: state.humanAgentState.showScreenShareRequest,
      isHydratingComplete,
      shouldShowHydrationPanel,
      isHomeScreenActive: showHomeScreen,
      customPanelState,
      historyPanelState,
      showDisclaimer,
      responsePanelState,
      responseHasMessage: Boolean(
        state.allMessagesByID[
          responsePanelState.localMessageItem?.fullMessageID
        ]
      ),
      iFramePanelState,
      viewSourcePanelState,
      isInputReadonly,
      catastrophicErrorPanelState,
      contentRevision: this.contentRevision,
    };
    const inputs =
      this.previousPanelInputs &&
      shallowEqual(this.previousPanelInputs, nextInputs)
        ? this.previousPanelInputs
        : nextInputs;
    this.previousPanelInputs = inputs;
    const panels: ShellLayoutInputs['panels'] = {
      inputs,
      callbacks: this.panelCallbacks,
      hosts,
      transformHeaderIcon: this.transformIcon,
      onTargetsReady: this.onPanelsReady,
    };
    const content = {
      nativePanelsReady: this.panelsReady,
      inputs,
      callbacks: this.panelCallbacks,
      requestFocus: this.requestFocus,
      requestInputFocus: this.requestInputFocus,
      showConfirmEndChat: this.humanAgentCallbacks.showConfirmEndChat,
    };
    if (!this.previousContent || !shallowEqual(this.previousContent, content)) {
      this.previousContent = content;
      this.onContent(content);
    }
    const inputSnapshot: InputProps = {
      restoreDraft: restoreDraft.current,
      disableInput: inputDisabled,
      disableSend: shouldDisableSend(inputDisabled, isHydrated),
      isInputVisible: isInputFieldVisible,
      onSendInput: onSendInputFromInput,
      onStopStreaming,
      onUserTyping,
      showUploadButton:
        inputFields.allowFileUploads || isAssistantUploadEnabled,
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
    if (
      !this.previousInputProps ||
      !shallowEqual(this.previousInputProps, inputSnapshot)
    ) {
      this.previousInputProps = inputSnapshot;
    }
    const inputProps = this.previousInputProps;
    const inputConfig = this.inputConfig;
    const shellLayout: ShellLayoutInputs = {
      container: {
        className: cx(
          'cds-aichat--container--render',
          getThemeClassNames(theme),
          {
            'cds-aichat--container-disable-mobile-enhancements':
              hostElement &&
              publicConfig.disableCustomElementMobileEnhancements,
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
          'cds-aichat-float--opening':
            !useCustomHostElement && !closing && open,
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
      panels,
      header:
        !customHeaderPresent && (header?.isOn || headerConfigOverride?.isOn)
          ? {
              onClose,
              onRestart,
              onToggleHomeScreen,
              isHomeScreenActive: showHomeScreen,
              headerConfigOverride,
              transformIcon: this.transformIcon,
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
    return shellLayout;
  }

  markPanelsReady() {
    if (!this.panelsReady) {
      this.panelsReady = true;
      this.invalidate();
    }
  }

  attach(targets: ShellLayoutTargets) {
    const changed =
      this.targets?.container !== targets.container ||
      this.targets?.widget !== targets.widget;
    this.targets = targets;
    if (!this.connected) {
      return;
    }
    if (changed) {
      this.releaseResize?.();
      this.releaseResize = observeResize(targets.widget, () => {
        if (!this.connected || this.targets?.widget !== targets.widget) {
          return;
        }
        const manager = this.viewState.serviceManager;
        const width = targets.widget.offsetWidth;
        manager.store.dispatch(actions.setAppStateValue('chatWidth', width));
        manager.store.dispatch(
          actions.setAppStateValue('chatHeight', targets.widget.offsetHeight)
        );
        manager.store.dispatch(
          actions.setAppStateValue(
            'chatWidthBreakpoint',
            calculateChatWidthBreakpoint(width)
          )
        );
        updateHistoryMobileDetection(
          {
            container: targets.widget,
            useCustomHostElement: Boolean(this.options?.hostElement),
            serviceManager: manager,
          },
          width
        );
      });
      let id = targets.widget.getAttribute(SCROLLBAR_WIDTH_ATTR);
      if (!id) {
        id = `widget-${++scrollbarWidthCounter}`;
        targets.widget.setAttribute(SCROLLBAR_WIDTH_ATTR, id);
      }
      const root = targets.widget.getRootNode();
      if (root instanceof Document || root instanceof ShadowRoot) {
        adoptOnRoot(root);
      }
      setVarsForSelector(`[${SCROLLBAR_WIDTH_ATTR}="${id}"]`, {
        '--cds-aichat-scrollbar-width': `${SCROLLBAR_WIDTH()}px`,
      });
    }
    this.updateDOM(changed);
  }

  private updateDOM(changed: boolean) {
    const state = this.viewState.serviceManager.store.getState();
    const container = this.targets?.container;
    if (!container || !this.options) {
      return;
    }
    const config = state.config.public;
    const enabled = IS_PHONE && !config.disableCustomElementMobileEnhancements;
    if (changed || this.mobileEnabled !== enabled) {
      this.releaseMobile?.();
      this.mobileEnabled = enabled;
      this.releaseMobile = connectMobileViewportLayout(enabled, container, 4);
    }
    const styleInputs = [
      container,
      this.options.hostElement,
      state.config.derived.cssVariableOverrides,
    ];
    if (!this.styleInputs || !shallowEqual(this.styleInputs, styleInputs)) {
      this.styleInputs = styleInputs;
      injectStyles({
        container,
        hostElement: this.options.hostElement,
        cssVariableOverrideString: convertCSSVariablesToString(
          state.config.derived.cssVariableOverrides
        ),
        appStyles: styles,
        applicationStylesheet,
        cssVariableOverrideStylesheet,
      });
    }
    const active = state.persistedToBrowserStorage.viewState.mainWindow;
    if (!active || changed) {
      this.releaseKeyboard?.();
      this.releaseKeyboard = undefined;
    }
    if (active && !this.releaseKeyboard) {
      container.addEventListener('keydown', this.handleKeyDown);
      this.releaseKeyboard = () =>
        container.removeEventListener('keydown', this.handleKeyDown);
    }
    const { showHomeScreen } = this.derived(state);
    const announcementInputs = [
      showHomeScreen,
      state.isHydrated,
      state.languagePack,
      state.persistedToBrowserStorage.hasSentNonWelcomeMessage,
    ];
    if (
      !this.announcementInputs ||
      !shallowEqual(this.announcementInputs, announcementInputs)
    ) {
      this.announcementInputs = announcementInputs;
      if (state.isHydrated) {
        if (showHomeScreen) {
          this.viewState.announcer.announce(
            state.languagePack.homeScreen_shown
          );
        } else if (state.persistedToBrowserStorage.hasSentNonWelcomeMessage) {
          this.viewState.announcer.announce(
            state.languagePack.homeScreen_hidden
          );
        }
      }
    }
    if (
      this.presence.get(WriteableElementName.CUSTOM_HEADER) &&
      config.history?.isOn &&
      state.historyPanelState.isMobile &&
      !this.warnedCustomHeader &&
      isEnableDebugLog()
    ) {
      this.warnedCustomHeader = true;
      consoleWarn(
        'CUSTOM_HEADER is present while the history panel is in its mobile layout. The built-in mobile history menu no longer renders; supply your own controls. See docs/CustomHistory.md.'
      );
    }
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    const manager = this.viewState.serviceManager;
    const shortcut =
      manager.store.getState().config.derived.keyboardShortcuts
        .messageFocusToggle;
    if (shortcut.isOn && matchesShortcut(event, shortcut)) {
      let focused = false;
      if (composerHasFocus(manager)) {
        const messages = this.getMessages();
        if (messages) {
          messages.requestFocusOnFirstItemOfLastMessage();
          focused = true;
        }
      } else {
        focused = requestComposerFocus(manager);
      }
      if (focused) {
        event.preventDefault();
        event.stopPropagation();
      }
    } else if (event.key === 'Escape') {
      const active = getDeepActiveElement();
      const container = this.targets?.container;
      if (composerHasFocus(manager)) {
        requestComposerFocus(manager);
      } else if (
        active &&
        (container
          ?.querySelector('.cds-aichat--messages__wrapper')
          ?.contains(active) ||
          container?.querySelector('.cds-aichat--messages')?.contains(active))
      ) {
        if (requestComposerFocus(manager)) {
          event.preventDefault();
        }
      }
    }
  };

  disconnect() {
    if (!this.connected && !this.registered) {
      return;
    }
    this.connected = false;
    this.registered = false;
    this.generation += 1;
    this.window.disconnect();
    this.inputCallbacks.disconnect();
    this.releases
      .splice(0)
      .reverse()
      .forEach((release) => release());
    this.releaseResize?.();
    this.releaseResize = undefined;
    this.releaseMobile?.();
    this.releaseMobile = undefined;
    this.releaseKeyboard?.();
    this.releaseKeyboard = undefined;
    if (this.focusFrame !== undefined) {
      cancelAnimationFrame(this.focusFrame);
    }
    this.focusFrame = undefined;
    this.styleInputs = undefined;
    this.mobileEnabled = undefined;
    const manager = this.viewState.serviceManager;
    if (manager.mainWindow === this.mainWindow) {
      manager.mainWindow = undefined;
    }
    if (manager.appWindow === this.appWindow) {
      manager.appWindow = undefined;
    }
    if (announcerOwners.get(manager) === this) {
      announcerOwners.delete(manager);
      if (manager.ariaAnnouncer === this.viewState.announcer.announce) {
        manager.ariaAnnouncer = undefined;
      }
    }
    this.setInputHandle(null);
    this.targets = undefined;
  }
}
