/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from "lodash-es/cloneDeep.js";
import merge from "lodash-es/merge.js";
import { DeepPartial } from "../../../types/utilities/DeepPartial";

import inputItemToLocalItem from "../../schema/inputItemToLocalItem";
import {
  createLocalMessageForInlineError,
  outputItemToLocalItem,
} from "../../schema/outputItemToLocalItem";
import actions from "../../store/actions";
import {
  agentUpdateIsTyping,
  endChat,
  setAgentAvailability,
  setHumanAgentJoined,
  setHumanAgentLeftChat,
  setIsConnecting,
  setIsReconnecting,
  setIsScreenSharing,
  setPersistedServiceDeskState,
  setShowScreenShareRequest,
  updateCapabilities,
  updateFilesUploadInProgress,
} from "../../store/humanAgentActions";
import { FileUpload } from "../../../types/config/ServiceDeskConfig";
import {
  LocalMessageItem,
  MessageErrorState,
} from "../../../types/messaging/LocalMessageItem";
import { FileStatusValue } from "../../utils/constants";
import { deepFreeze } from "../../utils/lang/objectUtils";
import { resolveOrTimeout } from "../../utils/lang/promiseUtils";
import {
  addDefaultsToMessage,
  createMessageRequestForFileUpload,
  createMessageRequestForText,
  createMessageResponseForText,
} from "../../utils/messageUtils";
import { assertType, consoleError, debugLog } from "../../utils/miscUtils";
import {
  ResolvablePromise,
  resolvablePromise,
} from "../../utils/resolvablePromise";
import { ServiceManager } from "../ServiceManager";
import {
  HumanAgentsOnlineStatus,
  CreateHumanAgentServiceFunction,
  HumanAgentService,
} from "./HumanAgentService";
import {
  addHumanAgentEndChatMessage,
  addAssistantReturnMessage,
  addMessages,
  createHumanAgentLocalMessage,
  LocalAndOriginalMessagesPair,
  toPair,
} from "./humanAgentUtils";
import {
  HumanAgentMessageType,
  ResponseUserProfile,
  ConnectToHumanAgentItem,
  Message,
  MessageResponse,
  TextItem,
} from "../../../types/messaging/Messages";
import {
  AdditionalDataToAgent,
  AgentAvailability,
  ErrorType,
  ScreenShareState,
  ServiceDesk,
  ServiceDeskCallback,
  ServiceDeskCapabilities,
  ServiceDeskErrorInfo,
  ServiceDeskFactoryParameters,
} from "../../../types/config/ServiceDeskConfig";
import {
  BusEventHumanAgentPreEndChat,
  BusEventHumanAgentPreStartChat,
  BusEventType,
} from "../../../types/events/eventBusTypes";

/**
 * The amount of time to wait when a message is sent to the service desk before displaying a warning if the service
 * desk doesn't indicate the message was received.
 */
const SEND_TIMEOUT_WARNING_MS = 3000;

/**
 * The amount of time to wait when a message is sent to the service desk before displaying an error if the service
 * desk doesn't indicate the message was received.
 */
const SEND_TIMEOUT_ERROR_MS = 20000;

/**
 * The amount of time to wait before an attempt to end a chat times out, and we close it anyway.
 */
const END_CHAT_TIMEOUT_MS = 5000;

/**
 * The amount of time to wait before a check for agent availability times out if there's no answer.
 */
const AVAILABILITY_TIMEOUT_MS = 5000;

/**
 * The amount of time to wait before displaying the "bot returns" message.
 */
const BOT_RETURN_DELAY = 1500;

const {
  FROM_USER,
  RECONNECTED,
  DISCONNECTED,
  HUMAN_AGENT_ENDED_CHAT,
  HUMAN_AGENT_JOINED,
  USER_ENDED_CHAT,
  CHAT_WAS_ENDED,
  TRANSFER_TO_HUMAN_AGENT,
  HUMAN_AGENT_LEFT_CHAT,
  RELOAD_WARNING,
  SHARING_CANCELLED,
  SHARING_DECLINED,
  SHARING_ACCEPTED,
  SHARING_REQUESTED,
  SHARING_ENDED,
} = HumanAgentMessageType;

class HumanAgentServiceImpl implements HumanAgentService {
  /**
   * The service manager to use to access services.
   */
  private serviceManager: ServiceManager;

  /**
   * The instance of the service desk wrapper used to communicate with the actual service desk.
   */
  private serviceDesk: ServiceDesk;

  /**
   * This is the callback handed to the service desk that it will use to send information back to us.
   */
  private serviceDeskCallback: ServiceDeskCallbackImpl<any>;

  /**
   * Indicates if a chat has started (the startChat function has been called). It does not necessarily mean that an
   * agent has joined and a full chat is in progress.
   */
  chatStarted = false;

  /**
   * Indicates if the service desk has gotten into a disconnected error state.
   */
  showingDisconnectedError = false;

  /**
   * Indicates if an agent is currently typing.
   */
  isHumanAgentTyping = false;

  /**
   * The timer that is waiting for an agent to join. When this timer fires, the chat will be ended and an error will
   * be displayed.
   */
  waitingForHumanAgentJoinedTimer: ReturnType<typeof setTimeout>;

  /**
   * The current set of files that are being uploaded.
   */
  uploadingFiles = new Set<string>();

  /**
   * If we are displaying a screen sharing request to the user, this Promise is used to resolve the user's response.
   */
  screenShareRequestPromise: ResolvablePromise<ScreenShareState>;

