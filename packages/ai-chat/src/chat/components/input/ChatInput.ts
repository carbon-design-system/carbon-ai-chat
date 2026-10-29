/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import { ref } from 'lit/directives/ref.js';
import { repeat } from 'lit/directives/repeat.js';
import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import '@carbon/ai-chat-components/es/components/prompt-line/src/prompt-line.js';
import '@carbon/ai-chat-components/es/components/prompt-line/src/prompt-line-shell.js';
import '@carbon/ai-chat-components/es/components/prompt-line/src/send-control.js';
import '@carbon/ai-chat-components/es/components/prompt-line/src/error-message.js';
import '@carbon/ai-chat-components/es/components/file-uploads/index.js';
import '@carbon/web-components/es/components/icon-button/icon-button.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import type { CarbonIcon } from '@carbon/web-components/es/globals/internal/icon-loader-utils.js';
import Add16 from '@carbon/icons/es/add--large/16.js';
import Attachment16 from '@carbon/icons/es/attachment/16.js';
import type { Extension, JSONContent } from '@tiptap/core';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import {
  FileStatusValue,
  type FileUpload,
} from '@carbon/ai-chat-components/es/components/prompt-line/src/types.js';
import type {
  AutocompleteConfig,
  StartersConfig,
  TriggerSuggestionConfig,
} from '@carbon/ai-chat-components/es/components/prompt-line/src/tiptap/types.js';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import { NativeChatView } from '../shared/NativeChatView';
import './NativeAutocomplete';
import './native/InputActions';
import './native/PromptLineSlot';
import type { InputFunctions, InputProps } from '../../utils/inputTypes';
import type { AutocompleteContent } from '../../services/autocompleteContent';
import type { ChatViewState } from '../../services/chatViewState';
import type { ToolbarAction } from '../../../types/config/HeaderConfig';
import type { IntlShape } from '../../utils/i18n';
import type { LanguagePack } from '../../../types/config/LanguagePack';
import { ChatWidthBreakpoint } from '../../../types/state/AppState';
import { WriteableElementName } from '../../../types/instance/WriteableElements';
import { PageObjectId } from '../../../testing/PageObjectId';
import { shallowEqual } from '../../store/appStore';
import actions from '../../store/actions';
import {
  selectInputState,
  selectIsInputToHumanAgent,
  selectLanguagePack,
} from '../../store/selectors';
import {
  InputExtensions,
  buildInputExtensions,
} from '../../services/inputExtensions';
import { resolvePromptLineMode } from './promptLineMode';
import {
  createInputImperativeHandle,
  registerInputImperativeHandle,
} from '../../utils/inputImperativeHandle';
import {
  changeInputValue,
  mirrorInputValue,
  sendInputValue,
} from '../../utils/inputValueSync';
import { hasInFlightUpload, hasSendableInput } from '../../utils/sendableInput';
import { restoreInputDraft } from '../../utils/restoreInputDraft';
import { validateFileSelection } from '../../utils/fileUploadValidation';
import { formatShortcutForDisplay } from '../../utils/keyboardUtils';
import { consoleError } from '../../utils/miscUtils';

const EMPTY_UPLOADS: FileUpload[] = [];
const descriptorIcon = (icon: ToolbarAction['icon']) => icon as CarbonIcon;

@carbonElement('cds-aichat-chat-input')
class ChatInput extends NativeChatView {
  @property({ attribute: false }) inputProps: InputProps;
  @property({ attribute: false }) mention?: TriggerSuggestionConfig;
  @property({ attribute: false }) command?: TriggerSuggestionConfig;
  @property({ attribute: false }) autocomplete?: AutocompleteConfig;
  @property({ attribute: false }) starters?: StartersConfig;
  @property({ attribute: false }) inputActions?: ToolbarAction[];
  @property({ attribute: false }) contentOwner?: AutocompleteContent;

