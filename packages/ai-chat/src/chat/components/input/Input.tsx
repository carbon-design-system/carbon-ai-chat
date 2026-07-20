/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { forwardRef, Ref, useMemo, useRef, useState } from "react";
import { AnnounceOnMountComponent } from "../util/AnnounceOnMountComponent";
import PromptLineShell from "@carbon/ai-chat-components/es/react/prompt-line-shell.js";
import InputSendControl from "@carbon/ai-chat-components/es/react/input-send-control.js";
import FileUploads from "@carbon/ai-chat-components/es/react/file-uploads.js";
import PromptLine from "@carbon/ai-chat-components/es/react/prompt-line.js";
import ErrorMessage from "@carbon/ai-chat-components/es/react/error-message.js";
import type { FileUpload } from "@carbon/ai-chat-components/es/components/prompt-line/src/types.js";
import { FileStatusValue } from "@carbon/ai-chat-components/es/components/prompt-line/src/types.js";
import type { PromptLineElement } from "@carbon/ai-chat-components/es/components/prompt-line/index.js";
import { useChatAutocomplete } from "@carbon/ai-chat-components/es/react/hooks/useChatAutocomplete.js";
import type { Editor, JSONContent } from "@tiptap/core";
import actions from "../../store/actions";
import {
  selectIsInputToHumanAgent,
  selectLanguagePack,
} from "../../store/selectors";
import { ChatWidthBreakpoint, AppState } from "../../../types/state/AppState";
import { useSelector } from "../../hooks/useSelector";
import { BusEventType } from "../../../types/events/eventBusTypes";
import { useServiceManager } from "../../hooks/useServiceManager";
import { useIntl } from "../../hooks/useIntl";
import { useAriaAnnouncer } from "../../hooks/useAriaAnnouncer";
import { validateFileSelection } from "../../utils/fileUploadValidation";
import { useInputConfig } from "../../hooks/useInputConfig";
import { useRichSurface } from "./useRichSurface";
import { useInputValueSync } from "./useInputValueSync";
import { useInputImperativeHandle } from "./useInputImperativeHandle";
import { PageObjectId } from "../../../testing/PageObjectId";
import { consoleError } from "../../utils/miscUtils";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

// Upload button
import IconButton from "../carbon/IconButton";
import { BUTTON_KIND } from "../carbon/Button";
import Add16 from "@carbon/icons/es/add--large/16.js";
import Attachment16 from "@carbon/icons/es/attachment/16.js";
import { carbonIconToReact } from "../../utils/carbonIcon";
import { InputActionsMenu } from "./InputActionsMenu";
import { InputActionsInline } from "./InputActionsInline";
import type { ToolbarAction } from "../../../types/config/HeaderConfig";
import { WriteableElementName } from "../../../types/instance/WriteableElements";
import PromptLineWriteableSlot from "./PromptLineWriteableSlot";

const AddIcon = carbonIconToReact(Add16);

/** Shared empty fallback so `<FileUploads>` always receives an array. */
const EMPTY_UPLOADS: FileUpload[] = [];

/**
 * Props for Input - the Redux-connected container component.
 * This component handles all Redux subscriptions, dispatches, and config access.
 */
interface InputProps {
  /**
   * Indicates if the input field should be disabled (the user cannot type anything).
   */
  disableInput: boolean;

  /**
   * Indicates if the input field should be hidden or visible.
   */
  isInputVisible: boolean;

  /**
   * Indicates if sending a message should be disabled.
   */
  disableSend: boolean;

  /**
   * The callback to call when the user enters some text into the field and it needs to be sent.
   * `displayContent` is the editor's JSONContent at send time when available — present for UI sends,
   * absent for programmatic ones.
   */
  onSendInput: (text: string, displayContent?: JSONContent) => void;

  /**
   * An optional placeholder to display in the field.
   */
  placeholder?: string;

  /**
   * A callback to indicate when the user is typing.
   */
  onUserTyping?: (isTyping: boolean) => void;

  /**
   * Indicates if a button should be displayed that would allow a user to select a file to upload.
   */
  showUploadButton?: boolean;

  /**
   * Indicates if the file upload button should be disabled.
   */
  disableUploadButton?: boolean;

  /**
   * The filter to apply to choosing files for upload.
   */
  allowedFileUploadTypes?: string;

  /**
   * Indicates if the user should be allowed to choose multiple files to upload.
   */
  allowMultipleFileUploads?: boolean;

  /**
   * Maximum size in bytes for a single uploaded file. Files exceeding this are
   * rejected before upload. When undefined, there is no size limit.
   */
  maxFileSizeBytes?: number;

