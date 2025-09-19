/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { DeepPartial } from "../utilities/DeepPartial";

import {
  ResponseUserProfile,
  MessageRequest,
  MessageResponse,
} from "../messaging/Messages";
import type {
  ChatInstance,
  FileUploadCapabilities,
} from "../instance/ChatInstance";

/**
 * Constants for the Carbon FileStatus type because they weren't kind enough to include their own enum.
 *
 * @category Service desk
 */
export enum FileStatusValue {
  COMPLETE = "complete",
  EDIT = "edit",
  UPLOADING = "uploading",
  SUCCESS = "success",
}

/**
 * An interface that represents a file to upload and its current upload status.
 *
 * @category Service desk
 */
export interface FileUpload {
  /**
   * A unique ID for the file.
   */
  id: string;

  /**
   * The file to upload.
   */
  file: File;

  /**
   * The current upload status.
   */
  status: FileStatusValue;

  /**
   * Indicates if the file contains an error or failed to upload.
   */
  isError?: boolean;

  /**
   * If the file failed to upload, this is an optional error message to display.
   */
  errorMessage?: string;
}

/**
 * The section of the public config that contains configuration options for service desk integrations.
 *
 * @category Service desk
 */
export interface ServiceDeskPublicConfig {
  /**
   * The timeout value in seconds to use when determining agent availability. When a connect_to_agent response is
   * received, the system will ask the service desk if any agents are available. If no response is received within
   * the timeout window, the system will return "false" to indicate no agents are available.
   */
  availabilityTimeoutSeconds?: number;

  /**
   * Indicates if Carbon AI Chat should auto-connect to an agent whenever it receives a connect_to_agent response and
   * agents are available. This essentially mimics the user clicking the "Request agent" button on the card. The
   * card is still displayed to the user.
   */
  skipConnectHumanAgentCard?: boolean;

  /**
   * The timeout value is seconds to use when waiting for an agent to join the chat after an agent has been
   * requested. If no agent joins after this time, the chat will be ended and an error message will be displayed to
   * the user. By default, there is no timeout.
   */
  agentJoinTimeoutSeconds?: number;

  /**
   * Indicates if Carbon AI Chat should automatically attempt to reconnect the user to a human agent when it is loaded. This
   * only works if the service desk integration being used supports reconnecting. This value defaults to true.
   */
  allowReconnect?: boolean;
}

/**
 * Represents the different states for the availability of a human agent from a service desk.
 *
 * @category Service desk
 */
export enum HumanAgentsOnlineStatus {
  /**
   * Indicates that agents are online.
   */
  ONLINE = "online",

  /**
   * Indicates that no agents are online.
   */
  OFFLINE = "offline",

  /**
   * Indicates that it is unknown whether any agents are available. This may be because the service desk being used
   * doesn't support the ability to determine this information.
   */
  UNKNOWN = "unknown",
}

/**
 * The parameters that are passed to a service desk factory.
 *
 * @category Service desk
 */
export interface ServiceDeskFactoryParameters {
  /**
   * The callback used by the service desk to communicate with the widget.
   */
  callback: ServiceDeskCallback;

  /**
   * The instance of Carbon AI Chat.
   */
  instance: ChatInstance;

  /**
   * Any state that was stored for the service desk. This value may be undefined if no state has been stored.
   */
  persistedState: unknown;
}

/**
 * This interface represents the operations that a service desk integration can call on Carbon AI Chat when it wants web
 * chat to do something. When a service desk integration instance is created, Carbon AI Chat will provide an
 * implementation of this interface to the integration for it to use.
 *
 * @category Service desk
 */
export interface ServiceDeskCallback<TPersistedStateType = unknown> {
  /**
   * Updates Carbon AI Chat with the capabilities supported by the service desk. Some of these capabilities may support
   * being changed dynamically and can be updated at any time.
   *
   * @param capabilities The set of capabilities to update. Only properties that need to be changed need to be included.
   */
  updateCapabilities(capabilities: Partial<ServiceDeskCapabilities>): void;