  inputFunctions?: InputFunctions;
  private active = false;
  private disconnecting = false;
  private renderedLifetime = -1;
  private renderedSurface = -1;
  private lifetime = 0;
  private bindingGeneration = 0;
  private lifetimeOwner?: ChatViewState;
  private renderedDisableSend = false;
  private renderedUploads?: FileUpload[];
  private surfaceGeneration = 0;
  private surfaceVisible = false;
  private intl: IntlShape;
  private languagePack: LanguagePack;
  private wide = false;
  private expanded = false;
  private configDisableSend = false;
  private configRich = false;
  private hostExtensions?: Extension[];
  private richLatched = false;
  private extensionOwner = new InputExtensions();
  private extensionEnabled?: boolean;
  private extensionInputs: unknown[] = [];
  private actionInputs: unknown[] = [];
  private actionsEndSlot?: Element;
  private readonly captureActionsEnd = (element?: Element) => {
    this.actionsEndSlot = element;
  };
  private effectiveActions?: ToolbarAction[];
  private extensions: Extension[] = [];
  private rawValue = '';
  private valueInitialized = false;
  private displayContent: JSONContent | null = null;
  private mirroredSlice = false;
  private trackedSlice?: boolean;
  private hasAnnouncedShortcut = false;
  private stopPending = false;
  private listNavigated = false;
  private releaseHandle?: () => void;
  private restored?: { prompt: PromptLineElement; agent: boolean };
  private restoring?: {
    prompt: PromptLineElement;
    agent: boolean;
    promise: Promise<void>;
  };
  private draftGeneration = 0;
  private errorPresent = false;
  private errorReady = false;
  private errorAnnounced = false;
  private errorGeneration = 0;
  private announcementTimer?: ReturnType<typeof setTimeout>;

  private get hasCurrentSurface(): boolean {
    return (
      this.active &&
      this.inputProps?.isInputVisible &&
      this.renderedLifetime === this.lifetime &&
      this.renderedSurface === this.surfaceGeneration
    );
  }

  private get prompt(): PromptLineElement | null {
    return this.hasCurrentSurface
      ? this.querySelector('cds-aichat-prompt-line')
      : null;
  }

  get ready(): Promise<void> {
    return this.updateComplete.then(async () => {
      await this.prompt?.updateComplete;
      await this.restoring?.promise;
    });
  }

  connectedCallback() {
    this.style.display = 'block';
    this.slot = 'input';
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.disconnecting = true;
    try {
      super.disconnectedCallback();
    } finally {
      this.disconnecting = false;
    }
  }

  protected onViewConnected(viewState: ChatViewState) {
    this.bindingGeneration += 1;
    if (this.lifetimeOwner && this.lifetimeOwner !== viewState) {
      this.retire();
    }
    this.active = true;
    if (!this.lifetimeOwner) {
      this.lifetimeOwner = viewState;
      const lifetime = ++this.lifetime;
      this.rawValue = '';
      this.valueInitialized = false;
      this.inputFunctions = createInputImperativeHandle(
        () => (this.active && lifetime === this.lifetime ? this.prompt : null),
        () => {
          if (this.active && lifetime === this.lifetime) {
            this.latchRich();
          }
        }
      );
      this.dispatchEvent(
        new CustomEvent<InputFunctions | null>(
          'cds-aichat-input-handle-change',
          { detail: this.inputFunctions }
        )
      );
    }
    this.selectView(
      (snapshot) => snapshot.intl,
      (intl) => {
        this.intl = intl;
      }
    );
    this.selectStore(selectLanguagePack, (pack) => {
      this.languagePack = pack;
    });
    this.selectStore(
      (next) => next.chatWidthBreakpoint === ChatWidthBreakpoint.WIDE,
      (wide) => {
        this.wide = wide;
      }
    );
    this.selectStore(
      (next) => ({
        rich: resolvePromptLineMode(next.config.public.input) === 'rich',
        disabled: Boolean(next.config.public.input?.isSendDisabled),
        expanded: Boolean(next.config.public.input?.expanded),
        extensions: next.config.public.input?.tiptap?.extensions,
      }),
      (config) => {
        this.configRich = config.rich;
        this.configDisableSend = config.disabled;
        this.expanded = config.expanded;
        this.hostExtensions = config.extensions;
      },
      shallowEqual
    );
    const bindingGeneration = this.bindingGeneration;
    const report = this.captureErrorReporter();
    this.own(
      viewState.serviceManager.store.subscribe(() => {
        if (!this.active || bindingGeneration !== this.bindingGeneration) {
          return;
        }
        try {
          this.mirrorValue();
        } catch (error) {
          report(error);
        }
      })
    );
    this.own(() => {
      this.active = false;
      this.extensionOwner.disconnect();
      this.extensionEnabled = undefined;
      const generation = ++this.bindingGeneration;
      if (!this.disconnecting) {
        this.retire();
      } else {
        queueMicrotask(() => {
          if (generation === this.bindingGeneration) {
            this.retire();
          }
        });
      }
    });
  }