  /**
   * Maximum number of files that may be attached at once. When undefined, there
   * is no limit.
   */
  maxFiles?: number;

  /**
   * A list of pending file uploads to display in the input area.
   */
  pendingUploads?: FileUpload[];

  /**
   * The callback that is called when the user selects one or more files to be uploaded.
   */
  onFilesSelectedForUpload?: (files: FileUpload[]) => void;

  /**
   * Optional override for the remove-file action.
   */
  onRemoveFile?: (fileID: string) => void;

  /**
   * Determines if the "stop streaming" button should be visible.
   */
  isStopStreamingButtonVisible?: boolean;

  /**
   * Determines if the "stop streaming" button should be disabled.
   */
  isStopStreamingButtonDisabled?: boolean;

  /**
   * Maximum number of characters allowed to be typed into the input field.
   */
  maxInputChars?: number;

  /**
   * Indicates if this input should stay in sync with the global input state used for ChatInstance APIs.
   */
  trackInputState?: boolean;

  /**
   * Whether the input container should have rounded corners (at wider breakpoints).
   */
  rounded?: boolean;

  /**
   * Error configuration for displaying an error message in the input field.
   */
  error?: {
    /**
     * The error title to display.
     */
    title: string;
    /**
     * The error description to display.
     */
    description?: string;
    /**
     * Whether the error message container should be collapsible.
     */
    collapsible?: boolean;
  };
}

/**
 * Functions exposed by the Input component via ref.
 */
interface InputFunctions {
  /**
   * Requests focus on the input field.
   */
  requestFocus: () => boolean;

  /**
   * Returns true if the input field currently has focus.
   */
  hasFocus: () => boolean;

  /**
   * Replace the entire input content. Throws if the editor is not currently
   * rendered.
   */
  setContent: (
    next: JSONContent | string | ((prev: JSONContent) => JSONContent),
  ) => void;

  /**
   * Insert content at the cursor or at `options.at` (a PM document offset).
   * Throws if the editor is not currently rendered.
   */
  insertContent: (
    content: JSONContent | string,
    options?: { at?: number },
  ) => void;

  /**
   * Probe-style access to the live Tiptap editor. Returns `null` when the
   * editor is not mounted. Never triggers a load.
   */
  getEditor: () => Editor | null;

  /**
   * Loads Tiptap on demand (upgrading the textarea in place), then resolves
   * with the live editor. Rejects when the input surface is not mounted.
   */
  ensureEditor: () => Promise<Editor>;
}

/**
 * Input - Redux-connected container component for the input field.
 *
 * Slots a `<PromptLine>` editor into the layout-only `<PromptLineShell>`, builds
 * the curated Tiptap extension list from the chat-domain configs in Redux,
 * wires up the autocomplete overlay, and gates the send button. The shell
 * itself carries no chat logic — this component owns it all.
 */
