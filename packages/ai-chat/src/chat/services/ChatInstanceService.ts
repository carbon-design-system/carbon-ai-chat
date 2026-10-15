/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ServiceManager,
  type UserDefinedElementRegistryItem,
} from './ServiceManager';
import actions from '../store/actions';
import { agentUpdateIsSuspended } from '../store/humanAgentActions';
import {
  AppStateMessages,
  ViewState,
  ViewType,
} from '../../types/state/AppState';

import { LocalMessageItem } from '../../types/messaging/LocalMessageItem';

import { HistoryItem } from '../../types/messaging/History';

import { callOnError, consoleError } from '../utils/miscUtils';
import {
  GenericItem,
  Message,
  MessageRequest,
  MessageResponse,
  PartialOrCompleteItemChunk,
  ResponseUserProfile,
  StreamChunk,
  StructuredData,
} from '../../types/messaging/Messages';
import {
  AddMessageOptions,
  MessageState,
} from '../../types/config/MessagingConfig';
import {
  MainWindowCloseReason,
  MainWindowOpenReason,
  MessageSendSource,
  ViewChangeReason,
} from '../../types/events/eventBusTypes';
import { SendOptions } from '../../types/instance/ChatInstance';
import { PublicChatState } from '../../types/instance/PublicChatState';
import { OnErrorData } from '../../types/config/ErrorConfig';
import { DeepPartial } from '../../types/utilities/DeepPartial';
import type { JSONContent } from '@tiptap/core';

/**
 * This class is responsible for handling various "actions" that the system can perform including actions that can
 * be initiated by custom code running in the host page and is an implementation of the public interface to the widget.
 */
class ChatInstanceService {
  /**
   * The service manager to use to access services.
   */
  private serviceManager: ServiceManager;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /** @see HydrationService.hydrateChat */
  async hydrateChat(
    alternateWelcomeRequest?: MessageRequest,
    alternateOptions?: SendOptions
  ) {
    return this.serviceManager.hydrationService.hydrateChat(
      alternateWelcomeRequest,
      alternateOptions
    );
  }

  /** @see PublicStateService.getPublicChatState */
  getPublicChatState(): PublicChatState {
    return this.serviceManager.publicStateService.getPublicChatState();
  }

  updateRawInputValue(updater: (previous: string) => string) {
    return this.serviceManager.inputActionsService.updateRawInputValue(updater);
  }

  async updateInputContent(
    updater: (previous: JSONContent) => JSONContent
  ): Promise<void> {
    return this.serviceManager.inputActionsService.updateInputContent(updater);
  }

  ensureInputEditor() {
    return this.serviceManager.inputActionsService.ensureInputEditor();
  }

  updateStructuredData(
    updater: (
      previous: StructuredData | undefined
    ) => StructuredData | undefined
  ) {
    return this.serviceManager.inputActionsService.updateStructuredData(
      updater
    );
  }

  removePendingUpload(uploadId: string) {
    return this.serviceManager.inputActionsService.removePendingUpload(
      uploadId
    );
  }

  async handleFileSelectedForUpload(file: File): Promise<void> {
    return this.serviceManager.inputActionsService.handleFileSelectedForUpload(
      file
    );
  }

  /**
   * Calls the send function but catches any errors and logs them to avoid us having any uncaught exceptions thrown
   * to the browser.
   */
  async sendWithCatch(
    message: MessageRequest | string,
    source: MessageSendSource,
    options: SendOptions = {},
    ignoreHydration = false
  ) {
    try {
      await this.send(message, source, options, ignoreHydration);
    } catch (error) {
      consoleError('An error occurred sending the message', error);
    }
  }

  /** @see SendService.send */
  async send(
    message: MessageRequest | string,
    source: MessageSendSource,
    options: SendOptions = {},
    ignoreHydration = false
  ) {
    return this.serviceManager.sendService.send(
      message,
      source,
      options,
      ignoreHydration
    );
  }

  /** @see ReceiveService.receive */
  async receive(
    message: MessageResponse,
    isLatestWelcomeNode = false,
    requestMessage?: MessageRequest,
    origin: 'addMessage' | 'chunk' = 'addMessage'
  ) {
    return this.serviceManager.receiveService.receive(
      message,
      isLatestWelcomeNode,
      requestMessage,
      origin
    );
  }

  /** @see ReceiveService.removeMessages */
  async removeMessages(messageIDs: string[]) {
    return this.serviceManager.receiveService.removeMessages(messageIDs);
  }

  /** @see ReceiveService.insertHistory */
  async insertHistory(messages: HistoryItem[]) {
    return this.serviceManager.receiveService.insertHistory(messages);
  }

  /**
   * Receives a chunk from a stream.
   */
  async receiveChunk(
    chunk: StreamChunk,
    messageID?: string,
    options: AddMessageOptions = {}
  ) {
    return this.serviceManager.chunkProcessingService.receiveChunk(
      chunk,
      messageID,
      options
    );
  }

  announceStreamStarts(
    messageID: string,
    content: {
      hasReasoning: boolean;
      hasDisplayableContent: boolean;
      responseUserProfile?: DeepPartial<ResponseUserProfile>;
    }
  ) {
    return this.serviceManager.streamAnnouncerService.announceStreamStarts(
      messageID,
      content
    );
  }

  /** @see SlotEventService.getOrCreateUserDefinedElement */
  getOrCreateUserDefinedElement(
    messageItemID: string
  ): UserDefinedElementRegistryItem {
    return this.serviceManager.slotEventService.getOrCreateUserDefinedElement(
      messageItemID
    );
  }