  private retire() {
    const manager = this.lifetimeOwner?.serviceManager;
    this.lifetimeOwner = undefined;
    this.lifetime += 1;
    this.draftGeneration += 1;
    this.releaseHandle?.();
    this.releaseHandle = undefined;
    if (this.inputFunctions) {
      this.inputFunctions = undefined;
      this.dispatchEvent(
        new CustomEvent<InputFunctions | null>(
          'cds-aichat-input-handle-change',
          { detail: null }
        )
      );
    }
    if (this.trackedSlice !== undefined) {
      manager?.store.dispatch(
        actions.updateInputState({ focused: false }, this.trackedSlice)
      );
    }
    this.trackedSlice = undefined;
    this.restored = undefined;
    this.restoring = undefined;
    this.rawValue = '';
    this.valueInitialized = false;
    this.displayContent = null;
    this.richLatched = false;
    this.hasAnnouncedShortcut = false;
    this.stopPending = false;
    this.listNavigated = false;
    this.resetError();
  }

  private readonly latchRich = () => {
    if (!this.richLatched) {
      this.richLatched = true;
      this.requestUpdate();
    }
  };

  protected willUpdate() {
    if (!this.active || !this.inputProps) {
      return;
    }
    this.prepareValue();
    // A same-parent move can place this owned node outside Lit's conditional part.
    if (
      !this.expanded &&
      this.actionsEndSlot?.parentElement ===
        this.querySelector('cds-aichat-prompt-line-shell')
    ) {
      this.actionsEndSlot.remove();
    }
    this.richLatched ||= this.configRich;
    const enabled = this.richLatched;
    if (this.extensionEnabled !== enabled) {
      this.extensionOwner.connect(enabled, () => this.requestUpdate());
      this.extensionEnabled = enabled;
    }
    const builder = this.extensionOwner.getBuilder(enabled);
    const inputs = [
      builder,
      this.mention,
      this.command,
      this.autocomplete,
      this.starters,
      this.hostExtensions,
    ];
    if (
      !inputs.every((value, index) => value === this.extensionInputs[index])
    ) {
      this.extensionInputs = inputs;
      this.extensions = buildInputExtensions(
        {
          mention: this.mention,
          command: this.command,
          autocomplete: this.autocomplete,
          starters: this.starters,
        },
        this.hostExtensions,
        builder
      );
    }
    // Upload rows replace the single live error, so its announcement latch resets.
    const present =
      this.inputProps.isInputVisible &&
      (this.overMaxLength ||
        (!this.hasUploadErrors && this.inputProps.error !== undefined));
    if (!present) {
      this.resetError();
    } else if (!this.errorPresent) {
      this.errorPresent = true;
      const generation = ++this.errorGeneration;
      queueMicrotask(() => {
        if (this.active && generation === this.errorGeneration) {
          this.errorReady = true;
          this.requestUpdate();
        }
      });
    }
  }

