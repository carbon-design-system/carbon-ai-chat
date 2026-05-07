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
import type { FileUpload } from "@carbon/ai-chat-components/es/components/input/src/types.js";
import { FileStatusValue } from "@carbon/ai-chat-components/es/components/input/src/types.js";
import type { InputShellElement } from "@carbon/ai-chat-components/es/components/input/index.js";
import type { Editor, JSONContent } from "@tiptap/core";
import actions from "../../store/actions";
import {
  selectInputState,
  selectIsInputToHumanAgent,
} from "../../store/selectors";
import { BusEventType } from "../../../types/events/eventBusTypes";
import { useServiceManager } from "../../hooks/useServiceManager";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { PageObjectId } from "../../../testing/PageObjectId";
import { consoleError } from "../../utils/miscUtils";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

// Upload button
import IconButton from "../carbon/IconButton";
import { BUTTON_KIND } from "../carbon/Button";
import Add16 from "@carbon/icons/es/add--large/16.js";
import { carbonIconToReact } from "../../utils/carbonIcon";

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
   */
  onSendInput: (text: string) => void;

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
 * Composes child components into the InputShell's named slots:
 * - `message-actions` — upload button (future: overflow menu)
 * - `file-uploads` — pending file upload status display
 * - `send-control` — send button / stop streaming button
 *
 * The editor is owned by the inner `<cds-aichat-prompt-line>` slotted into
 * the shell. Mention/command/autocomplete/starters/extensions are forwarded
 * to the shell as discrete props; the shell builds the curated Tiptap
 * extension list internally.
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
  const store = serviceManager.store;

  // Subscribe to inputConfig fields the shell needs as discrete props.
  // Memoized snapshots keep prop reference equality stable across renders
  // (the shell rebuilds the editor on extension-array reference change).
  const initialInputConfig = store.getState().config.public.input;

  const [mention, setMention] = useState(() => initialInputConfig?.mention);
  const [command, setCommand] = useState(() => initialInputConfig?.command);
  const [autocomplete, setAutocomplete] = useState(
    () => initialInputConfig?.autocomplete,
  );
  const [starters, setStarters] = useState(() => initialInputConfig?.starters);
  const [hostExtensions, setHostExtensions] = useState(
    () => initialInputConfig?.tiptap?.extensions,
  );
  const [isSendDisabledFromConfig, setIsSendDisabledFromConfig] = useState(() =>
    Boolean(initialInputConfig?.isSendDisabled),
  );

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const next = store.getState().config.public.input;
      setMention((prev) => (prev !== next?.mention ? next?.mention : prev));
      setCommand((prev) => (prev !== next?.command ? next?.command : prev));
      setAutocomplete((prev) =>
        prev !== next?.autocomplete ? next?.autocomplete : prev,
      );
      setStarters((prev) => (prev !== next?.starters ? next?.starters : prev));
      setHostExtensions((prev) =>
        prev !== next?.tiptap?.extensions ? next?.tiptap?.extensions : prev,
      );
      setIsSendDisabledFromConfig((prev) => {
        const flag = Boolean(next?.isSendDisabled);
        return prev !== flag ? flag : prev;
      });
    });
    return unsubscribe;
  }, [store]);

  // OR isSendDisabled from config into the locally-computed disableSend so
  // the existing overMaxLength / in-flight-uploads / streaming gates still
  // apply on top.
  const effectiveDisableSend = disableSend || isSendDisabledFromConfig;

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
      }
    });

    return unsubscribe;
  }, [store, trackInputState]);

  /**
   * Handle input value changes from the shell. Dispatches to Redux if
   * tracking is enabled. `content` is Tiptap JSONContent.
   */
  const handleInputChange = (
    event: CustomEvent<{ rawValue: string; content?: JSONContent }>,
  ) => {
    const { rawValue, content } = event.detail;

    setRawInputValue(rawValue);

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

  /**
   * Handle send action - clears input and dispatches to Redux if tracking is enabled.
   */
  const handleSend = (event: CustomEvent<{ text: string }>) => {
    const { text } = event.detail;
    onSendInput(text);

    setRawInputValue("");

    if (trackInputState) {
      const isInputToHumanAgent = selectIsInputToHumanAgent(store.getState());
      store.dispatch(
        actions.updateInputState({ rawValue: "" }, isInputToHumanAgent),
      );
    }
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
   * Handle typing events from the shell.
   */
  const handleTyping = (event: CustomEvent<{ isTyping: boolean }>) => {
    const { isTyping } = event.detail;
    onUserTyping?.(isTyping);
  };

  // Create a ref to the shell element
  const inputShellRef = useRef<InputShellElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const inputFunctions = useMemo<InputFunctions>(
    () => ({
      requestFocus: () => {
        return inputShellRef.current?.requestFocus() ?? false;
      },
      hasFocus: () => {
        return inputShellRef.current?.hasFocus?.() ?? false;
      },
      setContent: (next) => {
        const shell = inputShellRef.current;
        if (!shell) {
          throw new Error("Input is not currently rendered");
        }
        shell.setContent(next);
      },
      insertContent: (content, options) => {
        const shell = inputShellRef.current;
        if (!shell) {
          throw new Error("Input is not currently rendered");
        }
        shell.insertContent(content, options);
      },
      getEditor: () => {
        return inputShellRef.current?.getEditor?.() ?? null;
      },
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

  const hasValidInput = useMemo(
    () =>
      Boolean(rawInputValue?.trim()) ||
      (pendingUploads != null &&
        pendingUploads.length > 0 &&
        !pendingUploads.every((u) => u.isError)),
    [rawInputValue, pendingUploads],
  );

  if (!isInputVisible) {
    return null;
  }

  const showUploadButtonDisabled = disableUploadButton || disableInput;

  return (
    <InputShell
      ref={inputShellRef}
      disabled={disableInput}
      rawValue={disableInput ? "" : rawInputValue}
      placeholder={
        placeholder ||
        (disableInput ? undefined : languagePack.input_placeholder)
      }
      maxLength={maxInputChars}
      mention={mention}
      command={command}
      autocomplete={autocomplete}
      starters={starters}
      extensions={hostExtensions}
      isSendDisabled={isSendDisabledFromConfig}
      testId={PageObjectId.INPUT}
      rounded={rounded}
      onChange={handleInputChange}
      onSend={handleSend}
      onFocus={handleInputFocus}
      onBlur={handleInputBlur}
      onTyping={handleTyping}
    >
      {/* Editor is created internally by InputShell (slots a prompt-line). */}

      {/* Message actions — upload button (future: overflow menu) */}
      {showUploadButton && (
        <div slot="message-actions">
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
        onStopStreaming={handleStopStreaming}
      />
    </InputShell>
  );
}

const InputExport = React.memo(forwardRef(Input));
export { InputExport as Input, InputFunctions };
