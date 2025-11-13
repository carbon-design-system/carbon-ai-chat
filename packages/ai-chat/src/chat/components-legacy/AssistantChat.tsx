/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { Component, RefObject } from "react";
import { injectIntl } from "react-intl";

import MessagesComponent, { MessagesComponentClass } from "./MessagesComponent";
import { HasServiceManager } from "../hocs/withServiceManager";
import { AppConfig } from "../../types/state/AppConfig";
import {
  HumanAgentDisplayState,
  HumanAgentState,
  ChatMessagesState,
  FileUpload,
  InputState,
} from "../../types/state/AppState";
import { AutoScrollOptions } from "../../types/utilities/HasDoAutoScroll";
import HasIntl from "../../types/utilities/HasIntl";
import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
import ObjectMap from "../../types/utilities/ObjectMap";
import { WriteableElementName } from "../utils/constants";
import {
  doFocusRef,
  focusOnFirstFocusableItemInArrayOfElements,
} from "../utils/domUtils";
import { createUnmappingMemoizer } from "../utils/memoizerUtils";
import { consoleError, createDidCatchErrorData } from "../utils/miscUtils";
import { CatastrophicError } from "./CatastrophicError";
import { AssistantHeader } from "./header/AssistantHeader";
import { Input, InputFunctions } from "./input/Input";
import { EndHumanAgentChatModal } from "./modals/EndHumanAgentChatModal";
import { RequestScreenShareModal } from "./modals/RequestScreenShareModal";
import WriteableElement from "./WriteableElement";
import { LanguagePack } from "../../types/config/PublicConfig";
import { CarbonTheme } from "../../types/config/PublicConfig";
import { PageObjectId } from "../utils/PageObjectId";

interface ChatInterfaceProps extends HasServiceManager, HasIntl {
  languagePack: LanguagePack;
  headerDisplayName: string;
  assistantName: string;
  config: AppConfig;
  inputState: InputState;
  allMessageItemsByID: ObjectMap<LocalMessageItem>;
  messageState: ChatMessagesState;
  isHydrated: boolean;
  humanAgentState: HumanAgentState;
  agentDisplayState: HumanAgentDisplayState;
  onSendInput: (text: string) => void;
  onToggleHomeScreen: () => void;
  onClose: () => void;
  onRestart: () => void;
  isHydrationAnimationComplete?: boolean;
  onUserTyping?: (isTyping: boolean) => void;
  locale: string;
  useAITheme: boolean;
  carbonTheme: CarbonTheme;
  shouldHideChatContentForPanel?: boolean;
}

interface ChatInterfaceState {
  showEndChatConfirmation: boolean;
  hasCaughtError: boolean;
}

class AssistantChat extends Component<ChatInterfaceProps, ChatInterfaceState> {
  public readonly state: Readonly<ChatInterfaceState> = {
    showEndChatConfirmation: false,
    hasCaughtError: false,
  };

  private inputRef: RefObject<InputFunctions | null> = React.createRef();
  private messagesRef: RefObject<MessagesComponentClass | null> =
    React.createRef();
  private messagesToArray = createUnmappingMemoizer<LocalMessageItem>();
  private headerRef: RefObject<HTMLDivElement | null> = React.createRef();
  private headerResizeObserver: ResizeObserver | null = null;

  async scrollOnHydrationComplete() {
    this.doAutoScroll();
  }