  /**
   * We only want to show the refresh/leave warning when the first agent joins, so we use this boolean to track if the
   * warning has been shown.
   */
  showLeaveWarning = true;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * If a custom service desk is configured, returns the name.
   */
  public getCustomServiceDeskName() {
    return this.serviceManager.store.getState().config.public.serviceDeskFactory
      ? this.serviceDesk.getName?.()
      : undefined;
  }

  /**
   * Initializes this service. This will create the service desk instance that can be used for communicating with
   * service desks.
   */
  public async initialize() {
    if (this.serviceDesk) {
      throw new Error("A service desk has already been created!");
    }

    const { store, instance } = this.serviceManager;
    const state = store.getState();
    const { config, persistedToBrowserStorage } = state;
    const serviceDeskState = cloneDeep(
      persistedToBrowserStorage.humanAgentState.serviceDeskState,
    );

    this.serviceDeskCallback = new ServiceDeskCallbackImpl(
      this.serviceManager,
      this,
    );

    if (config.public.serviceDeskFactory) {
      // A custom service desk factory was provided so use that to create the service desk.
      const parameters: ServiceDeskFactoryParameters = {
        callback: this.serviceDeskCallback,
        instance,
        persistedState: serviceDeskState,
      };
      this.serviceDesk = await config.public.serviceDeskFactory(parameters);
      validateCustomServiceDesk(this.serviceDesk);
      debugLog("Initializing a custom service desk");
    }

    // If the service desk supports reconnecting, we don't need to show this warning.
    this.showLeaveWarning = !this.serviceDesk?.reconnect;
  }

  /**
   * Begins a chat between the current user and the currently configured service desk. This may not be called if
   * there is already a service desk being used.
   *
   * @param localConnectMessage The specific localMessage caused the connection to an agent. It will
   * contain specific information to send to the service desk as part of the connection. This can include things
   * like a message to display to a human agent.
   * @param originalMessage The full original message that this Connect to Agent item belongs to.
   */
  public async startChat(
    localConnectMessage: LocalMessageItem<ConnectToHumanAgentItem>,
    originalMessage: Message,
  ): Promise<void> {
    if (!this.serviceDesk) {
      // No service desk connected.
      throw new Error("A service desk has not been configured.");
    }

    if (
      this.serviceManager.store.getState().persistedToBrowserStorage
        .humanAgentState.isSuspended
    ) {
      // If the user is currently engaged in a conversation with an agent that is suspended and we start a new chat, we
      // need to end the current conversation first. We do still want to generate the "agent left" message however but
      // not the "bot return" message that occurs on a delay.
      await this.endChat(true, true, false);
    }

    if (this.chatStarted) {
      throw new Error(
        "A chat is already running. A call to endChat must be made before a new chat can start.",
      );
    }

    const { serviceManager } = this;

    try {
      this.chatStarted = true;
      this.isHumanAgentTyping = false;
      this.uploadingFiles.clear();
      this.serviceManager.store.dispatch(
        updateFilesUploadInProgress(this.uploadingFiles.size > 0),
      );

      // Fire off the pre-start event.
      const event: BusEventHumanAgentPreStartChat = {
        type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
        message: originalMessage as MessageResponse,
      };
      await serviceManager.fire(event);

      if (event.cancelStartChat) {
        // Abort the connecting.
        this.chatStarted = false;
        await this.fireEndChat(false, true);
        serviceManager.store.dispatch(setIsConnecting(false, null));

        return;
      }

      const agentJoinTimeout =
        serviceManager.store.getState().config.public.serviceDesk
          ?.agentJoinTimeoutSeconds;
      if (agentJoinTimeout) {
        this.waitingForHumanAgentJoinedTimer = setTimeout(
          () => this.handleHumanAgentJoinedTimeout(),
          agentJoinTimeout * 1000,
        );
      }

      serviceManager.store.dispatch(
        setIsConnecting(true, localConnectMessage.ui_state.id),
      );

      await this.serviceDesk.startChat(originalMessage as MessageResponse, {
        preStartChatPayload: event.preStartChatPayload,
      });
    } catch (error) {
      consoleError(
        "[startChat] An error with the service desk occurred.",
        error,
      );
      // If it failed to start, then stop connecting and clear the service desk.
      if (this.serviceDeskCallback) {
        await this.serviceDeskCallback.setErrorStatus({
          type: ErrorType.CONNECTING,
          logInfo: error,
        });
      }

      serviceManager.store.dispatch(setIsConnecting(false, null));
      this.chatStarted = false;
      this.cancelHumanAgentJoinedTimer();

      throw error;
    }
  }

  /**
   * Fires the {@link BusEventType.HUMAN_AGENT_PRE_END_CHAT} event. The event fired is returned which can contain information
   * added by a listener.
   */
  async firePreEndChat(
    endedByHumanAgent: boolean,
  ): Promise<BusEventHumanAgentPreEndChat> {
    // Before ending the chat, fire an event.
    const event: BusEventHumanAgentPreEndChat = {
      type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      endedByHumanAgent,
      preEndChatPayload: null as unknown,
      cancelEndChat: false,
    };

    await this.serviceManager.fire(event);

    return event;
  }

  /**
   * Fires the {@link BusEventType.HUMAN_AGENT_END_CHAT} event.
   */
  async fireEndChat(endedByHumanAgent: boolean, requestCancelled: boolean) {
    // Before ending the chat, fire an event.
    await this.serviceManager.fire({
      type: BusEventType.HUMAN_AGENT_END_CHAT,
      endedByHumanAgent,
      requestCancelled,
    });
  }