  private prepareValue() {
    if (!this.valueInitialized) {
      const state = this.serviceManager.store.getState();
      this.rawValue = this.inputProps.trackInputState
        ? (selectInputState(state).rawValue ?? '')
        : '';
      this.mirroredSlice = selectIsInputToHumanAgent(state);
      this.valueInitialized = true;
    }
    if (this.surfaceVisible !== this.inputProps.isInputVisible) {
      this.surfaceVisible = this.inputProps.isInputVisible;
      this.surfaceGeneration += 1;
      this.listNavigated = false;
    }
    if (!this.inputProps.trackInputState && this.trackedSlice !== undefined) {
      this.serviceManager.store.dispatch(
        actions.updateInputState({ focused: false }, this.trackedSlice)
      );
      this.trackedSlice = undefined;
    }
    if (this.inputProps.trackInputState && this.trackedSlice === undefined) {
      this.trackedSlice = selectIsInputToHumanAgent(
        this.serviceManager.store.getState()
      );
    }
  }

  protected updated() {
    if (!this.active || !this.inputProps) {
      return;
    }
    if (!this.releaseHandle) {
      this.releaseHandle = registerInputImperativeHandle(
        this.serviceManager,
        this.inputFunctions
      );
    }
    this.restoreDraft();
    const error = this.currentError;
    if (error && this.errorReady && error.live && !this.errorAnnounced) {
      this.errorAnnounced = true;
      const generation = this.errorGeneration;
      const announce = this.viewState.announcer.announce;
      this.announcementTimer = setTimeout(() => {
        if (this.active && generation === this.errorGeneration) {
          announce(error.announcement);
        }
      });
    }
  }

  private mirrorValue() {
    if (!this.active || !this.inputProps?.trackInputState) {
      return;
    }
    const state = this.serviceManager.store.getState();
    const agent = selectIsInputToHumanAgent(state);
    const sliceChanged = this.mirroredSlice !== agent;
    this.mirroredSlice = agent;
    const previousSlice = this.trackedSlice;
    this.trackedSlice = agent;
    if (sliceChanged) {
      this.requestUpdate();
    }
    mirrorInputValue({
      rawValue: selectInputState(state).rawValue ?? '',
      sliceChanged,
      restoreDraft: Boolean(this.inputProps.restoreDraft),
      getRawValue: () => this.rawValue,
      changeLocalValue: (value) => {
        this.rawValue = value;
        this.requestUpdate();
      },
      getPromptLine: () => this.prompt,
    });
    if (previousSlice !== undefined && previousSlice !== agent) {
      this.serviceManager.store.dispatch(
        actions.updateInputState({ focused: false }, previousSlice)
      );
    }
  }

  private restoreDraft() {
    const prompt = this.prompt;
    const props = this.inputProps;
    if (!props.trackInputState || !props.restoreDraft || !prompt) {
      this.draftGeneration += 1;
      this.restoring = undefined;
      return;
    }
    const agent = selectIsInputToHumanAgent(
      this.serviceManager.store.getState()
    );
    if (
      (this.restored?.prompt === prompt && this.restored.agent === agent) ||
      (this.restoring?.prompt === prompt && this.restoring.agent === agent)
    ) {
      return;
    }
    const generation = ++this.draftGeneration;
    const lifetime = this.lifetime;
    const current = () =>
      this.active &&
      lifetime === this.lifetime &&
      generation === this.draftGeneration &&
      this.prompt === prompt;
    const promise = restoreInputDraft(
      this.serviceManager,
      prompt,
      agent,
      current,
      this.latchRich
    )
      .then((restored) => {
        if (restored && current()) {
          this.restored = { prompt, agent };
        }
      })
      .catch((error) => {
        if (current()) {
          consoleError('Unable to restore the built-in input draft.', error);
        }
      });
    this.restoring = { prompt, agent, promise };
  }