  /**
   * Sends updated availability information to the chat widget for a user who is waiting to be connected to an
   * agent (e.g. the user is number 2 in line). This may be called at any point while waiting for the connection to
   * provide newer information.
   *
   * Note: Of the fields in the AgentAvailability object, only one of positionInQueue and estimatedWaitTime can be
   * rendered in the widget. If both fields are provided, estimatedWaitTime will take priority and the
   * positionInQueue field will be ignored.
   *
   * @param availability The availability information to display to the user.
   */
  updateAgentAvailability(availability: AgentAvailability): Promise<void>;

  /**
   * Informs the chat widget that an agent has joined the chat.
   */
  agentJoined(profile: ResponseUserProfile): Promise<void>;

  /**
   * Informs the chat widget that the agent has read all the messages that have been sent to the service desk.
   */
  agentReadMessages(): Promise<void>;

  /**
   * Tells the chat widget if an agent has started or stopped typing.
   *
   * @param isTyping If true, indicates that the agent is typing. False indicates the agent has stopped typing.
   */
  agentTyping(isTyping: boolean): Promise<void>;

  /**
   * Sends a message to the chat widget from an agent.
   *
   * Note: The text response type from the standard Watson API is supported in addition to the Carbon AI Chat specific
   * MessageResponseTypes.INLINE_ERROR response type.
   *
   * @param message The message to display to the user. Note, the ability to pass a string for the message was added in
   * Carbon AI Chat 6.7.0. Earlier versions of Carbon AI Chat will not work if you pass just a string.
   * @param agentID The ID of the agent who is sending the message. If this is not provided, then the ID of the last
   * agent who joined the conversation will be used.
   */
  sendMessageToUser(
    message: MessageResponse | string,
    agentID?: string,
  ): Promise<void>;

  /**
   * Informs the chat widget that a transfer to another agent is in progress. The agent profile information is
   * optional if the service desk doesn't have the information available. This message simply tells the chat widget
   * that the transfer has started. The service desk should inform the widget when the transfer is complete by
   * sending a {@link agentJoined} message later.
   */
  beginTransferToAnotherAgent(profile?: ResponseUserProfile): Promise<void>;

  /**
   * Informs the chat widget that the agent has left the conversation. This does not end the conversation itself,
   * rather the only action that occurs is the visitor receives the agent left status message. If the user sends
   * another message, it is up to the service desk to decide what to do with it.
   */
  agentLeftChat(): Promise<void>;

  /**
   * Informs the chat widget that the agent has ended the conversation.
   */
  agentEndedChat(): Promise<void>;

  /**
   * Sets the state of the given error type.
   *
   * @param errorInfo Details for the error whose state is being set.
   */
  setErrorStatus(errorInfo: ServiceDeskErrorInfo): Promise<void>;

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
  setFileUploadStatus(
    fileID: string,
    isError?: boolean,
    errorMessage?: string,
  ): Promise<void>;

  /**
   * Requests that the user share their screen with the agent. This will present a modal dialog to the user who must
   * respond before continuing the conversation. This method returns a Promise that resolves when the user has
   * responded to the request or the request times out.
   *
   * @returns Returns a Promise that will resolve with the state the of the request. This Promise will reject if no
   * chat with an agent is currently running.
   */
  screenShareRequest(): Promise<ScreenShareState>;

  /**
   * Informs Carbon AI Chat that a screen sharing session has ended or been cancelled. This may occur while waiting for a
   * screen sharing request to be accepted or while screen sharing is in progress.
   */
  screenShareEnded(): Promise<void>;

  /**
   * Returns the persisted agent state from the store. This is the current state as updated by
   * {@link updatePersistedState}. The object returned here is frozen and may not be modified.
   */
  persistedState(): TPersistedStateType;

