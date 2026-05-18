/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  forwardRef,
  Ref,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import InputShell from "@carbon/ai-chat-components/es/react/input-shell.js";
import InputSendControl from "@carbon/ai-chat-components/es/react/input-send-control.js";
import FileUploads from "@carbon/ai-chat-components/es/react/file-uploads.js";
import PromptLine from "@carbon/ai-chat-components/es/react/prompt-line.js";
import type { FileUpload } from "@carbon/ai-chat-components/es/components/input/src/types.js";
import { FileStatusValue } from "@carbon/ai-chat-components/es/components/input/src/types.js";
import type { PromptLineElement } from "@carbon/ai-chat-components/es/components/input/index.js";
import { useChatAutocomplete } from "@carbon/ai-chat-components/es/react/hooks/useChatAutocomplete.js";
import type { Editor, JSONContent } from "@tiptap/core";
import actions from "../../store/actions";
import {
  selectInputState,
  selectIsInputToHumanAgent,
} from "../../store/selectors";
import { BusEventType } from "../../../types/events/eventBusTypes";
import { useServiceManager } from "../../hooks/useServiceManager";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useIntl } from "../../hooks/useIntl";
import { useInputConfig } from "../../hooks/useInputConfig";
import { useInputExtensions } from "../../hooks/useInputExtensions";
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
import type { InputMenuOption } from "../../../types/config/InputConfig";

const AddIcon = carbonIconToReact(Add16);

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
   *
   * @experimental
   */
  setContent: (
    next: JSONContent | string | ((prev: JSONContent) => JSONContent),
  ) => void;

  /**
   * Insert content at the cursor or at `options.at` (a PM document offset).
   * Throws if the editor is not currently rendered.
   *
   * @experimental
   */
  insertContent: (
    content: JSONContent | string,
    options?: { at?: number },
  ) => void;

  /**
   * Probe-style access to the live Tiptap editor. Returns `null` when the
   * editor is not mounted.
   *
   * @experimental
   */
  getEditor: () => Editor | null;
}