  /**
   * Tells the service desk to terminate the chat.
   *
   * @param endedByUser Indicates if the chat is being ended as a result of the user or if it was ended
   * programmatically from an instance method.
   * @param showHumanAgentLeftMessage Indicates if the chat should show the "agent left" message.
   * @param showAssistantReturnMessage Indicates if the chat should show the "bot return" message.
   * @returns Returns a Promise that resolves when the service desk has successfully handled the call.
   */
  public async endChat(
    endedByUser: boolean,
    showHumanAgentLeftMessage = true,
    showAssistantReturnMessage = true,
  ): Promise<void> {
    if (!this.chatStarted || !this.serviceDesk) {
      // Already ended or no service desk.
      return;
    }

    const { isConnected } = this.persistedHumanAgentState();
    let event: BusEventHumanAgentPreEndChat;
    if (isConnected) {
      event = await this.firePreEndChat(false);
      if (event.cancelEndChat) {
        return;
      }
    }

    const endMessageType = endedByUser ? USER_ENDED_CHAT : CHAT_WAS_ENDED;
    await this.doEndChat(
      false,
      event?.preEndChatPayload,
      showHumanAgentLeftMessage,
      showAssistantReturnMessage,
      endMessageType,
    );
  }

  /**
   * This function will end the chat with a service class and clear the service state for it.
   */
  async doEndChat(
    endedByHumanAgent: boolean,
    preEndChatPayload: unknown,
    showHumanAgentLeftMessage: boolean,
    showAssistantReturnMessage: boolean,
    agentEndChatMessageType: HumanAgentMessageType,
  ): Promise<void> {
    const { isConnected } = this.persistedHumanAgentState();
    const wasSuspended = this.isSuspended();

    this.cancelHumanAgentJoinedTimer();
    this.closeScreenShareRequestModal(ScreenShareState.CANCELLED);

    try {
      await resolveOrTimeout(
        this.serviceDesk.endChat({ endedByHumanAgent, preEndChatPayload }),
        END_CHAT_TIMEOUT_MS,
      );
    } catch (error) {
      consoleError(
        "[doEndChat] An error with the service desk occurred.",
        error,
      );
    }

    if (isConnected && showHumanAgentLeftMessage) {
      const { responseUserProfile } = this.persistedHumanAgentState();
      await addHumanAgentEndChatMessage(
        agentEndChatMessageType,
        responseUserProfile,
        true,
        wasSuspended,
        this.serviceManager,
      );
    }

    this.chatStarted = false;
    this.isHumanAgentTyping = false;
    this.serviceManager.store.dispatch(endChat());

    await this.fireEndChat(endedByHumanAgent, !isConnected);

    if (isConnected && showAssistantReturnMessage) {
      await addAssistantReturnMessage(
        BOT_RETURN_DELAY,
        wasSuspended,
        this.serviceManager,
      );
    }
  }

  /**
   * Sends a message to the agent in the service desk.
   *
   * @param text The message from the user.
   * @param uploads An optional set of files to upload.
   * @returns Returns a Promise that resolves when the service desk has successfully handled the call.
   */
  public async sendMessageToAgent(
    text: string,
    uploads: FileUpload[],
  ): Promise<void> {
    if (!this.serviceDesk || !this.chatStarted) {
      // No service desk connected.
      return;
    }

    const { serviceManager } = this;
    deepFreeze(uploads);

    const originalMessage = createMessageRequestForText(text);
    originalMessage.input.agent_message_type = FROM_USER;

    // Fire the pre:send event that will allow code to customize the message.
    await serviceManager.fire({
      type: BusEventType.HUMAN_AGENT_PRE_SEND,
      data: originalMessage,
      files: uploads,
    });

    // Add the outgoing message to the store immediately.
    const textMessage: LocalMessageItem<TextItem> = inputItemToLocalItem(
      originalMessage,
      originalMessage.input.text,
    );
    const localMessageID = textMessage.ui_state.id;

    const pairs: LocalAndOriginalMessagesPair[] = [];

    if (textMessage.item.text) {
      pairs.push(toPair([textMessage], originalMessage));
    }

    // Add a message for each file upload.
    uploads.forEach((upload) => {
      // Note that we're going to reuse the file ID for the MessageRequest and LocalMessage to make it easier to
      // locate the objects when we need to update their states.
      const uploadOriginalMessage = createMessageRequestForFileUpload(upload);
      const uploadLocalMessage: LocalMessageItem = inputItemToLocalItem(
        uploadOriginalMessage,
        uploadOriginalMessage.input.text,
        upload.id,
      );
      pairs.push(toPair([uploadLocalMessage], uploadOriginalMessage));

      this.uploadingFiles.add(upload.id);
    });
    this.serviceManager.store.dispatch(
      updateFilesUploadInProgress(this.uploadingFiles.size > 0),
    );

    await addMessages(pairs, !this.isSuspended(), serviceManager);

    // Start some timeouts to display a warning or error if the service desk doesn't indicate if the message was
    // sent successfully (or it failed).
    let messageSucceeded = false;
    let messageFailed = false;
    setTimeout(() => {
      if (!messageSucceeded && !messageFailed) {
        this.setMessageErrorState(
          textMessage.fullMessageID,
          MessageErrorState.RETRYING,
        );
      }
    }, SEND_TIMEOUT_WARNING_MS);
    setTimeout(() => {
      if (!messageSucceeded) {
        this.setMessageErrorState(
          textMessage.fullMessageID,
          MessageErrorState.FAILED,
        );
      }
    }, SEND_TIMEOUT_ERROR_MS);

    const additionalData: AdditionalDataToAgent = {
      filesToUpload: uploads,
    };

    try {
      // Send the message to the service desk.
      await this.serviceDesk.sendMessageToAgent(
        originalMessage,
        localMessageID,
        additionalData,
      );
      messageSucceeded = true;
      this.setMessageErrorState(
        textMessage.fullMessageID,
        MessageErrorState.NONE,
      );

      await serviceManager.fire({
        type: BusEventType.HUMAN_AGENT_SEND,
        data: originalMessage,
        files: uploads,
      });
    } catch (error) {
      messageFailed = true;
      consoleError(
        "[sendMessageToAgent] An error with the service desk occurred.",
        error,
      );
      this.setMessageErrorState(
        textMessage.fullMessageID,
        MessageErrorState.FAILED,
      );
    }
  }