  private get overMaxLength() {
    return this.rawValue.length > (this.inputProps.maxInputChars ?? 10000);
  }
  private get hasUploadErrors() {
    return (this.inputProps.uploadErrors?.length ?? 0) > 0;
  }
  private get disableSend() {
    return (
      this.inputProps.disableSend ||
      this.configDisableSend ||
      this.overMaxLength ||
      this.hasUploadErrors ||
      this.inputProps.error !== undefined ||
      hasInFlightUpload(this.inputProps.pendingUploads)
    );
  }

  private readonly send = () => {
    if (!this.active) {
      return;
    }
    const props = this.inputProps;
    const store = this.serviceManager.store;
    const lifetime = this.lifetime;
    const current = () => this.active && lifetime === this.lifetime;
    sendInputValue({
      getRawValue: () => this.rawValue,
      getDisplayContent: () => this.displayContent,
      pendingUploads: this.renderedUploads,
      effectiveDisableSend: this.renderedDisableSend,
      onSendInput: props.onSendInput,
      clearLocalValue: () => {
        if (current()) {
          this.rawValue = '';
          this.displayContent = null;
          this.requestUpdate();
        }
      },
      getPromptLine: () => (current() ? this.prompt : null),
      clearTrackedValue: props.trackInputState
        ? () => {
            store.dispatch(
              actions.updateInputState(
                { rawValue: '' },
                selectIsInputToHumanAgent(store.getState())
              )
            );
          }
        : undefined,
    });
  };

  private readonly change = (
    event: CustomEvent<{ rawValue: string; content?: JSONContent }>
  ) => {
    if (!this.active || event.currentTarget !== this.prompt) {
      return;
    }
    changeInputValue(
      event.detail,
      (rawValue, content) => {
        this.rawValue = rawValue;
        this.displayContent = content;
        this.requestUpdate();
      },
      this.inputProps.trackInputState
        ? (value) => {
            const store = this.serviceManager.store;
            store.dispatch(
              actions.updateInputState(
                value,
                selectIsInputToHumanAgent(store.getState())
              )
            );
          }
        : undefined
    );
  };

  private focusState(focused: boolean) {
    if (!this.active) {
      return;
    }
    const store = this.serviceManager.store;
    if (this.inputProps.trackInputState) {
      store.dispatch(
        actions.updateInputState(
          { focused },
          selectIsInputToHumanAgent(store.getState())
        )
      );
    }
    if (focused && !this.hasAnnouncedShortcut) {
      const shortcut =
        store.getState().config.derived.keyboardShortcuts.messageFocusToggle;
      if (shortcut.isOn) {
        store.dispatch(
          actions.announceMessage({
            messageID: 'input_keyboardShortcutAnnouncement',
            messageValues: { key: formatShortcutForDisplay(shortcut) },
          })
        );
        this.hasAnnouncedShortcut = true;
      }
    }
  }

  private readonly removeFile = (event: CustomEvent<{ fileId: string }>) => {
    if (
      !this.hasCurrentSurface ||
      event.currentTarget !== this.querySelector('cds-aichat-file-uploads')
    ) {
      return;
    }
    if (this.inputProps.onRemoveFile) {
      this.inputProps.onRemoveFile(event.detail.fileId);
    } else {
      const store = this.serviceManager.store;
      store.dispatch(
        actions.removeFileUpload(
          event.detail.fileId,
          selectIsInputToHumanAgent(store.getState())
        )
      );
    }
  };