  /**
   * Allows the service desk to store state that may be retrieved when Carbon AI Chat is reloaded on a page. This information
   * is stored in browser session storage which has a total limit of 5MB per origin so the storage should be used
   * sparingly. Also, the value provided here must be JSON serializable.
   *
   * When Carbon AI Chat is reloaded, the data provided here will be returned to the service desk via the
   * ServiceDeskFactoryParameters.persistedState property. This data may also be retrieved by using the
   * {@link persistedState} method.
   *
   * @param state The state to update.
   * @param mergeWithCurrent Indicates if the new state should be merged into the existing state. If false, then the
   * existing state will be fully replaced with the new state. Merging with existing state expects the state to be
   * an object. This argument is true by default.
   */
  updatePersistedState(
    state: DeepPartial<TPersistedStateType>,
    mergeWithCurrent?: boolean,
  ): void;
}

/**
 * The set of capabilities and parameters that are supported by the service desk.
 *
 * @category Service desk
 */
export type ServiceDeskCapabilities = FileUploadCapabilities;

/**
 * The possible state changes for a screen sharing request.
 *
 * @category Service desk
 */
export enum ScreenShareState {
  /**
   * Indicates the screen sharing was accepted by the user.
   */
  ACCEPTED = "accepted",

  /**
   * Indicates the screen sharing was declined by the user.
   */
  DECLINED = "declined",

  /**
   * Indicates the screen sharing request was cancelled.
   */
  CANCELLED = "cancelled",

  /**
   * Indicates that screen sharing has ended.
   */
  ENDED = "ended",
}

/**
 * Information about the current availability of an agent while a user is waiting to be connected. If these are not set
 * the Carbon AI Chat will provide generic messaging letting the user know that a request for an agent has been sent.
 *
 * Note that only one of these fields will be used by Carbon AI Chat if more than one has been assigned a value. Priority
 * first goes to estimatedWaitTime, then positionInQueue, and then message.
 *
 * @category Service desk
 */
export interface AgentAvailability {
  /**
   * The current position of the user in a queue. E.g. "You are number 2 in line."
   */
  positionInQueue?: number;

  /**
   * The estimated wait time for the user in minutes. E.g. "Current wait time is 2 minutes."
   */
  estimatedWaitTime?: number;

  /**
   * A custom message to display to the user containing the updated status. This may contain markdown.
   */
  message?: string;
}

/**
 * The possible events that may have some form of error status.
 *
 * @category Service desk
 */
export enum ErrorType {
  /**
   * This error is meant to be displayed while the user is attempting to connect to a service desk and before an
   * agent has joined. If this error is generated by the service desk, it is expected that the service desk will
   * treat the chat as having ended (or never started).
   */
  CONNECTING = 1,

  /**
   * This is used to indicate the state of errors that can happen any time during a chat where the service desk
   * implementation has lost a connection to the back-end. If this error occurs while the user is waiting for an
   * agent to join, it will be treated as a {@link ErrorType.CONNECTING} error instead.
   */
  DISCONNECTED = 2,

  /**
   * This error is used to report when there was an error sending a message to the agent.
   */
  USER_MESSAGE = 3,
}

/**
 * This is the parent interface for the information passed to {@link ServiceDeskCallback#setErrorStatus}. It is used
 * as a discriminating union where the {@link #type} property is the discriminating value that determines which
 * child interface is to be used.
 *
 * @category Service desk
 */
interface BaseErrorInfo {
  /**
   * An optional value that will be logged to the console as an error.
   */
  logInfo?: unknown;
}

/**
 * This error is meant to be displayed while the user is attempting to connect to a service desk and before an
 * agent has joined. If this error is generated by the service desk, it is expected that the service desk will
 * treat the chat as having ended (or never started).
 *
 * @category Service desk
 */
export interface ConnectingErrorInfo extends BaseErrorInfo {
  /**
   * The discriminating value for this type.
   */
  type: ErrorType.CONNECTING;

  /**
   * An optional message that is displayed to the user in the bot view. If this value is not provided, a default
   * message will be shown instead.
   *
   * Note that support for this field was added in Carbon AI Chat 6.7.0. It will be ignored in earlier versions.
   */
  messageToUser?: string;
}

