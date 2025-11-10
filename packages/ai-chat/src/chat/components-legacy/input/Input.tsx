/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import Button from "../../components/carbon/Button";
import Send16 from "@carbon/icons/es/send/16.js";
import SendFilled16 from "@carbon/icons/es/send--filled/16.js";
import { carbonIconToReact } from "../../utils/carbonIcon";
import Attachment16 from "@carbon/icons/es/attachment/16.js";
import FileUploaderItem, {
  FILE_UPLOADER_ITEM_SIZE,
  FILE_UPLOADER_ITEM_STATE,
} from "../../components/carbon/FileUploaderItem";
import cx from "classnames";
import React, {
  ChangeEvent,
  forwardRef,
  KeyboardEvent,
  Ref,
  UIEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { StopStreamingButton } from "../../ai-chat-components/react/components/stopStreamingButton/StopStreamingButton";
import { HasServiceManager } from "../../hocs/withServiceManager";
import { useCounter } from "../../hooks/useCounter";
import actions from "../../store/actions";
import { selectIsInputToHumanAgent } from "../../store/selectors";
import { FileUpload } from "../../../types/config/ServiceDeskConfig";
import HasLanguagePack from "../../../types/utilities/HasLanguagePack";
import { IS_MOBILE } from "../../utils/browserUtils";
import { FileStatusValue } from "../../utils/constants";
import { isEnterKey } from "../../utils/domUtils";
import { uuid, UUIDType } from "../../utils/lang/uuid";
import { ListenerList } from "../../utils/ListenerList";
import { isValidForUpload } from "../../utils/miscUtils";
import TextArea from "../responseTypes/text/TextArea";
// Local interface for controlling the raw input element.
interface InstanceInputElement {
  getHTMLElement: () => HTMLElement;
  setValue: (value: string) => void;
  setEnableEnterKey: (isEnabled: boolean) => void;
  addChangeListener: (listener: (value: string) => void) => void;
  removeChangeListener: (listener: (value: string) => void) => void;
}
import { BusEventType } from "../../../types/events/eventBusTypes";
import { PageObjectId } from "../../utils/PageObjectId";
import {
  BUTTON_KIND,
  BUTTON_SIZE,
  BUTTON_TOOLTIP_ALIGNMENT,
  BUTTON_TOOLTIP_POSITION,
  BUTTON_TYPE,
} from "@carbon/web-components/es/components/button/defs.js";

const Send = carbonIconToReact(Send16);
const SendFilled = carbonIconToReact(SendFilled16);
const Attachment = carbonIconToReact(Attachment16);

/**
 * The size of the gap between input changes before we indicate that the user has stopped typing.
 */
const STOP_TYPING_PERIOD = 5000;

/**
 * The maximum number of characters to all the user to enter into the input field.
 */
const INPUT_MAX_CHARS = 10000;

interface InputProps extends HasServiceManager, HasLanguagePack {
  /**
   * Indicates if the input field should be disabled (the user cannot type anything). This will also hide any value
   * that may already be set in the field.
   */
  disableInput: boolean;

  /**
   * Indicates if the input field should be hidden or visible.
   */
  isInputVisible: boolean;

  /**
   * Indicates if the sending a message should be disabled. This will disable the send button as well as the send on
   * enter listener of the input field.
   */
  disableSend: boolean;

  /**
   * The callback to call when the user enters some text into the field, and it needs to be sent. This occurs if the
   * user presses the enter key or clicks the send button.
   *
   * @param text The text that was entered into the input field that should be sent.
   * {@link InstanceInputElement.setOnBeforeSend} callback.
   */
  onSendInput: (text: string) => void;

  /**
   * Indicates if the text area should blur when the text is sent.
   */
  blurOnSend?: boolean;

  /**
   * An optional placeholder to display in the field. If this is not set, then a default value will be used.
   */
  placeholder?: string;

  /**
   * A callback to use to indicate when the user is typing. The user is considered as stopping typing when no input
   * changes have been made for 5 seconds.
   *
   * @param isTyping If true, indicates that the user has started typing. If false, indicates that the user has
   * stopped typing.
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
   * Determines if the "stop streaming" button should be visible. This also indicates that a streamed response can be
   * cancelled.
   */
  isStopStreamingButtonVisible?: boolean;

  /**
   * Determines if the "stop streaming" button should be disabled. The button can be visible and disabled to show that
   * the process of cancelling a streamed response is in progress.
   */
  isStopStreamingButtonDisabled?: boolean;

  /**
   * Maximum number of characters allowed to be typed into the input field.
   */
  maxInputChars?: number;
}

interface InputFunctions {
  /**
   * Returns the {@link InstanceInputElement} object that controls access to the raw input.
   */
  getMessageInput: () => InstanceInputElement;

  /**
   * Instructs the text area to take focus.
   */
  takeFocus: () => void;
}

function Input(props: InputProps, ref: Ref<InputFunctions>) {
  const {
    isInputVisible,
    placeholder,
    disableInput,
    disableSend,
    disableUploadButton,
    pendingUploads,
    allowedFileUploadTypes,
    allowMultipleFileUploads,
    showUploadButton,
    onFilesSelectedForUpload,
    onSendInput,
    blurOnSend,
    serviceManager,
    onUserTyping,
    languagePack,
    isStopStreamingButtonVisible,
    isStopStreamingButtonDisabled,
    maxInputChars,
  } = props;

  const inputID = `${serviceManager.namespace.suffix}-${useCounter()}`;

  // Indicates if the text area currently has focus.
  const [textAreaHasFocus, setTextAreaHasFocus] = useState(false);

  // The current controlled value of the text area.
  const [inputValue, setInputValue] = useState("");

  // Indicates if handling of the enter key is enabled or not. If it's enabled, this component will call the
  // onSendInput prop when a press of the enter key is detected.
  const enterKeyEnabled = useRef(true);

  // Indicates the user is currently typing.
  const isTypingTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // A React ref to the TextArea component.
  const textAreaRef = useRef<TextArea>(undefined);

  // A React ref to the file Input element.
  const fileInputRef = useRef<HTMLInputElement>(undefined);

  // An array of functions that will be called when the text value changes.
  const changeListeners = useRef<ListenerList<[string]>>(
    new ListenerList<[string]>(),
  );

  // The last text value that was sent to the change listeners.
  const lastValue = useRef("");

  // The reusable {@link InstanceInputElement} object that allows access and control over the input.
  const instanceInputElement = useRef(createInstanceInputElement());

  /**
   * This is called when we have detected that the user has stopped typing.
   */
  function doTypingStopped() {
    if (isTypingTimeout.current) {
      clearTimeout(isTypingTimeout.current);
      isTypingTimeout.current = null;
      onUserTyping?.(false);
    }
  }

  /**
   * This is a callback which is called on each keydown event that occurs on the text area. This is used to capture
   * the enter key, so we can send the entered text to the server.
   */
  function onKeyDown(event: KeyboardEvent) {
    if (isEnterKey(event)) {
      if (
        disableSend ||
        !enterKeyEnabled.current ||
        isStopStreamingButtonVisible
      ) {
        // If sending is disabled, stop the field from inserting a newline into the field.
        event.preventDefault();
      } else {
        send(event);
      }
    }
  }

  /**
   * This is a callback which is called when a change event occurs on the textarea inside this input.
   */
  function onChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const inputText = event.target.value;

    if (onUserTyping) {
      if (!isTypingTimeout.current) {
        onUserTyping(true);
      } else {
        clearTimeout(isTypingTimeout.current);
      }
      isTypingTimeout.current = setTimeout(doTypingStopped, STOP_TYPING_PERIOD);
    }

    setInputValue(inputText);
  }

  function send(event: UIEvent) {
    if (doHasValidInput()) {
      event.preventDefault();

      doTypingStopped();

      const text = inputValue.trim();
      onSendInput(text);
      // Reset the value of the field.
      setInputValue("");
      if (blurOnSend) {
        textAreaRef.current.doBlur();
      } else {
        textAreaRef.current.takeFocus();
      }
    }
  }

  /**
   * Called when the input field gets focus.
   */
  function onInputFocus() {
    setTextAreaHasFocus(true);
  }

  /**
   * Called when the input field loses focus.
   */
  function onInputBlur() {
    setTextAreaHasFocus(false);
  }

  /**
   * Instructs this component to put focus into the input text area. This only applies to desktop devices.
   */
  function takeFocus() {
    if (!IS_MOBILE && isInputVisible) {
      textAreaRef.current.takeFocus();
    }
  }

  /**
   * Creates an instance of {@link InstanceInputElement}.
   */
  function createInstanceInputElement(): InstanceInputElement {
    return {
      getHTMLElement: () => textAreaRef?.current?.getHTMLElement(),
      setValue: (value: string) => setInputValue(value),
      setEnableEnterKey: (isEnabled: boolean) => {
        enterKeyEnabled.current = isEnabled;
      },
      addChangeListener: (listener: (value: string) => void) =>
        changeListeners.current.addListener(listener),
      removeChangeListener: (listener: (value: string) => void) =>
        changeListeners.current.removeListener(listener),
    };
  }

  /**
   * The callback that is called when the user removes a file from the upload area.
   */
  function onRemoveFile(fileID: string) {
    const isInputToHumanAgent = selectIsInputToHumanAgent(
      serviceManager.store.getState(),
    );
    serviceManager.store.dispatch(
      actions.removeFileUpload(fileID, isInputToHumanAgent),
    );
    // After we remove the file, we need to move focus back to the input field.
    textAreaRef.current.takeFocus();
  }

  /**
   * The callback that is called when the user selects a file using the file input.
   */
  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const isInputToHumanAgent = selectIsInputToHumanAgent(
      serviceManager.store.getState(),
    );
    const { dispatch } = serviceManager.store;
    const { files } = event.target;
    const newFiles: FileUpload[] = [];
    for (let index = 0; index < files.length; index++) {
      const newFile: FileUpload = {
        id: uuid(UUIDType.FILE),
        status: FileStatusValue.EDIT,
        file: files[index],
      };
      newFiles.push(newFile);
      dispatch(actions.addInputFile(newFile, isInputToHumanAgent));
    }
    onFilesSelectedForUpload?.(newFiles);

    // Clear the file input. We're controlling the file list.
    fileInputRef.current.value = null;
  }

  /**
   * Determines if there is anything valid that the user could send.
   */
  function doHasValidInput() {
    const hasUploads = Boolean(pendingUploads?.length);
    if (hasUploads) {
      if (pendingUploads.find((upload) => !isValidForUpload(upload))) {
        // If there are any files that are in error, the user cannot send the message.
        return false;
      }
    }

    return Boolean(inputValue.trim()) || hasUploads;
  }

  // If the input field becomes disabled, we don't get a blur event so make sure to remove the focus indicator.
  if (textAreaHasFocus && disableInput) {
    setTextAreaHasFocus(false);
  }

  useImperativeHandle(ref, () => ({
    takeFocus,
    getMessageInput: () => instanceInputElement.current,
  }));

  const {
    input_buttonLabel,
    input_placeholder,
    input_ariaLabel,
    input_uploadButtonLabel,
    input_stopResponse,
  } = languagePack;
  const useInputValue = disableInput ? "" : inputValue;
  const hasValidInput = doHasValidInput();
  const showDisabledSend = !hasValidInput || disableInput || disableSend;
  const showUploadButtonDisabled = disableUploadButton || disableInput;
  const uploadButtonID = `cds-aichat--input-container__upload-input-${inputID}`;
  const isRTL = document.dir === "rtl";

  // If the input field is disabled, don't show a placeholder (unless one is provided).
  const usePlaceHolder =
    placeholder || (disableInput ? undefined : input_placeholder);

  if (lastValue.current !== inputValue) {
    lastValue.current = inputValue;
    changeListeners.current.fireListeners(inputValue);
  }

  return (
    isInputVisible && ( // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div className="cds-aichat--input-and-completions">
        <div
          className={cx("cds-aichat--input-container", {
            "cds-aichat--input-container--has-focus": textAreaHasFocus,
            "cds-aichat--input-container--show-upload-button": showUploadButton,
          })}
        >
          <div className="cds-aichat--input-container__left-container">
            <div className="cds-aichat--input-container__text-and-upload">
              {showUploadButton && (
                <div className="cds-aichat--input-container__upload-button-container">
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                  <input
                    ref={fileInputRef}
                    accept={allowedFileUploadTypes}
                    id={uploadButtonID}
                    className="cds-aichat--visually-hidden cds-aichat--input-container__upload-input"
                    type="file"
                    aria-label={input_uploadButtonLabel}
                    onChange={onFileChange}
                    multiple={allowMultipleFileUploads}
                    disabled={showUploadButtonDisabled}
                  />
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                  <label
                    className={cx(
                      "cds-aichat--input-container__upload-button",
                      {
                        "cds-aichat--input-container__upload-button--disabled":
                          showUploadButtonDisabled,
                      },
                    )}
                    htmlFor={uploadButtonID}
                  >
                    <Attachment />
                  </label>
                </div>
              )}
              <TextArea
                autoSize
                ariaLabel={input_ariaLabel}
                disabled={disableInput}
                maxLength={maxInputChars ? maxInputChars : INPUT_MAX_CHARS}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={usePlaceHolder}
                value={useInputValue}
                ref={textAreaRef}
                onFocus={onInputFocus}
                onBlur={onInputBlur}
                testId={PageObjectId.INPUT}
              />
            </div>
            {Boolean(pendingUploads?.length) && (
              <div className="cds-aichat--input-container__files-container">
                {pendingUploads.map((fileUpload, index) => {
                  return (
                    <FileUploaderItem
                      // eslint-disable-next-line react/no-array-index-key
                      key={index}
                      iconDescription={
                        languagePack.fileSharing_removeButtonTitle
                      }
                      state={FILE_UPLOADER_ITEM_STATE.EDIT}
                      errorSubject={fileUpload.errorMessage}
                      invalid={fileUpload.isError}
                      size={FILE_UPLOADER_ITEM_SIZE.SMALL}
                      onDelete={() => onRemoveFile(fileUpload.id)}
                    >
                      {fileUpload.file.name}
                    </FileUploaderItem>
                  );
                })}
              </div>
            )}
          </div>

          <div className="cds-aichat--input-container__send-button-container">
            {isStopStreamingButtonVisible ? (
              <StopStreamingButton
                label={input_stopResponse}
                disabled={isStopStreamingButtonDisabled}
                tooltipAlignment={isRTL ? "top-left" : "top-right"}
                onClick={async () => {
                  const { store } = serviceManager;
                  store.dispatch(actions.setStopStreamingButtonDisabled(true));
                  await serviceManager.fire({
                    type: BusEventType.STOP_STREAMING,
                  });
                  // Also cancel the current message request to abort the signal
                  await serviceManager.messageService.cancelCurrentMessageRequest();
                  textAreaRef.current.takeFocus();
                }}
              />
            ) : (
              <Button
                className="cds-aichat--input-container__send-button"
                kind={BUTTON_KIND.GHOST}
                size={BUTTON_SIZE.SMALL}
                type={BUTTON_TYPE.BUTTON}
                onClick={send}
                aria-label={input_buttonLabel}
                disabled={showDisabledSend}
                tooltip-text={input_buttonLabel}
                tooltipAlignment={
                  isRTL
                    ? BUTTON_TOOLTIP_ALIGNMENT.START
                    : BUTTON_TOOLTIP_ALIGNMENT.END
                }
                tooltipPosition={BUTTON_TOOLTIP_POSITION.TOP}
                data-testid={PageObjectId.INPUT_SEND}
              >
                {hasValidInput ? (
                  <SendFilled slot="icon" />
                ) : (
                  <Send slot="icon" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  );
}

const InputExport = React.memo(forwardRef(Input));
export { InputExport as Input, InputFunctions };