  /**
   * Indicates that the user has selected some files to be uploaded but that the user has not yet chosen to send
   * them to the agent.
   */
  public filesSelectedForUpload(uploads: FileUpload[]) {
    if (!this.serviceDesk || !this.chatStarted) {
      // No service desk connected.
      return;
    }

    try {
      this.serviceDesk.filesSelectedForUpload?.(uploads);
    } catch (error) {
      consoleError(
        "[userReadMessages] An error with the service desk occurred.",
        error,
      );
    }
  }

  /**
   * Informs the service desk that the user has read all the messages that have been sent by the service desk.
   */
  public async userReadMessages(): Promise<void> {
    if (!this.serviceDesk || !this.chatStarted) {
      // No service desk connected.
      return;
    }

    try {
      await this.serviceDesk.userReadMessages();
    } catch (error) {
      consoleError(
        "[userReadMessages] An error with the service desk occurred.",
        error,
      );
    }
  }

  /**
   * Checks if any agents are online and ready to communicate with the user. This function will time out after 5
   * seconds and will return false when that happens.
   *
   * @param connectMessage The message that contains the transfer_info object that may be used by the service desk,
   * so it can perform a more specific check.
   */
  public async checkAreAnyHumanAgentsOnline(
    connectMessage: MessageResponse,
  ): Promise<HumanAgentsOnlineStatus> {
    let resultValue: HumanAgentsOnlineStatus;
    const initialRestartCount = this.serviceManager.restartCount;

    if (!this.serviceDesk?.areAnyAgentsOnline) {
      resultValue = HumanAgentsOnlineStatus.UNKNOWN;
    } else {
      try {
        const timeoutSeconds =
          this.serviceManager.store.getState().config.public.serviceDesk
            ?.availabilityTimeoutSeconds;
        const timeout = timeoutSeconds
          ? timeoutSeconds * 1000
          : AVAILABILITY_TIMEOUT_MS;
        const result = await resolveOrTimeout(
          this.serviceDesk.areAnyAgentsOnline(connectMessage),
          timeout,
        );

        if (result === true) {
          resultValue = HumanAgentsOnlineStatus.ONLINE;
        } else if (result === false) {
          resultValue = HumanAgentsOnlineStatus.OFFLINE;
        } else {
          // Any other value for result will return an unknown status.
          resultValue = HumanAgentsOnlineStatus.UNKNOWN;
        }
      } catch (error) {
        consoleError("Error attempting to get agent availability", error);
        // If we fail to get an answer we'll just return false to indicate that no agents are available.
        resultValue = HumanAgentsOnlineStatus.OFFLINE;
      }
    }

    if (initialRestartCount === this.serviceManager.restartCount) {
      // Don't await this since we don't want any event handlers to hold up this check.
      this.serviceManager.fire({
        type: BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE,
        areAnyAgentsOnline: resultValue,
      });
    }

    return resultValue;
  }

  /**
   * Tells the service desk if a user has started or stopped typing.
   *
   * @param isTyping If true, indicates that the user is typing. False indicates the user has stopped typing.
   */
  public async userTyping(isTyping: boolean): Promise<void> {
    if (!this.serviceDesk || !this.chatStarted) {
      // No service desk connected.
      return;
    }

    try {
      await this.serviceDesk.userTyping?.(isTyping);
    } catch (error) {
      consoleError(
        "[userTyping] An error with the service desk occurred.",
        error,
      );
    }
  }

  /**
   * Sets the error state for the message with the given id.
   *
   * @param messageID The ID of the message to set the state for. This will be the ID that was passed on the service
   * desk as part of the {@link ServiceDesk#sendMessageToAgent} call.
   * @param errorState The state to set of the message.
   */
  setMessageErrorState(messageID: string, errorState: MessageErrorState) {
    this.serviceManager.store.dispatch(
      actions.setMessageErrorState(messageID, errorState),
    );
  }

  /**
   * This is called when an agent fails to join a chat after a given period of time.
   */
  private async handleHumanAgentJoinedTimeout() {
    // Display an error to the user.
    const message =
      this.serviceManager.store.getState().config.derived.languagePack
        .errors_noHumanAgentsJoined;
    const { originalMessage, localMessage } =
      createLocalMessageForInlineError(message);
    await addMessages(
      [toPair([localMessage], originalMessage)],
      !this.isSuspended(),
      this.serviceManager,
    );

    // End the chat.
    this.endChat(false);
  }

  /**
   * Cancels the agent joined timer if one is running.
   */
  cancelHumanAgentJoinedTimer() {
    if (this.waitingForHumanAgentJoinedTimer) {
      clearTimeout(this.waitingForHumanAgentJoinedTimer);
      this.waitingForHumanAgentJoinedTimer = null;
    }
  }

  /**
   * Informs the service desk of a change in the state of screen sharing from the user side.
   *
   * @param state The new state of the screen sharing.
   */
  async screenShareUpdateRequestState(state: ScreenShareState) {
    if (!this.persistedHumanAgentState().isConnected) {
      // Not connected to an agent.
      return;
    }

    // Close the modal.
    this.closeScreenShareRequestModal(state);

    let agentMessageType: HumanAgentMessageType;
    switch (state) {
      case ScreenShareState.ACCEPTED:
        agentMessageType = SHARING_ACCEPTED;
        break;
      case ScreenShareState.DECLINED:
        agentMessageType = SHARING_DECLINED;
        break;
      case ScreenShareState.CANCELLED:
        agentMessageType = SHARING_CANCELLED;
        break;
      case ScreenShareState.ENDED:
        agentMessageType = SHARING_ENDED;
        break;
      default:
        return;
    }

    // Display a message to the user.
    await this.addHumanAgentLocalMessage(agentMessageType);
  }