/**
 * This is used to indicate the state of errors that can happen any time during a chat where the service desk
 * implementation has lost a connection to the back-end. If this error occurs while the user is waiting for an
 * agent to join, it will be treated as a {@link ErrorType.CONNECTING} error instead.
 *
 * @category Service desk
 */
export interface DisconnectedErrorInfo extends BaseErrorInfo {
  /**
   * The discriminating value for this type.
   */
  type: ErrorType.DISCONNECTED;

  /**
   * Indicates if the service desk has become disconnected. A value of true can be passed that will indicate that a
   * previous disconnection is over and the service desk is now connected again.
   */
  isDisconnected: boolean;
}

/**
 * This error is used to report when there was an error sending a message to the agent.
 *
 * @category Service desk
 */
export interface UserMessageErrorInfo extends BaseErrorInfo {
  /**
   * The discriminating value for this type.
   */
  type: ErrorType.USER_MESSAGE;

  /**
   * The ID of the message that is in error.
   */
  messageID: string;
}

/**
 * The type for the information passed to {@link ServiceDeskCallback#setErrorStatus}. It is a discriminating union
 * where the type property is the discriminating value that determines which child interface is to be used.
 *
 * @category Service desk
 */
export type ServiceDeskErrorInfo =
  | ConnectingErrorInfo
  | DisconnectedErrorInfo
  | UserMessageErrorInfo;

/**
 * Additional options that may be passed to the service desk when a chat is started.
 *
 * @category Service desk
 */
export interface StartChatOptions<TPayloadType = unknown> {
  /**
   * Some arbitrary payload of data that was provided as part of the "human_agent:pre:startChat" event.
   */
  preStartChatPayload: TPayloadType;
}

/**
 * Additional info that may be provided when a chat is ended.
 *
 * @category Service desk
 */
export interface EndChatInfo<TPayloadType = unknown> {
  /**
   * Before a chat is ended, a {@link BusEventType.HUMAN_AGENT_PRE_END_CHAT} is fired. The payload value assigned to this
   * event by a listener is provided here.
   */
  preEndChatPayload: TPayloadType;

  /**
   * Indicates if the chat was ended by the agent (or by the service desk integration). If false, indicates the chat
   * was ended by the user or by Carbon AI Chat.
   */
  endedByHumanAgent: boolean;
}

/**
 * This is a set of additional data that may be included when the user sends a message to an agent.
 *
 * @category Service desk
 */
export interface AdditionalDataToAgent {
  /**
   * A set of files that user has selected to upload to an agent. This value may be undefined if there are no files
   * to upload.
   */
  filesToUpload?: FileUpload[];
}

/**
 * This is the public interface for a human agent service desk integration. This is the interface between the chat
 * widget and the implementation of the human agent interface with one of the various supported service desks.
 *
 * @category Service desk
 */
export interface ServiceDesk {
  /**
   * Returns a name for this service desk integration. This value should reflect the service desk that is being
   * integrated to (e.g. "genesys web messenger"). This information will be reported to IBM and may be used to gauge
   * interest in various service desks for the possibility of creating fully supported out-of-the-box implementations.
   *
   * This value is required for custom service desks and may have a maximum of 40 characters.
   */
  getName?: () => string;

  /**
   * Instructs the service desk to start a new chat. This will be called when a user requests to connect to an agent
   * and Carbon AI Chat initiates the process (typically when the user clicks the button on the "Connect to Agent" card).
   * It will make the appropriate calls to the service desk to start the chat and will make use of the callback to
   * inform Carbon AI Chat when an agent joins or messages are received.
   *
   * This may be called multiple times by Carbon AI Chat. If a user begins a chat with an agent, ends the chat and then
   * begins a new chat with an agent, this function will be called again.
   *
   * If the integration is unable to start a chat (such as if the service desk is down or no agents are available)
   * then this function should throw an error to let Carbon AI Chat know that the chat could not be started.
   *
   * The {@link areAnyAgentsOnline} function is called before this function is called and is called as soon as a
   * "connect_to_agent" message has been received from the assistant. This determines if the "Connect to Agent" card
   * should be displayed to the user or if the "no agents are available" message configured in the skill should be
   * shown instead.
   *
   * @param connectMessage The original server message response that caused the connection to an agent. It will
   * contain specific information to send to the service desk as part of the connection. This can include things
   * like a message to display to a human agent.
   * @param startChatOptions Additional configuration for startChat.
   * @returns Returns a Promise that resolves when the service desk has successfully started a new chat. This does
   * not necessarily mean that an agent has joined the conversation or has read any messages sent by the user.
   */
  startChat: (
    connectMessage: MessageResponse,
    startChatOptions: StartChatOptions,
  ) => Promise<void>;