  private readonly selectFiles = (event: Event) => {
    if (
      !this.hasCurrentSurface ||
      event.currentTarget !== this.querySelector('input[type="file"]')
    ) {
      return;
    }
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length) {
      return;
    }
    const props = this.inputProps;
    const { accepted, rejections } = validateFileSelection(
      files,
      props.pendingUploads?.length ?? 0,
      {
        accept: props.allowedFileUploadTypes,
        maxFileSizeBytes: props.maxFileSizeBytes,
        maxFiles: props.maxFiles,
      }
    );
    rejections.forEach((rejection) =>
      this.viewState.announcer.announce({ ...rejection, assertive: true })
    );
    if (accepted.length) {
      props.onFilesSelectedForUpload?.(
        accepted.map((file) => ({
          id: uuid(),
          status: FileStatusValue.EDIT,
          file,
        }))
      );
    }
  };

  private readonly stop = async () => {
    if (!this.active) {
      return;
    }
    const lifetime = this.lifetime;
    const current = () => this.active && lifetime === this.lifetime;
    try {
      await this.inputProps.onStopStreaming(() => {
        if (current()) {
          this.stopPending = true;
          this.requestUpdate();
        }
      });
    } finally {
      if (current()) {
        this.stopPending = false;
        this.requestUpdate();
      }
    }
  };

  private get currentError() {
    if (!this.errorPresent) {
      return null;
    }
    const props = this.inputProps;
    if (this.overMaxLength) {
      const title = this.intl.formatMessage({
        id: 'input_maxCharCountExceededTitle',
      });
      const description = this.intl.formatMessage(
        { id: 'input_maxCharCountExceeded' },
        { max: props.maxInputChars ?? 10000, current: this.rawValue.length }
      );
      return {
        title,
        description,
        collapsible: true,
        live: true,
        announcement: `${title}. ${description}`,
      };
    }
    const error = props.error;
    return {
      ...error,
      live: true,
      announcement: error.description
        ? `${error.title}. ${error.description}`
        : error.title,
    };
  }

  private resetError() {
    this.errorPresent = false;
    this.errorReady = false;
    this.errorAnnounced = false;
    this.errorGeneration += 1;
    clearTimeout(this.announcementTimer);
  }

  private renderError() {
    if (!this.overMaxLength && this.hasUploadErrors) {
      return html`<div slot="field-messaging">
        ${repeat(
          this.inputProps.uploadErrors,
          (entry) => entry.id,
          (entry) =>
            html`<div aria-live="off">
              <cds-aichat-error-message
                .fullscreen=${this.wide}
                .title=${entry.title}
                .description=${entry.description}
                .collapsible=${false}></cds-aichat-error-message>
            </div>`
        )}
      </div>`;
    }
    const error = this.currentError;
    return error
      ? html`<div slot="field-messaging">
          <div aria-live=${error.live ? 'polite' : 'off'}>
            ${this.errorReady ? html`<cds-aichat-error-message .fullscreen=${this.wide} .title=${error.title} .description=${error.description} .collapsible=${error.collapsible}></cds-aichat-error-message>` : nothing}
          </div>
        </div>`
      : nothing;
  }

  private readonly openFiles = () => {
    if (this.active) {
      this.querySelector<HTMLInputElement>('input[type="file"]')?.click();
    }
  };
  private readonly filesAddedText = ({ count }: { count: number }) =>
    this.intl.formatMessage(
      { id: 'fileSharing_ariaAnnounceFilesAdded' },
      { count }
    );
  private readonly filesUploadingText = ({ count }: { count: number }) =>
    this.intl.formatMessage(
      { id: 'fileSharing_ariaAnnounceFilesUploading' },
      { count }
    );
  private readonly removeFileLabel = ({ name }: { name?: string }) =>
    name
      ? this.intl.formatMessage(
          { id: 'fileSharing_removeButtonTitleWithName' },
          { filename: name }
        )
      : this.languagePack.fileSharing_removeButtonTitle;
  private readonly failureText = ({ messages }: { messages: string[] }) =>
    [
      `${this.languagePack.fileSharing_uploadErrorTitle}.`,
      ...messages,
      this.languagePack.fileSharing_uploadErrorRecovery,
    ]
      .filter(Boolean)
      .join(' ');

  private renderPrompt(current: () => boolean) {
    const props = this.inputProps;
    const pack = this.languagePack;
    return html`<cds-aichat-prompt-line
      slot="editor"
      .rich=${this.richLatched}
      .extensions=${this.extensions}
      .disabled=${props.disableInput}
      .placeholder=${props.placeholder || (props.disableInput ? undefined : pack.input_placeholder) || ''}
      aria-label=${pack.input_ariaLabel}
      .testId=${PageObjectId.INPUT}
      @cds-aichat-prompt-change=${this.change}
      @cds-aichat-prompt-focus=${(event: Event) => {
        if (current() && event.currentTarget === this.prompt) {
          this.focusState(true);
        }
      }}
      @cds-aichat-prompt-blur=${(event: Event) => {
        if (current() && event.currentTarget === this.prompt) {
          this.focusState(false);
        }
      }}
      @cds-aichat-prompt-typing=${(
        event: CustomEvent<{ isTyping: boolean }>
      ) => {
        if (current() && event.currentTarget === this.prompt) {
          this.inputProps.onUserTyping?.(event.detail.isTyping);
        }
      }}
      @cds-aichat-prompt-send-intent=${(event: CustomEvent) => {
        event.stopPropagation();
        if (current() && event.currentTarget === this.prompt) {
          this.send();
        }
      }}></cds-aichat-prompt-line>`;
  }

  private renderAutocomplete(current: () => boolean) {
    return html`<cds-aichat-native-autocomplete
      .contentOwner=${this.contentOwner}
      .mention=${this.mention}
      .command=${this.command}
      .autocomplete=${this.autocomplete}
      .starters=${this.starters}
      .isSendDisabled=${this.configDisableSend}
      .onStarterSelected=${(text: string) => {
        if (current()) {
          this.rawValue = text;
          this.requestUpdate();
          this.send();
        }
      }}
      .onSendItem=${(text: string) => {
        if (current()) {
          this.rawValue = text;
          this.displayContent = null;
          this.requestUpdate();
          this.send();
        }
      }}
      .onListNavigated=${(value: boolean) => {
        if (current()) {
          this.listNavigated = value;
          this.requestUpdate();
        }
      }}></cds-aichat-native-autocomplete>`;
  }

  private renderSendControl(current: () => boolean) {
    const props = this.inputProps;
    const pack = this.languagePack;
    return html`<cds-aichat-prompt-line-slot
        .slotName=${WriteableElementName.PROMPT_LINE_SEND_BUTTON_START}
        .wrapperSlot=${'send-control'}></cds-aichat-prompt-line-slot>
      <cds-aichat-input-send-control
        slot="send-control"
        .hasValidInput=${hasSendableInput(this.rawValue, props.pendingUploads)}
        .disabled=${props.disableInput}
        .disableSend=${this.disableSend || this.listNavigated}
        .isStopStreamingButtonVisible=${props.isStopStreamingButtonVisible}
        .isStopStreamingButtonDisabled=${props.isStopStreamingButtonDisabled || this.stopPending}
        .buttonLabel=${pack.input_buttonLabel}
        .stopResponseLabel=${pack.input_stopResponse}
        .testId=${PageObjectId.INPUT_SEND}
        @cds-aichat-input-send=${(event: Event) => {
          if (
            current() &&
            event.currentTarget ===
              this.querySelector('cds-aichat-input-send-control')
          ) {
            this.send();
          }
        }}
        @cds-aichat-input-stop-streaming=${(event: Event) => {
          if (
            current() &&
            event.currentTarget ===
              this.querySelector('cds-aichat-input-send-control')
          ) {
            return this.stop();
          }
          return undefined;
        }}></cds-aichat-input-send-control>`;
  }

  private renderMessageActions(openFiles: () => void) {
    const props = this.inputProps;
    const pack = this.languagePack;
    const effectiveActions = this.effectiveActions;
    if (!props.showUploadButton && !effectiveActions) {
      return nothing;
    }
    const uploadDisabled = props.disableUploadButton || props.disableInput;
    return html`<div slot="message-actions">
      ${props.showUploadButton ? html`<input type="file" hidden tabindex="-1" accept=${props.allowedFileUploadTypes || ''} .multiple=${props.allowMultipleFileUploads} .disabled=${uploadDisabled} @change=${this.selectFiles} />` : nothing}
      ${effectiveActions ? html`<cds-aichat-input-actions .expanded=${this.expanded} .disabled=${props.disableInput} .actions=${effectiveActions} .menuLabel=${this.expanded ? pack.input_actionsOverflowLabel : pack.input_actionsMenuLabel} .transformIcon=${descriptorIcon}></cds-aichat-input-actions>` : html`<cds-icon-button kind="ghost" size="sm" ?disabled=${uploadDisabled} @click=${openFiles}>${iconLoader(Add16, { slot: 'icon' })}<span slot="tooltip-content">${pack.input_uploadButtonLabel}</span></cds-icon-button>`}
    </div>`;
  }

  protected renderView() {
    this.renderedLifetime = this.lifetime;
    this.renderedSurface = this.surfaceGeneration;
    const props = this.inputProps;
    if (props) {
      this.renderedDisableSend = this.disableSend;
      this.renderedUploads = props.pendingUploads;
    }
    if (!props?.isInputVisible) {
      return nothing;
    }
    const pack = this.languagePack;
    const lifetime = this.lifetime;
    const surfaceGeneration = this.surfaceGeneration;
    const current = () =>
      this.active &&
      lifetime === this.lifetime &&
      surfaceGeneration === this.surfaceGeneration;
    const openFiles = () => {
      if (current()) {
        this.openFiles();
      }
    };
    const actionInputs = [
      this.inputActions,
      props.showUploadButton,
      pack.input_uploadButtonLabel,
      this.expanded,
      lifetime,
      surfaceGeneration,
    ];
    if (
      !actionInputs.every((value, index) => value === this.actionInputs[index])
    ) {
      this.actionInputs = actionInputs;
      this.effectiveActions =
        this.inputActions &&
        (props.showUploadButton
          ? [
              {
                text: pack.input_uploadButtonLabel,
                icon: this.expanded ? Add16 : Attachment16,
                onClick: openFiles,
              },
              ...this.inputActions,
            ]
          : this.inputActions);
    }
    return keyed(
      lifetime,
      html`<cds-aichat-prompt-line-shell
        .rounded=${props.rounded}
        .expanded=${this.expanded}
        .hasError=${props.error !== undefined || this.hasUploadErrors || this.overMaxLength}
        .disabled=${props.disableInput}
        exportparts="prompt-container">
        ${this.renderPrompt(current)} ${this.renderAutocomplete(current)}
        ${this.renderError()} ${this.renderMessageActions(openFiles)}
        ${this.expanded ? html`<cds-aichat-prompt-line-slot ${ref(this.captureActionsEnd)} .slotName=${WriteableElementName.PROMPT_LINE_ACTIONS_END} .wrapperSlot=${'message-actions'}></cds-aichat-prompt-line-slot>` : nothing}
        ${props.showUploadButton ? html`<cds-aichat-file-uploads slot="file-uploads" .uploads=${props.pendingUploads || EMPTY_UPLOADS} .removeFileLabel=${pack.fileSharing_removeButtonTitle} .getRemoveFileLabel=${this.removeFileLabel} .uploadingFileLabel=${pack.fileSharing_statusUploading} .getFilesAddedText=${this.filesAddedText} .getFilesUploadingText=${this.filesUploadingText} .fileRemovedLabel=${pack.fileSharing_ariaAnnounceFileRemoved} .uploadSuccessLabel=${pack.fileSharing_ariaAnnounceSuccess} .getFileUploadFailureText=${this.failureText} @cds-aichat-file-remove=${this.removeFile}></cds-aichat-file-uploads>` : nothing}
        ${this.renderSendControl(current)}
      </cds-aichat-prompt-line-shell>`
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-chat-input': ChatInput;
  }
}

export default ChatInput;
