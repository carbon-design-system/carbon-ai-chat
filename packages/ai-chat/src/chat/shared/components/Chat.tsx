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
import { useSelector } from "react-redux";

import MessagesComponent, {
  MessagesComponentClass,
} from "../containers/MessagesComponent";
import { HasServiceManager } from "../hocs/withServiceManager";
import { AppConfig } from "../../../types/state/AppConfig";
import {
  HumanAgentDisplayState,
  HumanAgentState,
  AppState,
  ChatMessagesState,
  FileUpload,
  InputState,
} from "../../../types/state/AppState";
import { AutoScrollOptions } from "../../../types/utilities/HasDoAutoScroll";
import HasIntl from "../../../types/utilities/HasIntl";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../types/messaging/LocalMessageItem";
import ObjectMap from "../../../types/utilities/ObjectMap";
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
import {
  ChatHeaderAvatarConfig,
  InstanceInputElement,
} from "../../../types/instance/ChatInstance";
import { CarbonTheme } from "../../../types/utilities/carbonTypes";
import { LanguagePack } from "../../../types/instance/apiTypes";
import { OverlayPanelName } from "./OverlayPanel";

interface ChatProps extends HasServiceManager, HasIntl {
  languagePack: LanguagePack;
  headerDisplayName: string;
  botName: string;
  config: AppConfig;

  /**
   * The config of the chat header avatar.
   */
  headerAvatarConfig: ChatHeaderAvatarConfig;

  /**
   * The state of the input field.
   */
  inputState: InputState;

  /**
   * This is the global map/registry of all messages in the system by their message IDs. This includes messages with a
   * human agent. Which bucket the messages belong to is controlled by an array of IDs located in each
   * {@link ChatMessagesState}.
   */
  allMessageItemsByID: ObjectMap<LocalMessageItem>;

  /**
   * The state of the messages to display in this chat panel.
   */
  messageState: ChatMessagesState;

  /**
   * Indicates if all the initial messages are ready to be displayed to the user. This includes the welcome message
   * and any messages loaded from the history store.
   */
  isHydrated: boolean;

  /**
   * Any information about the current human agent the user is connected to.
   */
  humanAgentState: HumanAgentState;

  /**
   * The display state for an interaction with a human agent.
   */
  agentDisplayState: HumanAgentDisplayState;

  /**
   * The callback to call when the user enters some text into the field and it needs to be sent. This occurs if the
   * user presses the enter key or clicks the send button.
   */
  onSendInput: (text: string) => void;

  /**
   * The callback that can be called to toggle between the home screen and the bot view.
   */
  onToggleHomeScreen: () => void;

  /**
   * This callback is called when the user clicks the close button.
   */
  onClose: () => void;

  /**
   * This callback is called when the user clicks the close-and-restart button.
   */
  onCloseAndRestart: () => void;

  /**
   * Method to call when restart button is pressed.
   */
  onRestart: () => void;

  /**
   * When Carbon AI chat hydrates there is a loading animation. This value notes that it is complete so any animation
   * behaviors down stream can react.
   */
  isHydrationAnimationComplete?: boolean;

  /**
   * A callback to use to indicate when the user is typing. The user is considered as stopping typing when no input
   * changes have been made for 5 seconds.
   *
   * @param isTyping If true, indicates that the user has started typing. If false, indicates that the user has
   * stopped typing.
   */
  onUserTyping?: (isTyping: boolean) => void;

  /**
   * The current locale.
   */
  locale: string;

  /**
   * Indicates if the AI theme should be used.
   */
  useAITheme: boolean;

  /**
   * Indicates which carbon theme is in use.
   */
  carbonTheme: CarbonTheme;
}

interface ChatState {
  /**
   * Indicates if the panel should be displayed that is used to confirm with the user if he wants to end the chat
   * with an agent.
   */
  showEndChatConfirmation: boolean;

  /**
   * If the chat experiences an uncaught error, this is set to true.
   */
  hasCaughtError: boolean;
}

class Chat extends Component<ChatProps, ChatState> {
  /**
   * Default state.
   */
  public readonly state: Readonly<ChatState> = {
    showEndChatConfirmation: false,
    hasCaughtError: false,
  };

  /**
   * A React ref to the Input component.
   */
  private inputRef: RefObject<InputFunctions> = React.createRef();

