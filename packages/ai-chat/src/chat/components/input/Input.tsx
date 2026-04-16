/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  forwardRef,
  Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import InputShell from "@carbon/ai-chat-components/es/react/input-shell.js";
import InputSendControl from "@carbon/ai-chat-components/es/react/input-send-control.js";
import FileUploads from "@carbon/ai-chat-components/es/react/file-uploads.js";
import type {
  CustomListProps,
  FileUpload,
  SuggestionConfig,
  SuggestionItem,
} from "@carbon/ai-chat-components/es/components/input/src/types.js";
import { FileStatusValue } from "@carbon/ai-chat-components/es/components/input/src/types.js";
import type { InputShellElement } from "@carbon/ai-chat-components/es/components/input/index.js";
import actions from "../../store/actions";
import {
  selectInputState,
  selectIsInputToHumanAgent,
} from "../../store/selectors";
import { BusEventType } from "../../../types/events/eventBusTypes";
import { useServiceManager } from "../../hooks/useServiceManager";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { PageObjectId } from "../../../testing/PageObjectId";
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
   * Instructs the text area to take focus.
   * @deprecated Use requestFocus() instead for consistency with focus management pattern
   */
  takeFocus: () => void;

  /**
   * Requests focus on the input field.
   * Follows the generic focus management pattern for web components.
   * @returns {boolean} True if focus was successfully set, false otherwise
   */
  requestFocus: () => boolean;

  /**
   * Returns true if the input field currently has focus.
   * Encapsulates internal focus detection logic.
   * @returns {boolean} True if the input field has focus
   */
  hasFocus: () => boolean;
}