  /**
   * Informs the service desk that it should stop screen sharing.
   */
  async screenShareStop() {
    this.serviceManager.store.dispatch(setIsScreenSharing(false));
    await this.addHumanAgentLocalMessage(SHARING_ENDED);
    await this.serviceDesk?.screenShareStop?.();
  }

  /**
   * Called during the hydration process to allow the service to deal with hydration.
   */
  async handleHydration(
    allowReconnect: boolean,
    allowEndChatMessages: boolean,
  ) {
    const { store } = this.serviceManager;

    let didReconnect = false;
    const { isConnected } = this.persistedHumanAgentState();

    if (isConnected) {
      this.chatStarted = true;

      if (allowReconnect && this.serviceDesk?.reconnect) {
        // If the user was previously connected to an agent, we need to see if we can reconnect the user to the agent.
        try {
          store.dispatch(setIsReconnecting(true));
          setTimeout(this.serviceManager.appWindow.requestFocus);

          // Let the service desk do whatever it needs to do to reconnect.
          didReconnect = await this.serviceDesk.reconnect();
        } catch (error) {
          consoleError(`Error while trying to reconnect to an agent.`, error);
        }
      }

      store.dispatch(setIsReconnecting(false));

      if (!this.persistedHumanAgentState().isConnected) {
        // The user may have disconnected while waiting for the reconnect in which case, just stop what we're doing.
        this.chatStarted = false;
        return;
      }

      setTimeout(this.serviceManager.appWindow.requestFocus);

      if (!didReconnect) {
        // If we didn't reconnected, then just end the chat.
        this.chatStarted = false;
        const wasSuspended = this.isSuspended();
        store.dispatch(endChat());

        if (allowEndChatMessages) {
          // If we didn't reconnect, then show the "end chat" messages to the user.
          const { responseUserProfile } = this.persistedHumanAgentState();
          await addHumanAgentEndChatMessage(
            HumanAgentMessageType.CHAT_WAS_ENDED,
            responseUserProfile,
            false,
            wasSuspended,
            this.serviceManager,
          );
          await addAssistantReturnMessage(0, wasSuspended, this.serviceManager);
        }
      } else {
        this.showLeaveWarning = false;
      }
    }
  }

  /**
   * Closes the screen share request modal and completes the promise waiting on it.
   */
  closeScreenShareRequestModal(state: ScreenShareState) {
    // Close the modal if it was open.
    this.serviceManager.store.dispatch(setShowScreenShareRequest(false));

    // If someone is waiting on the Promise, then resolve it.
    if (this.screenShareRequestPromise) {
      this.screenShareRequestPromise.doResolve(state);
      this.screenShareRequestPromise = null;
    }
    this.serviceManager.store.dispatch(
      setIsScreenSharing(state === ScreenShareState.ACCEPTED),
    );
  }

  /**
   * Adds a local agent message.
   */
  async addHumanAgentLocalMessage(
    agentMessageType: HumanAgentMessageType,
    responseUserProfile?: ResponseUserProfile,
    fireEvents = true,
  ) {
    if (!responseUserProfile) {
      responseUserProfile = this.persistedHumanAgentState().responseUserProfile;
    }
    const { localMessage, originalMessage } =
      await createHumanAgentLocalMessage(
        agentMessageType,
        this.serviceManager,
        responseUserProfile,
        fireEvents,
      );
    await addMessages(
      [toPair([localMessage], originalMessage)],
      !this.isSuspended(),
      this.serviceManager,
    );
  }

  /**
   * Returns the persisted agent state from the store.
   */
  persistedHumanAgentState() {
    return this.serviceManager.store.getState().persistedToBrowserStorage
      .humanAgentState;
  }

  /**
   * Indicates if the conversation with the agent is suspended.
   */
  isSuspended() {
    return this.serviceManager.store.getState().persistedToBrowserStorage
      .humanAgentState.isSuspended;
  }
}

/**
 * This class implements the callback that is passed to the service desk that it can use to send us information that
 * it produced by the service desk.
 */