  /**
   * Tells the service desk to terminate the chat.
   *
   * @param info Additional info that may be provided as part of ending the chat.
   * @returns Returns a Promise that resolves when the service desk has successfully handled the call.
   */
  endChat: (info: EndChatInfo<unknown>) => Promise<void>;

  /**
   * Sends a message to the agent in the service desk. Note that the message text may be empty if the user has
   * selected files to upload and has not chosen to include a message to go along with the files.
   *
   * @param message The message from the user.
   * @param messageID The unique ID of the message assigned by the widget.
   * @param additionalData Additional data to include in the message to the agent.
   * @returns Returns a Promise that resolves when the service desk has successfully handled the call.
   */
  sendMessageToAgent: (
    message: MessageRequest,
    messageID: string,
    additionalData: AdditionalDataToAgent,
  ) => Promise<void>;

  /**
   * Tells the service desk if a user has started or stopped typing.
   *
   * @param isTyping If true, indicates that the user is typing. False indicates the user has stopped typing.
   * @returns Returns a Promise that resolves when the service desk has successfully handled the call.
   * @since 5.1.1
   */
  userTyping?: (isTyping: boolean) => Promise<void>;

  /**
   * Informs the service desk that the user has read all the messages that have been sent by the service desk.
   *
   * @returns Returns a Promise that resolves when the service desk has successfully handled the call.
   */
  userReadMessages?: () => Promise<void>;

  /**
   * Checks if any agents are online and can connect to a user when they become available. This does not necessarily
   * mean that an agent is immediately available; when a chat is started, the user may still have to wait for an
   * agent to become available. The callback function {@link ServiceDeskCallback.updateAgentAvailability} is used to
   * give the user more up-to-date information while they are waiting for an agent to become available.
   *
   * @param connectMessage The message that contains the transfer_info object that may be used by the service desk,
   * so it can perform a more specific check.
   * @returns True if some agents are available or false if no agents are available. This may also return null which
   * means the availability status of agents is unknown or the service desk doesn't support this information.
   */
  areAnyAgentsOnline?: (
    connectMessage: MessageResponse,
  ) => Promise<boolean | null>;

  /**
   * Indicates that the user has selected some files to be uploaded but that the user has not yet chosen to send
   * them to the agent. This method can use this as an opportunity to perform any early validation of the files in
   * order to display an error to the user. It should not actually upload the files at this point. If the user
   * chooses to send the files to the agent, they will be included later when {@link ServiceDesk#sendMessageToAgent} is called.
   *
   * This method may be called multiple times before a user sends the files.
   *
   * If there are errors in the files, this method should use {@link ServiceDeskCallback#setFileUploadStatus} to update
   * the status with an error message. The user will not be able to upload any files until any files in error are
   * removed.
   */
  filesSelectedForUpload?: (uploads: FileUpload[]) => void;

  /**
   * Tells the service desk that the user has requested to stop sharing their screen.
   */
  screenShareStop?: () => Promise<void>;

  /**
   * This will be called when the service desk is first initialized and it is determined that the user was previously
   * connected to an agent. This function should perform whatever steps are necessary to reconnect the user. Web chat
   * will assume the user is permitted to send messages and is connected to the same agent when this function resolves.
   *
   * @returns true to indicate that the reconnect was successful.
   */
  reconnect?: () => Promise<boolean>;
}
