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
import { HasRequestFocus } from "../../types/utilities/HasRequestFocus";
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
import { BotHeader } from "./header/BotHeader";
import { Input, InputFunctions } from "./input/Input";
import { EndHumanAgentChatModal } from "./modals/EndHumanAgentChatModal";
import { RequestScreenShareModal } from "./modals/RequestScreenShareModal";
import WriteableElement from "./WriteableElement";
import { LanguagePack } from "../../types/config/PublicConfig";
import { OverlayPanelName } from "./OverlayPanel";
import { CarbonTheme } from "../../types/config/PublicConfig";

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
}

interface ChatInterfaceState {
  showEndChatConfirmation: boolean;
  hasCaughtError: boolean;
}

class BotChat extends Component<ChatInterfaceProps, ChatInterfaceState> {
  public readonly state: Readonly<ChatInterfaceState> = {
    showEndChatConfirmation: false,
    hasCaughtError: false,
  };

  private inputRef: RefObject<InputFunctions> = React.createRef();
  private headerRef: RefObject<HasRequestFocus> = React.createRef();
  private messagesRef: RefObject<MessagesComponentClass> = React.createRef();
  private messagesToArray = createUnmappingMemoizer<LocalMessageItem>();

  async scrollOnHydrationComplete() {
    this.doAutoScroll();
  }

  componentDidMount(): void {
    if (this.props.isHydrationAnimationComplete) {
      setTimeout(() => {
        this.scrollOnHydrationComplete();
      });
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
      createDidCatchErrorData("BotChat", error, errorInfo),
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

  private requestDefaultFocus = () => {
    if (!this.headerRef?.current?.requestFocus()) {
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
      consoleError("An error occurred in BotChat.requestInputFocus", error);
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
          testIdPrefix={OverlayPanelName.MAIN}
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
    } = this.props;

    const { hasCaughtError } = this.state;

    return (
      <div className="cds-aichat">
        <BotHeader
          ref={this.headerRef}
          onClose={onClose}
          onRestart={onRestart}
          headerDisplayName={headerDisplayName}
          onToggleHomeScreen={onToggleHomeScreen}
          enableChatHeaderConfig
          includeWriteableElement
          testIdPrefix={OverlayPanelName.MAIN}
        />
        <div className="cds-aichat--non-header-container">
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

export default injectIntl(BotChat, { forwardRef: true });
export { BotChat as ChatClass };