  /** @see SlotEventService.handleUserDefinedResponseItems */
  async handleUserDefinedResponseItems(
    localMessage: LocalMessageItem,
    originalMessage: Message,
    messageState?: MessageState,
    localItemsByID?: Record<string, LocalMessageItem>
  ) {
    return this.serviceManager.slotEventService.handleUserDefinedResponseItems(
      localMessage,
      originalMessage,
      messageState,
      localItemsByID
    );
  }

  /** @see SlotEventService.handleUserDefinedResponseItemsChunk */
  async handleUserDefinedResponseItemsChunk(
    messageID: string,
    chunk: PartialOrCompleteItemChunk,
    messageItem: DeepPartial<GenericItem>
  ) {
    return this.serviceManager.slotEventService.handleUserDefinedResponseItemsChunk(
      messageID,
      chunk,
      messageItem
    );
  }

  /** @see SlotEventService.handleCustomFooterSlot */
  async handleCustomFooterSlot(
    localMessage: LocalMessageItem,
    originalMessage: MessageResponse
  ) {
    return this.serviceManager.slotEventService.handleCustomFooterSlot(
      localMessage,
      originalMessage
    );
  }

  /** @see SlotEventService.handleCustomRequestFooterSlot */
  async handleCustomRequestFooterSlot(
    localMessage: LocalMessageItem,
    originalMessage: MessageRequest
  ) {
    return this.serviceManager.slotEventService.handleCustomRequestFooterSlot(
      localMessage,
      originalMessage
    );
  }

  /**
   * Opens the response panel using the provided local message item to render the content in the panel.
   */
  openResponsePanel(
    localMessageItem: LocalMessageItem,
    isMessageForInput: boolean
  ) {
    this.serviceManager.store.dispatch(
      actions.setResponsePanelContent(localMessageItem, isMessageForInput)
    );
    this.serviceManager.store.dispatch(actions.setResponsePanelIsOpen(true));
  }

  // updateLanguagePack removed; use top-level `strings` prop on components.

  /** @see ViewService.changeView */
  async changeView(
    newView: ViewType | Partial<ViewState>,
    reason: {
      viewChangeReason: ViewChangeReason;
      mainWindowOpenReason?: MainWindowOpenReason;
      mainWindowCloseReason?: MainWindowCloseReason;
    },
    tryHydrating = true,
    forceViewChange = false
  ): Promise<ViewState> {
    return this.serviceManager.viewService.changeView(
      newView,
      reason,
      tryHydrating,
      forceViewChange
    );
  }

  /**
   * Fires an error event to notify listeners that an error occurred.
   *
   * @param error Details about the error or the error object.
   */
  errorOccurred(error: OnErrorData) {
    consoleError('An error has occurred', error);

    if (error.catastrophicErrorType) {
      this.serviceManager.store.dispatch(
        actions.setAppStateValue(
          'catastrophicErrorType',
          error.catastrophicErrorType
        )
      );
    }
    callOnError(
      this.serviceManager.store.getState().config.public.onError,
      error
    );
  }

  /** @see HydrationService.restartConversation */
  async restartConversation(options: RestartConversationOptions = {}) {
    return this.serviceManager.hydrationService.restartConversation(options);
  }

  /** @see HydrationService.destroySession */
  async destroySession(keepOpenState: boolean) {
    return this.serviceManager.hydrationService.destroySession(keepOpenState);
  }

  /**
   * Ends the conversation with a human agent. This does not request confirmation from the user first. If the user
   * is not connected or connecting to a human agent, this function has no effect. You can determine if the user is
   * connected or connecting by calling {@link ChatInstance.getState}. Note that this function
   * returns a Promise that only resolves when the conversation has ended. This includes after the
   * {@link BusEventType.HUMAN_AGENT_PRE_END_CHAT} and {@link BusEventType.HUMAN_AGENT_END_CHAT} events have been fired and
   * resolved.
   */
  agentEndConversation(endedByUser: boolean) {
    return this.serviceManager.humanAgentService.endChat(endedByUser);
  }

  /**
   * Sets the suspended state for an agent conversation. A conversation can be suspended or un-suspended only if the
   * user is currently connecting or connected to an agent. If a conversation is suspended, then messages from the user
   * will no longer be routed to the service desk and incoming messages from the service desk will not be displayed. In
   * addition, the current connection status with an agent will not be shown.
   */
  agentUpdateIsSuspended(isSuspended: boolean) {
    this.serviceManager.store.dispatch(agentUpdateIsSuspended(isSuspended));
  }

  /** @see SlotEventService.createElementsForUserDefinedResponses */
  async createElementsForUserDefinedResponses(messages: AppStateMessages) {
    return this.serviceManager.slotEventService.createElementsForUserDefinedResponses(
      messages
    );
  }

  /** @see SlotEventService.replayFooterSlots */
  async replayFooterSlots(messages: AppStateMessages) {
    return this.serviceManager.slotEventService.replayFooterSlots(messages);
  }
}

/**
 * Options for restarting a conversation — re-exported from HydrationService for call-site compatibility.
 */
interface RestartConversationOptions {
  /**
   * Indicates if restarting the conversation should skip the hydration of a new conversation.
   */
  skipHydration?: boolean;

  /**
   * Indicates if a conversation with a human agent should be ended. This defaults to true.
   */
  endHumanAgentConversation?: boolean;

  /**
   * Indicates if the "pre:restartConversation" and "restartConversation" events should be fired. This defaults to true.
   */
  fireEvents?: boolean;
}

export { ChatInstanceService };