/**
 * Input - Redux-connected container component for the input field.
 *
 * This component composes child components into the InputShell's named slots:
 * - `message-actions` — upload button (future: overflow menu)
 * - `file-uploads` — pending file upload status display
 * - `send-control` — send button / stop streaming button
 *
 * The editor element is created internally by InputShell using ProseMirror.
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

  // Subscribe to suggestion configs from store so runtime changes are picked up
  const [suggestionConfigs, setSuggestionConfigs] = useState<
    SuggestionConfig[]
  >(() => store.getState().config.public.input?.suggestions || []);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const next = store.getState().config.public.input?.suggestions || [];
      setSuggestionConfigs((prev) => (prev !== next ? next : prev));
    });
    return unsubscribe;
  }, [store]);

  // Track if we've announced the keyboard shortcut to avoid repeating it
  const [hasAnnouncedShortcut, setHasAnnouncedShortcut] = useState(false);

  // State for managing autocomplete items
  const [autocompleteItems, setAutocompleteItems] = useState<SuggestionItem[]>(
    [],
  );
  const [activeSuggestionConfig, setActiveSuggestionConfig] =
    useState<SuggestionConfig | null>(null);

  // State for custom list React portal (two-level slot projection)
  const [customListPortal, setCustomListPortal] = useState<{
    reactNode: React.ReactNode;
    hostElement: HTMLDivElement;
  } | null>(null);
  const customListSlotRef = useRef<HTMLSlotElement | null>(null);
  const customListHostRef = useRef<HTMLDivElement | null>(null);

  // Refs for debouncing and tracking
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchGenerationRef = useRef(0);
  // Sentinel value ("\0") distinguishes "never queried" from "empty query"
  const lastQueryRef = useRef<string>("\0");

  // Get tracked input state from Redux if enabled
  const trackedInputState = trackInputState
    ? selectInputState(store.getState())
    : null;

  // Local state for input value (rawValue only — PM doc is internal source of truth)
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

  // Clean up pending fetch timeout on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Clean up custom list portal when suggestion list is dismissed
  useEffect(() => {
    const shouldShow =
      activeSuggestionConfig?.renderCustomList && autocompleteItems.length > 0;

    if (!shouldShow && customListPortal) {
      setCustomListPortal(null);
      customListSlotRef.current?.remove();
      customListHostRef.current?.remove();
    }
  }, [activeSuggestionConfig, autocompleteItems, customListPortal]);

  // Clean up custom list slot + host elements on unmount
  useEffect(() => {
    const slotRef = customListSlotRef;
    const hostRef = customListHostRef;
    return () => {
      slotRef.current?.remove();
      hostRef.current?.remove();
    };
  }, []);

  /**
   * Handle input value changes from the shell.
   * Dispatches to Redux if tracking is enabled.
   */
  const handleInputChange = (event: CustomEvent<{ rawValue: string }>) => {
    const { rawValue } = event.detail;

    setRawInputValue(rawValue);

    if (trackInputState) {
      const isInputToHumanAgent = selectIsInputToHumanAgent(store.getState());
      store.dispatch(
        actions.updateInputState({ rawValue }, isInputToHumanAgent),
      );
    }
  };

  /**
   * Handle send action - clears input and dispatches to Redux if tracking is enabled.
   */
  const handleSend = (event: CustomEvent<{ text: string }>) => {
    const { text } = event.detail;
    onSendInput(text);

    // Reset the value of the field
    setRawInputValue("");

    if (trackInputState) {
      const isInputToHumanAgent = selectIsInputToHumanAgent(store.getState());
      store.dispatch(
        actions.updateInputState({ rawValue: "" }, isInputToHumanAgent),
      );
    }
  };

  /**
   * Handle input focus - announces keyboard shortcut on first focus if enabled.
   */
  const handleInputFocus = () => {
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
      console.error("Error stopping stream:", error);
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

  /**
   * Handle trigger state changes from the shell.
   * Finds matching suggestion config and fetches items.
   */
  const handleTriggerChange = useCallback(
    (
      event: CustomEvent<{
        type: string | null;
        query: string;
        triggerOffset: number;
      } | null>,
    ) => {
      const type = event.detail?.type ?? null;
      const query = event.detail?.query ?? "";

      // Clear any pending fetch
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }

      // If no trigger is active, clear items and config
      if (!type) {
        setAutocompleteItems([]);
        setActiveSuggestionConfig(null);
        lastQueryRef.current = "\0";
        return;
      }

      // Find matching suggestion config by type
      const matchingConfig = suggestionConfigs.find(
        (config: SuggestionConfig) => (config.type ?? "autocomplete") === type,
      );

      if (!matchingConfig) {
        setAutocompleteItems([]);
        setActiveSuggestionConfig(null);
        return;
      }

      setActiveSuggestionConfig(matchingConfig);

      // If query hasn't changed, don't refetch
      if (query === lastQueryRef.current) {
        return;
      }
      lastQueryRef.current = query;

      // Check minQueryLength
      const minLength = matchingConfig.minQueryLength ?? 0;
      if (query.length < minLength) {
        if (matchingConfig.initialItems) {
          setAutocompleteItems(matchingConfig.initialItems);
        } else {
          setAutocompleteItems([]);
        }
        return;
      }

      // Handle static items
      if (Array.isArray(matchingConfig.items)) {
        const filtered = matchingConfig.items.filter((item: SuggestionItem) =>
          item.label.toLowerCase().includes(query.toLowerCase()),
        );
        setAutocompleteItems(filtered);
        return;
      }

      // Handle async items with debouncing
      const debounceMs = matchingConfig.debounceMs ?? 200;
      const gen = ++fetchGenerationRef.current;
      fetchTimeoutRef.current = setTimeout(async () => {
        try {
          if (typeof matchingConfig.items === "function") {
            const items = await matchingConfig.items(query);
            // Only apply results if this is still the latest fetch
            if (gen === fetchGenerationRef.current) {
              setAutocompleteItems(items);
            }
          }
        } catch (error) {
          console.error("Error fetching suggestion items:", error);
          if (gen === fetchGenerationRef.current) {
            setAutocompleteItems([]);
          }
        }
      }, debounceMs);
    },
    [suggestionConfigs],
  );

  /**
   * Handle autocomplete item selection.
   */
  const handleAutocompleteSelect = useCallback(
    (event: CustomEvent<{ item: SuggestionItem }>) => {
      const { item } = event.detail;

      if (activeSuggestionConfig?.onSelect) {
        activeSuggestionConfig.onSelect(item);
      }

      setAutocompleteItems([]);
      setActiveSuggestionConfig(null);
      lastQueryRef.current = "\0";
    },
    [activeSuggestionConfig],
  );

  /**
   * Handle custom list render events from InputShell.
   * When renderCustomList returns a React node (not HTMLElement),
   * AutocompleteListManager emits this event so we can portal-render it.
   *
   * Uses two-level slot projection so the portal host lives in chatWrapper's
   * light DOM (where page CSS applies) while visually appearing inside
   * InputShell's autocomplete-content slot.
   */
  const handleCustomListRender = useCallback(
    (
      event: CustomEvent<{
        reactNode: unknown;
        props: CustomListProps;
      }>,
    ) => {
      const { reactNode } = event.detail;
      const shell = inputShellRef.current;
      if (!shell) {
        return;
      }

      // Navigate to chatWrapper (cds-aichat-react) via shadow root host
      const rootNode = shell.getRootNode();
      const chatWrapper = rootNode instanceof ShadowRoot ? rootNode.host : null;
      if (!chatWrapper) {
        return;
      }

      // Create slot + host pair on first render, reuse thereafter
      if (!customListSlotRef.current || !customListHostRef.current) {
        const slotName = `cds-aichat-custom-list-${Date.now()}`;

        // Slot lives in InputShell's light DOM, projected via autocomplete-content
        const slotEl = document.createElement("slot");
        slotEl.setAttribute("name", slotName);
        slotEl.setAttribute("slot", "autocomplete-content");
        customListSlotRef.current = slotEl;

        // Host lives in chatWrapper's light DOM — page CSS applies here
        const hostEl = document.createElement("div");
        hostEl.setAttribute("slot", slotName);
        customListHostRef.current = hostEl;
      }

      // Ensure both elements are in the DOM
      if (!customListSlotRef.current.parentElement) {
        shell.appendChild(customListSlotRef.current);
      }
      if (!customListHostRef.current.parentElement) {
        chatWrapper.appendChild(customListHostRef.current);
      }

      setCustomListPortal({
        reactNode: reactNode as React.ReactNode,
        hostElement: customListHostRef.current,
      });
    },
    [],
  );

  // Create a ref to the shell element
  const inputShellRef = useRef<InputShellElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Expose the InputFunctions interface via ref
  useImperativeHandle(ref, () => ({
    takeFocus: () => {
      inputShellRef.current?.requestFocus();
    },
    requestFocus: () => {
      return inputShellRef.current?.requestFocus() ?? false;
    },
    hasFocus: () => {
      return inputShellRef.current?.hasFocus?.() ?? false;
    },
  }));

  if (!isInputVisible) {
    return null;
  }

  const hasValidInput =
    Boolean(rawInputValue?.trim()) ||
    (pendingUploads != null &&
      pendingUploads.length > 0 &&
      !pendingUploads.every((u) => u.isError));

  const showUploadButtonDisabled = disableUploadButton || disableInput;

  return (
    <>
      <InputShell
        ref={inputShellRef}
        disabled={disableInput}
        rawValue={disableInput ? "" : rawInputValue}
        placeholder={
          placeholder ||
          (disableInput ? undefined : languagePack.input_placeholder)
        }
        maxLength={maxInputChars}
        suggestionConfigs={suggestionConfigs}
        autocompleteItems={autocompleteItems}
        renderCustomList={activeSuggestionConfig?.renderCustomList}
        data-testid={PageObjectId.INPUT}
        rounded={rounded}
        onChange={handleInputChange}
        onSend={handleSend}
        onFocus={handleInputFocus}
        onTyping={handleTyping}
        onTriggerChange={handleTriggerChange}
        onAutocompleteSelect={handleAutocompleteSelect}
        onCustomListRender={handleCustomListRender}
      >
        {/* Editor is created internally by InputShell via ProseMirror */}

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
          disableSend={disableSend}
          isStopStreamingButtonVisible={isStopStreamingButtonVisible}
          isStopStreamingButtonDisabled={isStopStreamingButtonDisabled}
          buttonLabel={languagePack.input_buttonLabel}
          stopResponseLabel={languagePack.input_stopResponse}
          testId={PageObjectId.INPUT}
          onStopStreaming={handleStopStreaming}
        />
      </InputShell>
      {customListPortal &&
        ReactDOM.createPortal(
          customListPortal.reactNode,
          customListPortal.hostElement,
        )}
    </>
  );
}

const InputExport = React.memo(forwardRef(Input));
export { InputExport as Input, InputFunctions };