function Input(props: InputProps, ref: Ref<InputFunctions>) {
  const {
    disableInput,
    isInputVisible,
    disableSend,
    onSendInput,
    placeholder,
    onUserTyping,
    showUploadButton,
    disableUploadButton,
    allowedFileUploadTypes,
    allowMultipleFileUploads,
    maxFileSizeBytes,
    maxFiles,
    pendingUploads,
    onFilesSelectedForUpload,
    onRemoveFile: onRemoveFileProp,
    isStopStreamingButtonVisible,
    isStopStreamingButtonDisabled,
    maxInputChars = 10000,
    trackInputState = false,
    rounded,
    error,
  } = props;

  const serviceManager = useServiceManager();
  const languagePack = useSelector(selectLanguagePack);
  const intl = useIntl();
  const ariaAnnouncer = useAriaAnnouncer();
  const store = serviceManager.store;
  const hasErrorProp = error !== undefined;

  // Locale-aware announcement formatters for batched file changes. The
  // `file-uploads` component coalesces same-frame adds/uploads into a single
  // counted announcement and calls these; intl handles the (locale-specific)
  // pluralization that the component can't do on its own.
  const getFilesAddedText = useMemo(
    () =>
      ({ count }: { count: number }) =>
        intl.formatMessage(
          { id: "fileSharing_ariaAnnounceFilesAdded" },
          { count },
        ),
    [intl],
  );
  const getFilesUploadingText = useMemo(
    () =>
      ({ count }: { count: number }) =>
        intl.formatMessage(
          { id: "fileSharing_ariaAnnounceFilesUploading" },
          { count },
        ),
    [intl],
  );

  // Get chat width breakpoint and height to determine autocomplete settings
  const chatWidthBreakpoint = useSelector(
    (state: AppState) => state.chatWidthBreakpoint,
  );
  const chatHeight = useSelector((state: AppState) => state.chatHeight);

  const {
    mention,
    command,
    autocomplete,
    starters,
    hostExtensions,
    isSendDisabledFromConfig,
    // Aliased to avoid colliding with the store `actions` import above.
    actions: inputActions,
    expanded,
  } = useInputConfig();

  // Surface mode (textarea "lite" vs rich Tiptap) + sticky latch + the curated
  // extension list. `latchRich` is threaded into the imperative `ensureEditor`
  // so the element's own on-demand upgrade keeps React passing `rich`/`extensions`.
  const {
    useRichEditor,
    extensions,
    normalizedMention,
    normalizedCommand,
    normalizedAutocomplete,
    normalizedStarters,
    latchRich,
  } = useRichSurface({
    mention,
    command,
    autocomplete,
    starters,
    hostExtensions,
  });

  // Track if we've announced the keyboard shortcut to avoid repeating it
  const [hasAnnouncedShortcut, setHasAnnouncedShortcut] = useState(false);

  const promptLineRef = useRef<PromptLineElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Local value (rawValue) + Redux mirror (when tracking) + the send path.
  // `setRawInputValue`/`rawInputValueRef` are exposed for the autocomplete
  // starter path below.
  const {
    rawInputValue,
    rawInputValueRef,
    setRawInputValue,
    overMaxLength,
    effectiveDisableSend,
    handleInputChange,
    sendCurrentValue,
    handleSendControlSend,
    handlePromptSendIntent,
  } = useInputValueSync({
    serviceManager,
    promptLineRef,
    trackInputState,
    maxInputChars,
    disableSend,
    isSendDisabledFromConfig,
    onSendInput,
    hasErrorProp,
  });

  const hasValidInput = useMemo(
    () =>
      Boolean(rawInputValue?.trim()) ||
      (pendingUploads != null &&
        pendingUploads.length > 0 &&
        !pendingUploads.every((u) => u.isError)),
    [rawInputValue, pendingUploads],
  );

  /**
   * Handle input focus - announces keyboard shortcut on first focus if enabled,
   * and mirrors the focus state into Redux when tracking is on.
   */
  const handleInputFocus = () => {
    if (trackInputState) {
      const isInputToHumanAgent = selectIsInputToHumanAgent(store.getState());
      store.dispatch(
        actions.updateInputState({ focused: true }, isInputToHumanAgent),
      );
    }

    if (!hasAnnouncedShortcut) {
      const shortcutConfig =
        store.getState().config.public.keyboardShortcuts?.messageFocusToggle;

      if (shortcutConfig?.is_on) {
        const key = shortcutConfig.key;
        store.dispatch(
          actions.announceMessage({
            messageID: "input_keyboardShortcutAnnouncement",
            messageValues: { key },
          }),
        );
        setHasAnnouncedShortcut(true);
      }
    }
  };

  /**
   * Handle input blur - mirrors the focus state into Redux when tracking is on.
   */
  const handleInputBlur = () => {
    if (trackInputState) {
      const isInputToHumanAgent = selectIsInputToHumanAgent(store.getState());
      store.dispatch(
        actions.updateInputState({ focused: false }, isInputToHumanAgent),
      );
    }
  };

  /**
   * Handle file removal - dispatches to Redux or calls prop callback.
   */
  const handleRemoveFile = (event: CustomEvent<{ fileId: string }>) => {
    const { fileId } = event.detail;
    if (onRemoveFileProp) {
      onRemoveFileProp(fileId);
    } else {
      const isInputToHumanAgent = selectIsInputToHumanAgent(store.getState());
      store.dispatch(actions.removeFileUpload(fileId, isInputToHumanAgent));
    }
  };

  /**
   * Handle file selection from the upload button.
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const files = Array.from(input.files || []);
    // Reset early so re-selecting the same file fires `change` again, even if
    // every file is rejected below.
    input.value = "";
    if (files.length === 0) {
      return;
    }

    const { accepted, rejections } = validateFileSelection(
      files,
      pendingUploads?.length ?? 0,
      {
        accept: allowedFileUploadTypes,
        maxFileSizeBytes,
        maxFiles,
      },
    );

    // Validation failures block the user, so announce them assertively.
    for (const rejection of rejections) {
      ariaAnnouncer({
        messageID: rejection.messageID,
        messageValues: rejection.messageValues,
        assertive: true,
      });
    }

    if (accepted.length === 0) {
      return;
    }

    const fileUploads: FileUpload[] = accepted.map((file) => ({
      id: uuid(),
      status: FileStatusValue.EDIT,
      file,
    }));
    onFilesSelectedForUpload?.(fileUploads);
  };

  /**
   * Handle stop streaming button click.
   */
  const handleStopStreaming = async () => {
    store.dispatch(actions.setStopStreamingButtonDisabled(true));
    try {
      await serviceManager.fire({
        type: BusEventType.STOP_STREAMING,
      });
      await serviceManager.messageService.cancelCurrentMessageRequest();
    } catch (error) {
      consoleError("Error stopping stream:", error);
      store.dispatch(actions.setStopStreamingButtonDisabled(false));
    }
  };

  /**
   * Handle typing events from the prompt-line.
   */
  const handleTyping = (event: CustomEvent<{ isTyping: boolean }>) => {
    const { isTyping } = event.detail;
    onUserTyping?.(isTyping);
  };

  const { onTriggerChange, autocompleteContent } = useChatAutocomplete({
    mention: normalizedMention,
    command: normalizedCommand,
    autocomplete: normalizedAutocomplete,
    starters: normalizedStarters,
    promptLineRef,
    isSendDisabled: isSendDisabledFromConfig,
    attached: chatWidthBreakpoint !== ChatWidthBreakpoint.WIDE,
    maxHeight: `${Math.floor(chatHeight * 0.4)}px`,
    onStarterSelected: (text) => {
      // Reflect the inserted text into local state so send-gating reads it,
      // then run the same send path used elsewhere.
      setRawInputValue(text);
      rawInputValueRef.current = text;
      sendCurrentValue();
    },
    onSendItem: (text) => {
      onSendInput(text);
    },
  });

  useInputImperativeHandle({
    ref,
    promptLineRef,
    serviceManager,
    latchRich,
  });

  const effectiveActions = useMemo<ToolbarAction[] | undefined>(() => {
    if (!inputActions) {
      return undefined;
    }
    if (!showUploadButton) {
      return inputActions;
    }
    const uploadOption: ToolbarAction = {
      text: languagePack.input_uploadButtonLabel,
      // Inline (expanded) actions are icon-only, so use the Add icon to match
      // the standalone upload button; the labeled popover keeps the more
      // descriptive Attachment icon next to its text.
      icon: expanded ? Add16 : Attachment16,
      onClick: () => fileInputRef.current?.click(),
    };
    return [uploadOption, ...inputActions];
  }, [
    inputActions,
    showUploadButton,
    languagePack.input_uploadButtonLabel,
    expanded,
  ]);

  /**
   * Renders the error message component if an error is provided.
   */
  const renderErrorMessage = () => {
    // Whether the prompt line has alternate layout for expanded mode and/or message actions
    const actionsLayout = expanded || showUploadButton || effectiveActions;

    if (overMaxLength) {
      const errorText = intl.formatMessage(
        { id: "input_maxCharCountExceeded" },
        { max: maxInputChars, current: rawInputValue.length },
      );
      return (
        <div slot="field-messaging">
          <AnnounceOnMountComponent
            announceOnce={`Error: Max character count exceeded. ${errorText}`}
          >
            <ErrorMessage
              fullscreen={chatWidthBreakpoint === ChatWidthBreakpoint.WIDE}
              actionsLayout={actionsLayout}
              title="Error: Max character count exceeded"
              description={errorText}
              collapsible={true}
            />
          </AnnounceOnMountComponent>
        </div>
      );
    }

    if (!hasErrorProp) {
      return null;
    }

    const announcement = error.description
      ? `${error.title}. ${error.description}`
      : error.title;

    return (
      <div slot="field-messaging">
        <AnnounceOnMountComponent announceOnce={announcement}>
          <ErrorMessage
            fullscreen={chatWidthBreakpoint === ChatWidthBreakpoint.WIDE}
            actionsLayout={actionsLayout}
            title={error.title}
            description={error?.description}
            collapsible={error?.collapsible}
          />
        </AnnounceOnMountComponent>
      </div>
    );
  };

  if (!isInputVisible) {
    return null;
  }

  const showUploadButtonDisabled = disableUploadButton || disableInput;
  const editorPlaceholder =
    placeholder ||
    (disableInput ? undefined : languagePack.input_placeholder) ||
    "";

  const hasError = hasErrorProp || overMaxLength;

  return (
    <PromptLineShell
      rounded={rounded}
      expanded={expanded}
      hasError={hasError}
      disabled={disableInput}
    >
      <PromptLine
        slot="editor"
        ref={promptLineRef}
        rich={useRichEditor}
        // Always hand the element its extension list. The curated trigger
        // features (mention / command / autocomplete / starters) only populate
        // it in rich mode; host `tiptap.extensions` force rich (see
        // resolvePromptLineMode), so when present the element mounts rich with
        // them installed. The element treats `extensions` as staged config, not
        // a rich-mode trigger — `rich` alone drives the surface. Enter-to-send
        // lives in the element's own base bundle for both surfaces.
        extensions={extensions}
        disabled={disableInput}
        placeholder={editorPlaceholder}
        aria-label={languagePack.input_ariaLabel}
        testId={PageObjectId.INPUT}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onTyping={handleTyping}
        onSendIntent={handlePromptSendIntent}
        onTriggerChange={onTriggerChange}
      />

      {autocompleteContent}

      {renderErrorMessage()}

      {(showUploadButton || effectiveActions) && (
        <div slot="message-actions">
          {showUploadButton && (
            <input
              type="file"
              ref={fileInputRef}
              hidden
              tabIndex={-1}
              accept={allowedFileUploadTypes || ""}
              multiple={allowMultipleFileUploads}
              disabled={showUploadButtonDisabled}
              onChange={handleFileSelect}
            />
          )}
          {effectiveActions ? (
            expanded ? (
              <InputActionsInline
                disabled={disableInput}
                actions={effectiveActions}
                overflowMenuLabel={languagePack.input_actionsOverflowLabel}
              />
            ) : (
              <InputActionsMenu
                disabled={disableInput}
                actions={effectiveActions}
                menuLabel={languagePack.input_actionsMenuLabel}
              />
            )
          ) : showUploadButton ? (
            <IconButton
              kind={BUTTON_KIND.GHOST}
              size="sm"
              disabled={showUploadButtonDisabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <AddIcon slot="icon" />
              <span slot="tooltip-content">
                {languagePack.input_uploadButtonLabel}
              </span>
            </IconButton>
          ) : null}
        </div>
      )}

      {/*
        Writeable slot rendered after the action buttons and before the prompt
        line. Lives in the `message-actions` slot (ordered after the actions
        block); the `data-prompt-line-slot` marker keeps the shell's
        `--has-message-actions` padding from reacting to this passthrough.

        Only rendered in the expanded layout: the actions row (where this slot
        sits) only exists as a usable track when expanded. In the compact
        layout the slot is omitted, so host content assigned to it is not shown.
      */}
      {expanded && (
        <PromptLineWriteableSlot
          slotName={WriteableElementName.PROMPT_LINE_ACTIONS_END}
          wrapperSlot="message-actions"
        />
      )}

      {/*
        File uploads — pending file status display. Rendered whenever uploading
        is available (even with no files) so the component's live regions stay
        mounted and the last file's removal still announces.
      */}
      {showUploadButton && (
        <FileUploads
          slot="file-uploads"
          uploads={pendingUploads || EMPTY_UPLOADS}
          removeFileLabel={languagePack.fileSharing_removeButtonTitle}
          uploadingFileLabel={languagePack.fileSharing_statusUploading}
          getFilesAddedText={getFilesAddedText}
          getFilesUploadingText={getFilesUploadingText}
          fileRemovedLabel={languagePack.fileSharing_ariaAnnounceFileRemoved}
          uploadSuccessLabel={languagePack.fileSharing_ariaAnnounceSuccess}
          uploadFailureLabel={languagePack.fileSharing_uploadFailed}
          onFileRemove={handleRemoveFile}
        />
      )}

      {/*
        Writeable slot rendered after the prompt line and directly before the
        send button. Lives in the `send-control` slot, ordered before the send
        control so slot assignment places it ahead of the button.
      */}
      <PromptLineWriteableSlot
        slotName={WriteableElementName.PROMPT_LINE_SEND_BUTTON_START}
        wrapperSlot="send-control"
      />

      {/* Send control — send button / stop streaming button */}
      <InputSendControl
        slot="send-control"
        hasValidInput={hasValidInput}
        disabled={disableInput}
        disableSend={effectiveDisableSend}
        isStopStreamingButtonVisible={isStopStreamingButtonVisible}
        isStopStreamingButtonDisabled={isStopStreamingButtonDisabled}
        buttonLabel={languagePack.input_buttonLabel}
        stopResponseLabel={languagePack.input_stopResponse}
        testId={PageObjectId.INPUT_SEND}
        onSend={handleSendControlSend}
        onStopStreaming={handleStopStreaming}
      />
    </PromptLineShell>
  );
}

const InputExport = React.memo(forwardRef(Input));
export { InputExport as Input, InputFunctions };