/**
 * Input - Redux-connected container component for the input field.
 *
 * Slots a `<PromptLine>` editor into the layout-only `<InputShell>`, builds
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
    pendingUploads,
    onFilesSelectedForUpload,
    onRemoveFile: onRemoveFileProp,
    isStopStreamingButtonVisible,
    isStopStreamingButtonDisabled,
    maxInputChars = 10000,
    trackInputState = false,
    rounded,
  } = props;

  const serviceManager = useServiceManager();
  const languagePack = useLanguagePack();
  const intl = useIntl();
  const store = serviceManager.store;

  const {
    mention,
    command,
    autocomplete,
    starters,
    hostExtensions,
    isSendDisabledFromConfig,
    menuOptions,
  } = useInputConfig();

  const {
    normalizedMention,
    normalizedCommand,
    normalizedAutocomplete,
    normalizedStarters,
    extensions,
  } = useInputExtensions({
    mention,
    command,
    autocomplete,
    starters,
    hostExtensions,
  });

  // Track if we've announced the keyboard shortcut to avoid repeating it
  const [hasAnnouncedShortcut, setHasAnnouncedShortcut] = useState(false);

  // Get tracked input state from Redux if enabled
  const trackedInputState = trackInputState
    ? selectInputState(store.getState())
    : null;

  // Local state for input value (rawValue only — JSONContent doc is internal).
  const [rawInputValue, setRawInputValue] = useState(
    trackedInputState?.rawValue ?? "",
  );

  const rawInputValueRef = useRef(rawInputValue);
  rawInputValueRef.current = rawInputValue;

  // Snapshot of the editor's last-known JSONContent. The send path forwards this verbatim so the
  // user message bubble can render structurally (mention chips, custom nodes).
  const displayContentRef = useRef<JSONContent | null>(null);

  const promptLineRef = useRef<PromptLineElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to Redux state changes if tracking is enabled
  useEffect(() => {
    if (!trackInputState) {
      return undefined;
    }

    const unsubscribe = store.subscribe(() => {
      const nextInputState = selectInputState(store.getState());
      const nextRawValue = nextInputState.rawValue ?? "";

      if (nextRawValue !== rawInputValueRef.current) {
        setRawInputValue(nextRawValue);
        // Push the Redux-driven value into the editor to keep them aligned.
        const promptLine = promptLineRef.current;
        if (promptLine) {
          const editor = promptLine.getEditor();
          if (editor && editor.getText() !== nextRawValue) {
            promptLine.setContent(nextRawValue);
          }
        }
      }
    });

    return unsubscribe;
  }, [store, trackInputState]);

  const overMaxLength = rawInputValue.length > maxInputChars;

  /**
   * Handle input value changes from the prompt-line. Dispatches to Redux if
   * tracking is enabled. `content` is Tiptap JSONContent.
   */
  const handleInputChange = (
    event: CustomEvent<{ rawValue: string; content?: JSONContent }>,
  ) => {
    const { rawValue, content } = event.detail;

    setRawInputValue(rawValue);
    displayContentRef.current = content ?? null;

    if (trackInputState) {
      const isInputToHumanAgent = selectIsInputToHumanAgent(store.getState());
      store.dispatch(
        actions.updateInputState(
          { rawValue, content: content ?? { type: "doc", content: [] } },
          isInputToHumanAgent,
        ),
      );
    }
  };

  const hasValidInput = useMemo(
    () =>
      Boolean(rawInputValue?.trim()) ||
      (pendingUploads != null &&
        pendingUploads.length > 0 &&
        !pendingUploads.every((u) => u.isError)),
    [rawInputValue, pendingUploads],
  );

  const effectiveDisableSend =
    disableSend || isSendDisabledFromConfig || overMaxLength;

  /**
   * Send the current input value - clears the editor and dispatches to Redux
   * if tracking is enabled.
   *
   * Order matters here. We clear Redux BEFORE onSendInput so the store
   * subscriber (see useEffect above) can never observe Redux holding the old
   * value while React state is "". onSendInput dispatches downstream actions
   * (sendWithCatch, etc.) — in React 17 those run through unbatched renders
   * whose layout effects can synchronously fire the subscriber, which would
   * otherwise revert React state back to the just-sent text. We also call
   * promptLineRef.current?.clearContent() to imperatively reset the Tiptap doc
   * in case the prop-driven sync (rawValue → setExternalRawValue) is delayed
   * by @lit/react's native-event scheduling. See issue #1382.
   */
  const sendCurrentValue = () => {
    const text = rawInputValueRef.current;
    if (!text.trim()) {
      return;
    }
    if (effectiveDisableSend) {
      return;
    }
    onSendInput(text, displayContentRef.current ?? undefined);

    setRawInputValue("");
    displayContentRef.current = null;
    promptLineRef.current?.clearContent();

    if (trackInputState) {
      const isInputToHumanAgent = selectIsInputToHumanAgent(store.getState());
      store.dispatch(
        actions.updateInputState({ rawValue: "" }, isInputToHumanAgent),
      );
    }
  };

  const handleSendControlSend = () => {
    sendCurrentValue();
  };

  const handlePromptSendIntent = (event: CustomEvent) => {
    event.stopPropagation();
    sendCurrentValue();
  };

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
    if (files.length === 0) {
      return;
    }

    const fileUploads: FileUpload[] = files.map((file) => ({
      id: uuid(),
      status: FileStatusValue.EDIT,
      file,
    }));
    onFilesSelectedForUpload?.(fileUploads);
    input.value = "";
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
    onStarterSelected: (text) => {
      // Reflect the inserted text into local state so send-gating reads it,
      // then run the same send path used elsewhere.
      setRawInputValue(text);
      rawInputValueRef.current = text;
      sendCurrentValue();
    },
  });

  const inputFunctions = useMemo<InputFunctions>(
    () => ({
      requestFocus: () => {
        const promptLine = promptLineRef.current;
        if (!promptLine) {
          return false;
        }
        promptLine.focus();
        return true;
      },
      hasFocus: () => promptLineRef.current?.getEditor()?.isFocused ?? false,
      setContent: (next) => {
        const promptLine = promptLineRef.current;
        if (!promptLine) {
          throw new Error("Input is not currently rendered");
        }
        promptLine.setContent(next);
      },
      insertContent: (content, options) => {
        const promptLine = promptLineRef.current;
        if (!promptLine) {
          throw new Error("Input is not currently rendered");
        }
        promptLine.insertContent(content, options);
      },
      getEditor: () => promptLineRef.current?.getEditor() ?? null,
    }),
    [],
  );

  React.useImperativeHandle(ref, () => inputFunctions, [inputFunctions]);

  useEffect(() => {
    serviceManager.setInputFunctionsRef(inputFunctions);
    return () => {
      serviceManager.setInputFunctionsRef(null);
    };
  }, [serviceManager, inputFunctions]);

  const effectiveMenuOptions = useMemo<InputMenuOption[] | undefined>(() => {
    if (!menuOptions) {
      return undefined;
    }
    if (!showUploadButton) {
      return menuOptions;
    }
    const uploadOption: InputMenuOption = {
      text: languagePack.input_uploadButtonLabel,
      icon: Attachment16,
      handler: () => fileInputRef.current?.click(),
    };
    return [uploadOption, ...menuOptions];
  }, [menuOptions, showUploadButton, languagePack.input_uploadButtonLabel]);

  if (!isInputVisible) {
    return null;
  }

  const showUploadButtonDisabled = disableUploadButton || disableInput;
  const editorPlaceholder =
    placeholder ||
    (disableInput ? undefined : languagePack.input_placeholder) ||
    "";
  const charCountMessage = overMaxLength
    ? intl.formatMessage(
        { id: "input_maxCharCountExceeded" },
        { max: maxInputChars, current: rawInputValue.length },
      )
    : null;

  return (
    <InputShell rounded={rounded}>
      <PromptLine
        slot="editor"
        ref={promptLineRef}
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

      {charCountMessage && (
        <div slot="field-messaging" role="status" aria-live="polite">
          {charCountMessage}
        </div>
      )}

      {(showUploadButton || effectiveMenuOptions) && (
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
          {effectiveMenuOptions ? (
            <InputActionsMenu
              disabled={disableInput}
              menuOptions={effectiveMenuOptions}
              menuLabel={languagePack.input_actionsMenuLabel}
            />
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

      {/* File uploads — pending file status display */}
      {pendingUploads && pendingUploads.length > 0 && (
        <FileUploads
          slot="file-uploads"
          uploads={pendingUploads}
          removeFileLabel={languagePack.fileSharing_removeButtonTitle}
          uploadingFileLabel={languagePack.fileSharing_statusUploading}
          onFileRemove={handleRemoveFile}
        />
      )}

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
    </InputShell>
  );
}

const InputExport = React.memo(forwardRef(Input));
export { InputExport as Input, InputFunctions };
