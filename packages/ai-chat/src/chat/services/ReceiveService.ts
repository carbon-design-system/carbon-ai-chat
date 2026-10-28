/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import merge from 'lodash-es/merge.js';

import actions from '../store/actions';
import type { MessageWriteOptions } from '../store/messageWriteTypes';
import { AppStateMessages } from '../../types/state/AppState';
import { deepFreeze } from '../utils/lang/objectUtils';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import {
  createMessageResponseForText,
  isResponse,
  isConnectToHumanAgent,
} from '../utils/messageUtils';
import {
  BusEventPreReceive,
  BusEventType,
} from '../../types/events/eventBusTypes';
import {
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
} from '../../types/messaging/Messages';
import { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import { OnErrorType } from '../../types/config/ErrorConfig';
import { MessageState } from '../../types/config/MessagingConfig';
import { HistoryItem, HistoryNote } from '../../types/messaging/History';
import type { ServiceManager } from './ServiceManager';

class ReceiveService {
  private serviceManager: ServiceManager;

  private processedAgentItems = new Map<string, Set<string>>();

  private pendingReceiveRemovals = new Set<Set<string>>();

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Instructs the widget to process the given message as an incoming message received from the assistant. This will
   * fire a "pre:receive" event immediately and a "receive" event after the message has been stored. This method
   * completes once "receive" has fired, without waiting for the message's items to show (including the time delay
   * that may be introduced by a pause).
   *
   * @param message A {@link MessageResponse} object.
   * @param isLatestWelcomeNode Indicates if this message is a new welcome message that has just been shown to the user
   * and isn't a historical welcome message.
   * @param requestMessage The optional {@link MessageRequest} that this response is a response to.
   * @param origin The public method the message comes from: `addMessage`, or `addMessageChunk` for the
   * `final_response` that completes a stream.
   */
  async receive(
    message: MessageResponse,
    isLatestWelcomeNode = false,
    requestMessage?: MessageRequest,
    origin: 'addMessage' | 'chunk' = 'addMessage',
    isCallerCurrent: () => boolean = () => true
  ) {
    const { restartCount: initialRestartCount } = this.serviceManager;
    const { messageService } = this.serviceManager;
    if (
      !isCallerCurrent() ||
      messageService.isRequestFromPreviousConversation(
        message.request_id ?? requestMessage?.id
      )
    ) {
      return;
    }

    // Received messages should be given an id if they don't have one.
    if (!message.id) {
      message.id = uuid();
    }

    const write = this.serviceManager.messageUpsertCoordinator.trackWrite(
      message.id
    );
    // A writable pre:receive handler can choose its final ID after a removal.
    const removedIDs = new Set<string>();
    this.pendingReceiveRemovals.add(removedIDs);
    const isCurrent = () =>
      write.isCurrent() && isCallerCurrent() && !removedIDs.has(message.id);
    try {
      const preReceiveEvent: BusEventPreReceive = {
        type: BusEventType.PRE_RECEIVE,
        data: message,
      };
      // Fire the pre:receive event. User code is allowed to modify the message at this point.
      await this.serviceManager.fire(preReceiveEvent, isCurrent);

      if (
        !isCurrent() ||
        initialRestartCount !== this.serviceManager.restartCount ||
        messageService.isRequestFromPreviousConversation(message.request_id)
      ) {
        // If a restart occurred during the await above, we need to exit.
        return;
      }

      this.serviceManager.conversationLifecycleService.responseReceived(
        message.id,
        undefined,
        message.request_id ?? requestMessage?.id
      );
      if (!isCurrent()) {
        return;
      }

      if (isResponse(message as any)) {
        await this.writeReceivedMessage(message, {
          origin,
          isLatestWelcomeNode,
          requestMessage,
          restartCount: initialRestartCount,
          isCurrent,
        });
        return;
      }

      const { languagePack } = this.serviceManager.store.getState();
      const inlineError: MessageResponse = createMessageResponseForText(
        languagePack.errors_singleMessage,
        message?.thread_id,
        MessageResponseTypes.INLINE_ERROR
      );
      this.receive(inlineError, false);

      deepFreeze(message);

      await this.serviceManager.fire(
        {
          type: BusEventType.RECEIVE,
          data: message,
        },
        isCurrent
      );

      // Record COMPLETE so a later `upsertMessage(id, MessageState.COMPLETE, ...)` for
      // the same id suppresses a second `pre:receive` / `receive`.
      if (
        isCurrent() &&
        initialRestartCount === this.serviceManager.restartCount
      ) {
        this.serviceManager.messageUpsertCoordinator.markComplete(message.id);
      }
    } finally {
      this.pendingReceiveRemovals.delete(removedIDs);
      write.release();
    }
  }

  /**
   * Writes a received message through the upsert coordinator as one COMPLETE upsert. It
   * resolves once `receive` has fired, and rejects when a `receive` handler throws. The
   * message's items keep showing after that, while the next write for its id runs.
   */
  private writeReceivedMessage(
    message: MessageResponse,
    options: MessageWriteOptions
  ): Promise<void> {
    return this.serviceManager.messageUpsertCoordinator.upsert(
      message.id,
      MessageState.COMPLETE,
      () => message,
      options
    );
  }

  async handleConnectToHumanAgent(
    localMessageItem: LocalMessageItem,
    fullMessage: MessageResponse,
    isCurrent: () => boolean = () => true,
    options: {
      identity?: string;
      deduplicateByLocalID?: boolean;
    } = {}
  ) {
    const localIdentity = `local:${localMessageItem.ui_state.id}`;
    const itemIdentity = options.identity ?? localIdentity;
    const deduplicationKey = options.deduplicateByLocalID
      ? localIdentity
      : itemIdentity;
    if (
      !isCurrent() ||
      !isConnectToHumanAgent(localMessageItem.item) ||
      this.processedAgentItems
        .get(localMessageItem.fullMessageID)
        ?.has(deduplicationKey)
    ) {
      return;
    }
    let processedItems = this.processedAgentItems.get(
      localMessageItem.fullMessageID
    );
    if (!processedItems) {
      processedItems = new Set();
      this.processedAgentItems.set(
        localMessageItem.fullMessageID,
        processedItems
      );
    }
    processedItems.add(itemIdentity);
    processedItems.add(localIdentity);

    const { store, humanAgentService, restartCount } = this.serviceManager;
    const { config } = store.getState();
    if (humanAgentService) {
      await humanAgentService.handleConnectToHumanAgent(
        localMessageItem,
        fullMessage,
        config,
        restartCount,
        isCurrent
      );
      return;
    }

    this.serviceManager.actions.errorOccurred({
      errorType: OnErrorType.INTEGRATION_ERROR,
      message:
        'Web chat received a "connect_to_agent" message but there is no service desk configured. Check your chat configuration.',
    });
    if (!isCurrent()) {
      return;
    }
    store.dispatch(
      actions.setMessageUIStateInternalProperty(
        localMessageItem.fullMessageID,
        'agent_no_service_desk',
        true
      )
    );
  }

  retainAgentItemPositions(messageID: string, identities: Set<string>) {
    const processed = this.processedAgentItems.get(messageID);
    processed?.forEach((identity) => {
      if (identity.startsWith('position:') && !identities.has(identity)) {
        processed.delete(identity);
      }
    });
  }

  clearProcessedAgentItems() {
    this.processedAgentItems.clear();
  }

  /**
   * Removes the messages with the given IDs from the chat view.
   */
  async removeMessages(messageIDs: string[]) {
    this.pendingReceiveRemovals.forEach((removedIDs) => {
      messageIDs.forEach((id) => removedIDs.add(id));
    });
    for (const id of messageIDs) {
      this.processedAgentItems.delete(id);
      this.serviceManager.messageUpsertCoordinator.clear(id);
    }
    this.serviceManager.store.dispatch(actions.removeMessages(messageIDs));
  }

  /**
   * Inserts the given messages into the chat window as part of the chat history. This will fire the history:begin
   * and history:end events.
   */
  async insertHistory(messages: HistoryItem[]) {
    // If we're inserting more history into a chat that already has messages, we want to preserve the relative
    // scroll position of the existing messages from the bottom.
    const scrollBottom =
      this.serviceManager.mainWindow?.getMessagesScrollBottom();

    const state = this.serviceManager.store.getState();

    // TODO: This doesn't work right if this is called more than once.
    const notes: { notes: HistoryNote[] } = {
      notes: [{ body: messages }],
    };
    const history = await this.serviceManager.historyService.loadHistory(notes);

    // If no history was loaded, there's nothing to do
    if (!history) {
      return;
    }

    // Merge the existing state on top of the new state (with the current state taking precedence over anything
    // that that's in the inserted state).
    const currentAppStateMessages: AppStateMessages = {
      allMessageItemsByID: state.allMessageItemsByID,
      allMessagesByID: state.allMessagesByID,
      assistantMessageState: state.assistantMessageState,
    };
    const newAppStateMessages: AppStateMessages = merge(
      {},
      history.messageHistory,
      currentAppStateMessages
    );

    // Now make sure the message arrays are merged correctly.
    newAppStateMessages.assistantMessageState.messageIDs = [
      ...history.messageHistory.assistantMessageState.messageIDs,
      ...currentAppStateMessages.assistantMessageState.messageIDs,
    ];
    newAppStateMessages.assistantMessageState.localMessageIDs = [
      ...history.messageHistory.assistantMessageState.localMessageIDs,
      ...currentAppStateMessages.assistantMessageState.localMessageIDs,
    ];

    this.serviceManager.store.dispatch(
      actions.hydrateMessageHistory(newAppStateMessages)
    );

    // History messages are semantically COMPLETE — record so a later upsertMessage on
    // a historical id suppresses `pre:receive` / `receive`.
    const upsertCoordinator = this.serviceManager.messageUpsertCoordinator;
    for (const historicalID of history.messageHistory.assistantMessageState
      .messageIDs) {
      const historicalMessage =
        history.messageHistory.allMessagesByID[historicalID];
      if (historicalMessage && isResponse(historicalMessage)) {
        upsertCoordinator.markComplete(historicalID);
      }
    }

    const mergedIDs = newAppStateMessages.assistantMessageState.messageIDs;
    // The active response is simply the last message response in order (requests are ignored).
    const lastId =
      mergedIDs.length > 0 ? mergedIDs[mergedIDs.length - 1] : null;
    const lastMessage = lastId
      ? newAppStateMessages.allMessagesByID[lastId]
      : null;
    const activeResponseId =
      lastMessage && isResponse(lastMessage) ? lastMessage.id : null;

    this.serviceManager.store.dispatch(
      actions.setActiveResponseId(activeResponseId)
    );
    await this.serviceManager.slotEventService.createElementsForUserDefinedResponses(
      history.messageHistory
    );
    await this.serviceManager.slotEventService.replayFooterSlots(
      history.messageHistory
    );

    // Restore the scroll position.
    this.serviceManager.mainWindow?.doAutoScroll({
      scrollToBottom: scrollBottom,
    });
  }
}

export { ReceiveService };
