/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  HumanAgentsOnlineStatus,
  ScreenShareState,
} from "../../../types/config/ServiceDeskConfig";
import { FileUpload } from "../../../types/config/ServiceDeskConfig";
import { LocalMessageItem } from "../../../types/messaging/LocalMessageItem";
import { ServiceManager } from "../ServiceManager";
import {
  ConnectToHumanAgentItem,
  Message,
  MessageResponse,
} from "../../../types/messaging/Messages";

/**
 * This is the public contract between the chat widget and the human agent service. This interface allows us to keep
 * the implementation separate so it doesn't get included into the bundle for when a chat instance doesn't have
 * support for a service desk.
 */
interface HumanAgentService {
  /**
   * Initializes this service. This will create the service desk instance that can be used for communicating with
   * service desks.
   */
  initialize(): Promise<void>;

  /**
   * If a custom service desk is configured, returns the name.
   */
  getCustomServiceDeskName(): string;

  /**
   * Instructs the service desk to start a new chat. This should be called immediately after the service desk
   * instance has been created. It will make the appropriate calls to the service desk and begin communicating back
   * to the calling code using the callback produce to the instance. This may only be called once per instance.
   *
   * @param localConnectMessage The specific localMessage caused the connection to an agent. It will
   * contain specific information to send to the service desk as part of the connection. This can include things
   * like a message to display to a human agent.
   * @param originalMessage The full original message that this Connect to Agent item belongs to.
   * @returns Returns a Promise that resolves when the service desk has successfully started a new chat. This does
   * not necessarily mean that an agent has joined the conversation or has read any messages sent by the user.
   */
  startChat(
    localConnectMessage: LocalMessageItem<ConnectToHumanAgentItem>,
    originalMessage: Message,
  ): Promise<void>;

  /**
   * Tells the service desk to terminate the chat.
   *
   * @param endedByUser Indicates if the chat is being ended as a result of the user or if it was ended
   * programmatically from an instance method.
   * @param showHumanAgentLeftMessage Indicates if the chat should show the "agent left" message.
   * @param showBotReturnMessage Indicates if the chat should show the "bot return" message.
   * @returns Returns a Promise that resolves when the service desk has successfully handled the call.
   */
  endChat(
    endedByUser: boolean,
    showHumanAgentLeftMessage?: boolean,
    showBotReturnMessage?: boolean,
  ): Promise<void>;

  /**
   * Sends a message to the agent in the service desk.
   *
   * @param text The message from the user.
   * @param files An optional set of files to upload.
   * @returns Returns a Promise that resolves when the service desk has successfully handled the call.
   */
  sendMessageToAgent(text: string, files: FileUpload[]): Promise<void>;

  /**
   * Tells the service desk if a user has started or stopped typing.
   *
   * @param isTyping If true, indicates that the user is typing. False indicates the user has stopped typing.
   * @returns Returns a Promise that resolves when the service desk has successfully handled the call.
   */
  userTyping(isTyping: boolean): Promise<void>;

  /**
   * Informs the service desk that the user has read all the messages that have been sent by the service desk.
   *
   * @returns Returns a Promise that resolves when the service desk has successfully handled the call.
   */
  userReadMessages(): Promise<void>;

  /**
   * Checks if any agents are online and ready to communicate with the user.
   *
   * @param connectMessage The message that contains the transfer_info object that may be used by the service desk
   * so it can perform a more specific check.
   */
  checkAreAnyHumanAgentsOnline(
    connectMessage: MessageResponse,
  ): Promise<HumanAgentsOnlineStatus>;

  /**
   * Indicates that the user has selected some files to be uploaded but that the user has not yet chosen to send
   * them to the agent.
   */
  filesSelectedForUpload(uploads: FileUpload[]): void;

  /**
   * Informs the service desk of a change in the state of screen sharing from the user side.
   *
   * @param state The new state of the screen sharing.
   */
  screenShareUpdateRequestState(state: ScreenShareState): Promise<void>;

  /**
   * Informs the service desk that it should stop screen sharing.
   */
  screenShareStop(): Promise<void>;

  /**
   * Called during the hydration process to allow the service to deal with hydration.
   */
  handleHydration(
    allowReconnect: boolean,
    allowEndChatMessages: boolean,
  ): Promise<void>;
}

/**
 * The type signature of the "createService" function in the implementation.
 */
type CreateHumanAgentServiceFunction = (
  serviceManager: ServiceManager,
) => HumanAgentService;

// TODO: Moved used for HumanAgentsOnlineStatus export to use the package.
export {
  HumanAgentService,
  CreateHumanAgentServiceFunction,
  HumanAgentsOnlineStatus,
};