  componentDidMount(): void {
    if (this.props.isHydrationAnimationComplete) {
      setTimeout(() => {
        this.scrollOnHydrationComplete();
      });
    }

    // Set up ResizeObserver to track header height
    if (this.headerRef.current) {
      this.headerResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.contentRect.height;
          // Set CSS variable on the widget content container (parent of panels and chat)
          const container = entry.target.closest(
            ".cds-aichat--widget--content",
          );
          if (container) {
            (container as HTMLElement).style.setProperty(
              "--cds-aichat--header-height",
              `${height}px`,
            );
          }
        }
      });
      this.headerResizeObserver.observe(this.headerRef.current);
    }
  }

  componentWillUnmount(): void {
    if (this.headerResizeObserver) {
      this.headerResizeObserver.disconnect();
      this.headerResizeObserver = null;
    }
  }

  componentDidUpdate(prevProps: Readonly<ChatInterfaceProps>): void {
    const { isHydrationAnimationComplete, humanAgentState } = this.props;

    if (
      isHydrationAnimationComplete &&
      !prevProps.isHydrationAnimationComplete
    ) {
      setTimeout(() => {
        this.scrollOnHydrationComplete();
      });
    }

    const connectingChanged =
      humanAgentState.isConnecting !== prevProps.humanAgentState.isConnecting;
    if (this.state.showEndChatConfirmation && connectingChanged) {
      this.hideConfirmEndChat();
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.serviceManager.actions.errorOccurred(
      createDidCatchErrorData("AssistantChat", error, errorInfo),
    );
    this.setState({ hasCaughtError: true });
  }

  private hideConfirmEndChat = () => {
    this.setState({ showEndChatConfirmation: false });
    setTimeout(() => {
      this.requestInputFocus();
    });
  };

  private showConfirmEndChat = () => {
    this.setState({ showEndChatConfirmation: true });
  };

  private confirmHumanAgentEndChat = () => {
    this.hideConfirmEndChat();
    this.props.serviceManager.humanAgentService.endChat(true);
  };

  private requestDefaultFocus = async () => {
    // Wait a short delay to check if the input becomes available
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Double-check if input is now available (allow focusing even if disabled)
    if (this.inputRef.current && this.props.inputState.fieldVisible) {
      this.inputRef.current.takeFocus();
    } else {
      // Skip header and fallback directly to messages scroll area
      doFocusRef(this.messagesRef.current?.scrollHandleRef);
    }
  };

  public requestInputFocus = () => {
    const { agentDisplayState } = this.props;
    try {
      if (
        agentDisplayState.isConnectingOrConnected &&
        agentDisplayState.disableInput
      ) {
        if (this.messagesRef.current.requestHumanAgentBannerFocus()) {
          return;
        }
      }
      if (this.inputRef.current) {
        if (this.props.inputState.fieldVisible && !this.shouldDisableInput()) {
          this.inputRef.current.takeFocus();
        } else {
          const htmlElements =
            this.messagesRef.current.getLastOutputMessageElements();
          if (!focusOnFirstFocusableItemInArrayOfElements(htmlElements)) {
            this.requestDefaultFocus();
          }
        }
      } else {
        this.requestDefaultFocus();
      }
    } catch (error) {
      consoleError(
        "An error occurred in AssistantChat.requestInputFocus",
        error,
      );
    }
  };

  public doAutoScroll = (options?: AutoScrollOptions) => {
    this.messagesRef.current?.doAutoScroll(options);
  };

  public getMessagesScrollBottom = () => {
    return this.messagesRef?.current?.getContainerScrollBottom();
  };

  public doScrollToMessage(messageID: string, animate = true) {
    this.messagesRef.current?.doScrollToMessage(messageID, animate);
  }

  private onFilesSelectedForUpload = (uploads: FileUpload[]) => {
    const isInputToHumanAgent =
      this.props.agentDisplayState.isConnectingOrConnected;
    if (isInputToHumanAgent) {
      this.props.serviceManager.humanAgentService.filesSelectedForUpload(
        uploads,
      );
      if (!this.props.inputState.allowMultipleFileUploads) {
        this.requestInputFocus();
      }
    }
  };

  private shouldDisableInput() {
    return (
      this.props.inputState.isReadonly ||
      this.props.agentDisplayState.disableInput
    );
  }

  private shouldDisableSend() {
    const { isHydrated } = this.props;
    return this.shouldDisableInput() || !isHydrated;
  }

  private renderMessagesAndInput() {
    const {
      languagePack,
      messageState,
      intl,
      config,
      allMessageItemsByID,
      isHydrated,
      serviceManager,
      inputState,
      onUserTyping,
      humanAgentState,
      assistantName,
      onSendInput,
      locale,
      useAITheme,
      carbonTheme,
      agentDisplayState,
    } = this.props;
    const {
      fieldVisible,
      files,
      allowFileUploads,
      allowedFileUploadTypes,
      allowMultipleFileUploads,
      stopStreamingButtonState,
    } = inputState;
    const { fileUploadInProgress } = humanAgentState;
    const { inputPlaceholderKey } = agentDisplayState;

    const numFiles = files?.length ?? 0;
    const anyCurrentFiles = numFiles > 0 || fileUploadInProgress;
    const showUploadButtonDisabled =
      anyCurrentFiles && !allowMultipleFileUploads;

    return (
      <>
        {isHydrated && (
          <div className="cds-aichat--messages-container__non-input-container">
            <MessagesComponent
              ref={this.messagesRef}
              messageState={messageState}
              localMessageItems={this.messagesToArray(
                messageState.localMessageIDs,
                allMessageItemsByID,
              )}
              requestInputFocus={this.requestInputFocus}
              assistantName={assistantName}
              intl={intl}
              onEndHumanAgentChat={this.showConfirmEndChat}
              locale={locale}
              useAITheme={useAITheme}
              carbonTheme={carbonTheme}
            />
          </div>
        )}
        <WriteableElement
          slotName={WriteableElementName.BEFORE_INPUT_ELEMENT}
          id={`beforeInputElement${serviceManager.namespace.suffix}`}
        />
        <Input
          ref={this.inputRef}
          languagePack={languagePack}
          serviceManager={serviceManager}
          disableInput={this.shouldDisableInput()}
          disableSend={this.shouldDisableSend()}
          isInputVisible={fieldVisible}
          onSendInput={onSendInput}
          onUserTyping={onUserTyping}
          showUploadButton={allowFileUploads}
          disableUploadButton={showUploadButtonDisabled}
          allowedFileUploadTypes={allowedFileUploadTypes}
          allowMultipleFileUploads={allowMultipleFileUploads}
          pendingUploads={files}
          onFilesSelectedForUpload={this.onFilesSelectedForUpload}
          placeholder={languagePack[inputPlaceholderKey]}
          isStopStreamingButtonVisible={stopStreamingButtonState.isVisible}
          isStopStreamingButtonDisabled={stopStreamingButtonState.isDisabled}
          maxInputChars={config.public.input?.maxInputCharacters}
        />
        {this.state.showEndChatConfirmation && (
          <EndHumanAgentChatModal
            onConfirm={this.confirmHumanAgentEndChat}
            onCancel={this.hideConfirmEndChat}
          />
        )}
        {this.props.humanAgentState.showScreenShareRequest && (
          <RequestScreenShareModal />
        )}
      </>
    );
  }

  public render() {
    const {
      languagePack,
      onClose,
      onRestart,
      onToggleHomeScreen,
      assistantName,
      headerDisplayName,
      shouldHideChatContentForPanel,
    } = this.props;

    const { hasCaughtError } = this.state;

    return (
      <div data-testid={PageObjectId.MAIN_PANEL} className="cds-aichat">
        <div
          ref={this.headerRef}
          className={
            shouldHideChatContentForPanel ? "cds-aichat--header-with-panel" : ""
          }
        >
          <AssistantHeader
            onClose={onClose}
            onRestart={onRestart}
            headerDisplayName={headerDisplayName}
            onToggleHomeScreen={onToggleHomeScreen}
            enableChatHeaderConfig
            includeWriteableElement
          />
        </div>
        <div
          className="cds-aichat--non-header-container"
          {...(shouldHideChatContentForPanel ? { inert: true } : {})}
        >
          <div className="cds-aichat--panel-content cds-aichat--non-header-container">
            {hasCaughtError && (
              <div className="cds-aichat--messages-error-handler">
                <CatastrophicError
                  languagePack={languagePack}
                  onRestart={onRestart}
                  showHeader={false}
                  assistantName={assistantName}
                  headerDisplayName={headerDisplayName}
                />
              </div>
            )}
            {!hasCaughtError && (
              <div className="cds-aichat--messages-and-input-container">
                {this.renderMessagesAndInput()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default injectIntl(AssistantChat, { forwardRef: true });
export { AssistantChat as ChatClass };