  /**
   * A React ref to the Header component.
   */
  private headerRef: RefObject<HasRequestFocus> = React.createRef();

  /**
   * A React ref to the Messages component.
   */
  private messagesRef: RefObject<MessagesComponentClass> = React.createRef();

  /**
   * This is the memoized messages used in this component. This is the step that pulls the messages from
   * the map and puts them in the right order in an array.
   */
  private messagesToArray = createUnmappingMemoizer<LocalMessageItem>();

  async scrollOnHydrationComplete() {
    // Once the hydration is complete, we want to scroll to the very bottom.
    this.doAutoScroll();
  }

  componentDidMount(): void {
    if (this.props.isHydrationAnimationComplete) {
      setTimeout(() => {
        // We need to make sure React has finished rendering updates before we scroll.
        this.scrollOnHydrationComplete();
      });
    }
  }

  componentDidUpdate(prevProps: Readonly<ChatProps>): void {
    const { isHydrationAnimationComplete, humanAgentState } = this.props;

    // If we don't wait for the animation to complete, the auto scroll can not work correctly.
    // Thankfully, we have this property already to look at and kick off the autoscroll.
    if (
      isHydrationAnimationComplete &&
      !prevProps.isHydrationAnimationComplete
    ) {
      setTimeout(() => {
        // We need to make sure React has finished rendering updates before we scroll.
        this.scrollOnHydrationComplete();
      });
    }

    // This covers the case where an agent joins while the confirmation modal is visible.
    const connectingChanged =
      humanAgentState.isConnecting !== prevProps.humanAgentState.isConnecting;
    if (this.state.showEndChatConfirmation && connectingChanged) {
      this.hideConfirmEndChat();
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.serviceManager.actions.errorOccurred(
      createDidCatchErrorData("Chat", error, errorInfo)
    );
    this.setState({ hasCaughtError: true });
  }

  /**
   * The callback that can be called when the end chat confirmation panel should be hidden.
   */
  private hideConfirmEndChat = () => {
    // Hide the modal and then move focus back to the input field.
    this.setState({ showEndChatConfirmation: false });
    setTimeout(() => {
      // The input field may still be disabled until the state change is re-rendered, so defer the focus move.
      this.requestInputFocus();
    });
  };

  /**
   * The callback that can be called when the end chat confirmation panel should be shown.
   */
  private showConfirmEndChat = () => {
    this.setState({ showEndChatConfirmation: true });
  };

  /**
   * The callback that can be called when the end agent chat confirmation panel should be shown.
   */
  private confirmHumanAgentEndChat = () => {
    this.hideConfirmEndChat();
    this.props.serviceManager.humanAgentService.endChat(true);
  };

  /**
   * If we have nothing to focus on correctly in the chat window, we focus on the header. If the header has no buttons
   * available, we can fall back to focusing on the messages scroll handle.
   */
  private requestDefaultFocus = () => {
    if (!this.headerRef?.current?.requestFocus()) {
      doFocusRef(this.messagesRef.current?.scrollHandleRef);
    }
  };

  /**
   * This is a callback function that will request that focus be moved to the main input field where the user types
   * in their requests to the assistant. If the input is currently disabled or hidden, then we will try to focus on
   * a focusable option in the latest responses from the assistant. If that doesn't exist then focus will be moved
   * to the close button instead.
   *
   */
  public requestInputFocus = () => {
    const { agentDisplayState } = this.props;
    try {
      // If the agent banner is visible and the input field is disabled, move focus there.
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
          // This will attempt to move focus to the last output message in the message list. This is intended to cover
          // the use case where the customer has disabled the input field. When the assistant returns a response and
          // there is no input field, the expectation is that something in that response will be focusable and we'll
          // try to move focus to it. If the last message is not a response and the input field is disabled, that
          // means the assistant is processing a request. In that case, we don't want to move focus to a message but
          // rather fallback to something else like the close button.
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
      consoleError("An error occurred in Chat.requestInputFocus", error);
    }
  };

  /**
   * Requests an auto scroll operation to happen on the messages panel. See {@link MessagesComponent#doAutoScroll} for
   * more information.
   */
  public doAutoScroll = (options?: AutoScrollOptions) => {
    this.messagesRef.current?.doAutoScroll(options);
  };

  /**
   * Returns the current scrollBottom value for the message scroll panel.
   */
  public getMessagesScrollBottom = () => {
    return this.messagesRef?.current?.getContainerScrollBottom();
  };

  /**
   * Scrolls to the (full) message with the given ID. Since there may be multiple message items in a given
   * message, this will scroll the first message to the top of the message window.
   *
   * @param messageID The (full) message ID to scroll to.
   * @param animate Whether or not the scroll should be animated. Defaults to true.
   */
  public doScrollToMessage(messageID: string, animate = true) {
    this.messagesRef.current?.doScrollToMessage(messageID, animate);
  }

  /**
   * The callback that is called when the user selects one or more files to be uploaded.
   */
  private onFilesSelectedForUpload = (uploads: FileUpload[]) => {
    const isInputToHumanAgent =
      this.props.agentDisplayState.isConnectingOrConnected;
    if (isInputToHumanAgent) {
      this.props.serviceManager.humanAgentService.filesSelectedForUpload(
        uploads
      );
      // If the user chose a file and multiple files are not allowed, the file input will become disabled so we need to
      // move focus back to the text input.
      if (!this.props.inputState.allowMultipleFileUploads) {
        this.requestInputFocus();
      }
    }
  };

  public getMessageInput(): InstanceInputElement {
    return this.inputRef.current?.getMessageInput();
  }

  /**
   * Determines if the input field should be disabled based on the current props.
   */
  private shouldDisableInput() {
    return (
      this.props.inputState.isReadonly ||
      this.props.agentDisplayState.disableInput
    );
  }

  /**
   * Determines if the send button should be disabled based on the current props. The send button is disabled if the
   * input field should be disabled or if the messages are not yet hydrated (ready to be shown). We let the user
   * type into the input field before the messages are ready to avoid messing with moving focus around, but we don't
   * let them send the message.
   */
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
      botName,
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

    // If there are any files currently selected or being uploaded and multiple files are not allowed, then show the
    // button as disabled.
    const numFiles = files?.length ?? 0;
    const anyCurrentFiles = numFiles > 0 || fileUploadInProgress;
    const showUploadButtonDisabled =
      anyCurrentFiles && !allowMultipleFileUploads;

    return (
      <>
        {isHydrated && (
          <div className="WACMessagesContainer__NonInputContainer">
            <MessagesComponent
              ref={this.messagesRef}
              messageState={messageState}
              localMessageItems={this.messagesToArray(
                messageState.localMessageIDs,
                allMessageItemsByID
              )}
              requestInputFocus={this.requestInputFocus}
              botName={botName}
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
      onCloseAndRestart,
      onRestart,
      onToggleHomeScreen,
      botName,
      headerDisplayName,
      headerAvatarConfig,
    } = this.props;

    const { hasCaughtError } = this.state;

    const className = "WAC";

    return (
      <div className={className}>
        <BotHeader
          ref={this.headerRef}
          onClose={onClose}
          onCloseAndRestart={onCloseAndRestart}
          onRestart={onRestart}
          headerDisplayName={headerDisplayName}
          headerAvatarConfig={headerAvatarConfig}
          onToggleHomeScreen={onToggleHomeScreen}
          enableChatHeaderConfig
          includeWriteableElement
          testIdPrefix={OverlayPanelName.MAIN}
        />
        <NonHeaderBackground />
        <div className="WACPanelContent WAC__ChatNonHeaderContainer">
          {hasCaughtError && (
            <div className="WAC__MessagesErrorHandler">
              <CatastrophicError
                languagePack={languagePack}
                onRestart={onRestart}
                showHeader={false}
                botName={botName}
                headerDisplayName={headerDisplayName}
              />
            </div>
          )}
          {!hasCaughtError && (
            <div className="WAC__messagesAndInputContainer">
              {this.renderMessagesAndInput()}
            </div>
          )}
        </div>
      </div>
    );
  }
}

/**
 * Displays a background that covers the non-header area of the chat.
 */
function NonHeaderBackground() {
  const isVisible = useSelector<AppState>(
    (state) => state.showNonHeaderBackgroundCover
  );
  return isVisible ? (
    <div className="WACBackgroundCover WACBackgroundCover__NonHeader" />
  ) : null;
}

export default injectIntl(Chat, { forwardRef: true });
export { Chat as ChatClass };

export type { ChatProps };