class ServiceDeskCallbackImpl<TPersistedStateType>
  implements ServiceDeskCallback<TPersistedStateType>
{
  /**
   * The service manager to use to access services.
   */
  private serviceManager: ServiceManager;

  /**
   * A back reference to the service that created this callback.
   */
  private service: HumanAgentServiceImpl;

  constructor(serviceManager: ServiceManager, service: HumanAgentServiceImpl) {
    this.serviceManager = serviceManager;
    this.service = service;
  }

  /**
   * Updates Carbon AI Chat with the capabilities supported by the service desk. Some of these capabilities may support
   * being changed dynamically and can be updated at any time.
   *
   * @param capabilities The set of capabilities to update. Only properties that need to be changed need to be included.
   */
  updateCapabilities(capabilities: Partial<ServiceDeskCapabilities>): void {
    this.serviceManager.store.dispatch(
      updateCapabilities(cloneDeep(capabilities)),
    );
  }

  /**
   * Sends updated availability information to the chat widget for a user who is waiting to be connected to an
   * agent. This may be called at any point while waiting for the connection to provide newer information.
   *
   * @param availability The availability information to display to the user.
   */
  async updateAgentAvailability(availability: AgentAvailability) {
    if (!this.service.chatStarted) {
      // The chat is no longer running.
      return;
    }
    this.serviceManager.store.dispatch(setAgentAvailability(availability));
  }

  /**
   * Informs the chat widget that the agent has read all the messages that have been sent to the service desk.
   */
  async agentJoined(profile: ResponseUserProfile) {
    if (!this.service.chatStarted) {
      // The chat is no longer running.
      return;
    }

    this.service.cancelHumanAgentJoinedTimer();

    // Update the store with the current agent's profile information.
    this.serviceManager.store.dispatch(setHumanAgentJoined(profile));

    // Then generate a message we can display in the UI to indicate that the agent has joined.
    await this.service.addHumanAgentLocalMessage(HUMAN_AGENT_JOINED, profile);

    if (this.service.showLeaveWarning) {
      await this.service.addHumanAgentLocalMessage(RELOAD_WARNING, null, false);
      this.service.showLeaveWarning = false;
    }
  }

  /**
   * Informs the chat widget that the agent has read all the messages that have been sent to the service desk.
   *
   * This functionality is not yet implemented.
   */
  async agentReadMessages() {
    if (!this.service.chatStarted) {
      // The chat is no longer running.
      return;
    }
    debugLog("[ServiceDeskCallbackImpl] agentReadMessages");
  }

  /**
   * Tells the chat widget if an agent has started or stopped typing.
   *
   * @param isTyping If true, indicates that the agent is typing. False indicates the agent has stopped typing.
   */
  async agentTyping(isTyping: boolean) {
    if (
      this.persistedHumanAgentState().isConnected &&
      isTyping !== this.service.isHumanAgentTyping
    ) {
      this.serviceManager.store.dispatch(agentUpdateIsTyping(isTyping));
      this.service.isHumanAgentTyping = isTyping;
    }
  }

  /**
   * Sends a message to the chat widget from an agent.
   *
   * Note: The text response type from the standard Watson API is supported in addition to the Carbon AI Chat specific
   * {@link MessageResponseTypes.INLINE_ERROR} response type.
   *
   * @param message The message to display to the user. Note, the ability to pass a string for the message was added in
   * Carbon AI Chat 6.7.0. Earlier versions of Carbon AI Chat will not work if you pass just a string.
   * @param agentID The ID of the agent who is sending the message. If this is not provided, then the ID of the last
   * agent who joined the conversation will be used.
   */
  async sendMessageToUser(message: MessageResponse | string, agentID?: string) {
    if (!this.service.chatStarted || !message) {
      // The chat is no longer running or no message was actually provided.
      return;
    }

    const messageResponse =
      typeof message === "string"
        ? createMessageResponseForText(message)
        : message;
    addDefaultsToMessage(messageResponse);
    if (messageResponse.output?.generic?.length) {
      messageResponse.output.generic.forEach((messageItem) => {
        if (!messageItem.agent_message_type) {
          messageItem.agent_message_type =
            HumanAgentMessageType.FROM_HUMAN_AGENT;
        }
      });
    }

    const { serviceManager } = this;

    // If no agent ID is provided, just use the current one.
    let responseUserProfile: ResponseUserProfile;
    if (agentID === undefined) {
      responseUserProfile = this.persistedHumanAgentState().responseUserProfile;
    } else {
      responseUserProfile =
        this.persistedHumanAgentState().responseUserProfiles[agentID];
      if (!responseUserProfile) {
        // If we don't have a profile for the agent who sent this message, we need to use the profile for the current
        // agent (if there is one).
        responseUserProfile =
          this.persistedHumanAgentState().responseUserProfile;
        if (responseUserProfile) {
          consoleError(
            `Got agent ID ${agentID} but no agent with that ID joined the conversation. Using the current agent instead.`,
          );
        }
      }
    }

    // Fire the pre:receive event that will allow code to customize the message.
    await serviceManager.fire({
      type: BusEventType.HUMAN_AGENT_PRE_RECEIVE,
      data: messageResponse,
      responseUserProfile,
    });

    messageResponse.message_options = messageResponse.message_options || {};

    messageResponse.message_options.response_user_profile = responseUserProfile;

    const localMessages = messageResponse.output.generic.map((item: any) => {
      return outputItemToLocalItem(item, messageResponse);
    });
    await addMessages(
      [toPair(localMessages, messageResponse)],
      !this.service.isSuspended(),
      this.serviceManager,
    );

    await serviceManager.fire({
      type: BusEventType.HUMAN_AGENT_RECEIVE,
      data: messageResponse,
      responseUserProfile,
    });
  }

  /**
   * Informs the chat widget that a transfer to another agent is in progress. The agent profile information is
   * optional if the service desk doesn't have the information available. This message simply tells the chat widget
   * that the transfer has started. The service desk should inform the widget when the transfer is complete by
   * sending a {@link agentJoined} message later.
   */
  async beginTransferToAnotherAgent(profile?: ResponseUserProfile) {
    if (!this.service.chatStarted) {
      // The chat is no longer running.
      return;
    }

    if (profile) {
      // Update the store with the current agent's profile information.
      this.serviceManager.store.dispatch(setHumanAgentJoined(profile));
    }

    await this.service.addHumanAgentLocalMessage(
      TRANSFER_TO_HUMAN_AGENT,
      profile,
    );
  }

  /**
   * Informs the chat widget that the current agent has left the conversation.
   */
  async agentLeftChat(): Promise<void> {
    if (!this.service.chatStarted) {
      // The chat is no longer running.
      return;
    }

    await this.service.addHumanAgentLocalMessage(HUMAN_AGENT_LEFT_CHAT);

    this.service.isHumanAgentTyping = false;
    this.serviceManager.store.dispatch(setHumanAgentLeftChat());
  }

  /**
   * Informs the chat widget that the agent has closed the conversation.
   */
  async agentEndedChat(): Promise<void> {
    if (!this.service.chatStarted) {
      // The chat is no longer running.
      return;
    }

    const event = await this.service.firePreEndChat(true);
    if (event.cancelEndChat) {
      return;
    }

    await this.service.doEndChat(
      true,
      event.preEndChatPayload,
      true,
      true,
      HUMAN_AGENT_ENDED_CHAT,
    );
  }

  /**
   * Sets the state of the given error type.
   *
   * @param errorInfo Details for the error whose state is being set.
   */
  async setErrorStatus(errorInfo: ServiceDeskErrorInfo) {
    if (!this.service.chatStarted) {
      // The chat is no longer running.
      return;
    }

    const { type, logInfo } = errorInfo;
    const { store } = this.serviceManager;
    const { isConnecting } = store.getState().humanAgentState;

    if (logInfo) {
      consoleError(
        `An error occurred in the service desk (type=${type})`,
        logInfo,
      );
    }

    // If the service desk reports a disconnected error while we're in the middle of connecting, then handle it as a
    // connecting error instead. This avoids us sending the user a message when we never actually connected.
    if (
      isConnecting &&
      errorInfo.type === ErrorType.DISCONNECTED &&
      errorInfo.isDisconnected
    ) {
      errorInfo = { type: ErrorType.CONNECTING };
    }

    switch (errorInfo.type) {
      case ErrorType.DISCONNECTED: {
        if (errorInfo.isDisconnected) {
          // The service desk has become disconnected so show an error and don't allow the user to send messages.
          this.service.showingDisconnectedError = true;
          await this.service.addHumanAgentLocalMessage(
            DISCONNECTED,
            null,
            true,
          );
          store.dispatch(actions.updateInputState({ isReadonly: true }, true));
        } else if (this.service.showingDisconnectedError) {
          // The service desk says it's no longer disconnected but double check that we previously thought we were
          // disconnected.
          this.service.showingDisconnectedError = false;
          await this.service.addHumanAgentLocalMessage(RECONNECTED, null, true);
          store.dispatch(actions.updateInputState({ isReadonly: false }, true));
        }
        break;
      }
      case ErrorType.CONNECTING: {
        // If we can't connect, display an inline error message on the bot view.
        const { languagePack } =
          this.serviceManager.store.getState().config.derived;
        const message =
          errorInfo.messageToUser || languagePack.errors_connectingToHumanAgent;
        const { originalMessage, localMessage } =
          createLocalMessageForInlineError(message);
        await addMessages(
          [toPair([localMessage], originalMessage)],
          !this.service.isSuspended(),
          this.serviceManager,
        );

        // Cancel the connecting status.
        this.serviceManager.store.dispatch(setIsConnecting(false, null));
        this.service.chatStarted = false;
        this.service.cancelHumanAgentJoinedTimer();
        await this.service.fireEndChat(false, isConnecting);
        break;
      }
      case ErrorType.USER_MESSAGE: {
        this.service.setMessageErrorState(
          errorInfo.messageID,
          MessageErrorState.FAILED,
        );
        break;
      }
      default: {
        break;
      }
    }
  }

  /**
   * Updates the status of a file upload. The upload may either be successful or an error may have occurred. The
   * location of a file upload may be in one of two places. The first occurs when the user has selected a file to be
   * uploaded but has not yet sent the file. In this case, the file appears inside the Carbon AI Chat input area. If an
   * error is indicated on the file, the error message will be displayed along with the file and the user must
   * remove the file from the input area before a message can be sent.
   *
   * The second occurs after the user has sent the file and the service desk has begun to upload the file. In this
   * case, the file no longer appears in the input area but appears as a sent message in the message list. If an
   * error occurs during this time, an icon will appear next to the message to indicate an error occurred and an
   * error message will be added to the message list.
   *
   * @param fileID The ID of the file upload to update.
   * @param isError Indicates that the upload has an error or failed to upload.
   * @param errorMessage An error message to display along with a file in error.
   */
  async setFileUploadStatus(
    fileID: string,
    isError?: boolean,
    errorMessage?: string,
  ): Promise<void> {
    const { store } = this.serviceManager;

    // First we need to determine if the file upload has been sent or not. A message will exist in the store if so;
    // otherwise the file upload only exists in the input area.
    const uploadMessage = store.getState().allMessagesByID[fileID];
    if (uploadMessage) {
      // Update the value in the redux store.
      const partialMessage: DeepPartial<MessageResponse> = {
        history: { file_upload_status: FileStatusValue.COMPLETE },
      };
      if (isError) {
        store.dispatch(
          actions.setMessageResponseHistoryProperty(
            fileID,
            "file_upload_status",
            FileStatusValue.COMPLETE,
          ),
        );
        store.dispatch(
          actions.setMessageResponseHistoryProperty(
            fileID,
            "error_state",
            MessageErrorState.FAILED,
          ),
        );
        partialMessage.history.error_state = MessageErrorState.FAILED;

        if (errorMessage) {
          // Generate an inline error message to show the error to the user.
          const { originalMessage, localMessage } =
            createLocalMessageForInlineError(errorMessage);
          localMessage.item.agent_message_type =
            HumanAgentMessageType.INLINE_ERROR;
          await addMessages(
            [toPair([localMessage], originalMessage)],
            !this.service.isSuspended(),
            this.serviceManager,
          );
        }
      } else {
        // If the upload was completed successfully, we display a temporary "success" status. This will display a
        // checkmark temporarily before fading out. Session history will store "complete" as the status.
        store.dispatch(
          actions.setMessageResponseHistoryProperty(
            fileID,
            "file_upload_status",
            FileStatusValue.SUCCESS,
          ),
        );
        store.dispatch(
          actions.announceMessage({
            messageID: "fileSharing_ariaAnnounceSuccess",
          }),
        );
      }
    } else if (isError) {
      // Update the input area.
      store.dispatch(actions.fileUploadInputError(fileID, errorMessage, true));
    }

    this.service.uploadingFiles.delete(fileID);
    this.serviceManager.store.dispatch(
      updateFilesUploadInProgress(this.service.uploadingFiles.size > 0),
    );
  }

  /**
   * Requests that the user share their screen with the agent. This will present a modal dialog to the user who must
   * respond before continuing the conversation. This method returns a Promise that resolves when the user has
   * responded to the request or the request times out.
   *
   * @returns Returns a Promise that will resolve with the state the of the request. This Promise will reject if no
   * chat with an agent is currently running.
   */
  async screenShareRequest() {
    if (!this.persistedHumanAgentState().isConnected) {
      return Promise.reject(
        new Error("Cannot request screen sharing if no chat is in progress."),
      );
    }

    if (!this.service.screenShareRequestPromise) {
      this.service.screenShareRequestPromise = resolvablePromise();
      this.serviceManager.store.dispatch(setShowScreenShareRequest(true));

      await this.service.addHumanAgentLocalMessage(SHARING_REQUESTED);
    }

    return this.service.screenShareRequestPromise;
  }

  /**
   * Informs Carbon AI Chat that a screen sharing session has ended or been cancelled. This may occur while waiting for a
   * screen sharing request to be accepted or while screen sharing is in progress.
   */
  async screenShareEnded() {
    const wasScreenSharing =
      this.serviceManager.store.getState().humanAgentState.isScreenSharing;
    const requestPending = this.service.screenShareRequestPromise;
    this.service.closeScreenShareRequestModal(ScreenShareState.CANCELLED);
    if (wasScreenSharing) {
      this.serviceManager.store.dispatch(setIsScreenSharing(false));
      await this.service.addHumanAgentLocalMessage(SHARING_ENDED);
    } else if (requestPending) {
      await this.service.addHumanAgentLocalMessage(SHARING_CANCELLED);
    }
  }

  /**
   * Returns the persisted agent state from the store.
   */
  persistedHumanAgentState() {
    return this.serviceManager.store.getState().persistedToBrowserStorage
      .humanAgentState;
  }

  /**
   * Returns the persisted service desk state from the store. This is the current state as updated by
   * {@link updatePersistedState}. The object returned here is frozen and may not be modified.
   */
  persistedState(): TPersistedStateType {
    return this.serviceManager.store.getState().persistedToBrowserStorage
      .humanAgentState.serviceDeskState as TPersistedStateType;
  }

  /**
   * Allows the service desk to store state that may be retrieved when Carbon AI Chat is reloaded on a page. This information
   * is stored in browser session storage which has a total limit of 5MB per origin so the storage should be used
   * sparingly. Also, the value provided here must be JSON serializable.
   *
   * When Carbon AI Chat is reloaded, the data provided here will be returned to the service desk via the
   * ServiceDeskFactoryParameters.persistedState property.
   *
   * @param state The state to update.
   * @param mergeWithCurrent Indicates if the new state should be merged into the existing state. If false, then the
   * existing state will be fully replaced with the new state. Merging with existing state expects the state to be
   * an object.
   */
  updatePersistedState(
    state: DeepPartial<TPersistedStateType>,
    mergeWithCurrent = true,
  ): void {
    const { store } = this.serviceManager;
    let newState;
    if (mergeWithCurrent) {
      newState = merge(
        {},
        store.getState().persistedToBrowserStorage.humanAgentState
          .serviceDeskState,
        state,
      );
    } else {
      newState = cloneDeep(state);
    }
    store.dispatch(setPersistedServiceDeskState(deepFreeze(newState)));
  }
}

/**
 * Returns a new instance of the service implementation.
 */
function createHumanAgentService(
  serviceManager: ServiceManager,
): HumanAgentService {
  return new HumanAgentServiceImpl(serviceManager);
}
assertType<CreateHumanAgentServiceFunction>(createHumanAgentService);

/**
 * Performs some minimal validation of the provided custom service desk to make sure it meets the minimum
 * requirements. This simply checks that the service desk has the required properties and that those properties are
 * functions. If there are any errors, they are logged to the console.
 */
function validateCustomServiceDesk(serviceDesk: ServiceDesk) {
  if (!serviceDesk) {
    consoleError(
      "The custom service desk does not appear to be valid. No service desk was provided.",
      serviceDesk,
    );
  } else if (typeof serviceDesk !== "object") {
    consoleError(
      `The custom service desk does not appear to be valid. The type should be "object" but is "${typeof serviceDesk}"`,
      serviceDesk,
    );
  } else {
    const propertyNames: (keyof ServiceDesk)[] = [
      "startChat",
      "endChat",
      "sendMessageToAgent",
    ];
    propertyNames.forEach((propertyName) => {
      const value = serviceDesk[propertyName];
      if (typeof value !== "function") {
        consoleError(
          `The custom service desk does not appear to be valid. The type of property "${propertyName}"should be "function" but is "${typeof value}"`,
          value,
          serviceDesk,
        );
      }
    });

    const name = serviceDesk.getName?.();

    if (!name) {
      throw Error("The custom service desk does not have a name.");
    }

    if (name && (typeof name !== "string" || name.length > 40)) {
      throw new Error(`The custom service desk name "${name}" is not valid.`);
    }
  }
}

export {
  HumanAgentServiceImpl,
  createHumanAgentService,
  validateCustomServiceDesk,
};

export default createHumanAgentService;
