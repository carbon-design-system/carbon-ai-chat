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
import { AppStateMessages } from '../../types/state/AppState';
import { deepFreeze } from '../utils/lang/objectUtils';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import {
  createMessageResponseForText,
  isResponse,
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
import { MessageState } from '../../types/config/MessagingConfig';
import { HistoryItem, HistoryNote } from '../../types/messaging/History';
import type { ServiceManager } from './ServiceManager';

class ReceiveService {
  private serviceManager: ServiceManager;

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
   * @param _isLatestWelcomeNode Indicates if this message is a new welcome message that has just been shown to the user
   * and isn't a historical welcome message.
   * @param requestMessage The optional {@link MessageRequest} that this response is a response to.
   * @param _origin The public method the message comes from: `addMessage`, or `addMessageChunk` for the
   * `final_response` that completes a stream.
   */
  async receive(
    message: MessageResponse,
    _isLatestWelcomeNode = false,
    requestMessage?: MessageRequest,
    _origin: 'addMessage' | 'chunk' = 'addMessage'
  ) {
    const { restartCount: initialRestartCount } = this.serviceManager;

    // Received messages should be given an id if they don't have one.
    if (!message.id) {
      message.id = uuid();
    }

    const preReceiveEvent: BusEventPreReceive = {
      type: BusEventType.PRE_RECEIVE,
      data: message,
    };
    // Fire the pre:receive event. User code is allowed to modify the message at this point.
    await this.serviceManager.fire(preReceiveEvent);

    if (initialRestartCount !== this.serviceManager.restartCount) {
      // If a restart occurred during the await above, we need to exit.
      return;
    }

    if (initialRestartCount !== this.serviceManager.restartCount) {
      // If a restart occurred during the await above, we need to exit.
      return;
    }

    if (isResponse(message as any)) {
      // Pre-mark COMPLETE so the coordinator skips event re-firing — we already fired
      // pre:receive above and will fire receive below.
      this.serviceManager.messageUpsertCoordinator.markComplete(message.id);
      await this.writeReceivedMessage(message);
      // Now freeze and fire receive after the store has been updated.
      deepFreeze(message);
      await this.serviceManager.fire({
        type: BusEventType.RECEIVE,
        data: message,
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

    // Now freeze the message so nobody can mess with it since that object came from outside.
    deepFreeze(message);

    // Don't fire with the cloned message since we don't want to let anyone mess with it.
    await this.serviceManager.fire({
      type: BusEventType.RECEIVE,
      data: message,
    });

    // Record COMPLETE so a later `upsertMessage(id, MessageState.COMPLETE, ...)` for
    // the same id suppresses a second `pre:receive` / `receive`.
    this.serviceManager.messageUpsertCoordinator.markComplete(message.id);
  }

  /**
   * Writes a received message through the upsert coordinator as one COMPLETE upsert. It
   * resolves once `receive` has fired, and rejects when a `receive` handler throws. The
   * message's items keep showing after that, while the next write for its id runs.
   */
  private writeReceivedMessage(message: MessageResponse): Promise<void> {
    return this.serviceManager.messageUpsertCoordinator.upsert(
      message.id,
      MessageState.COMPLETE,
      () => message
    );
  }

  /**
   * Removes the messages with the given IDs from the chat view.
   */
  async removeMessages(messageIDs: string[]) {
    this.serviceManager.store.dispatch(actions.removeMessages(messageIDs));
    for (const id of messageIDs) {
      this.serviceManager.messageUpsertCoordinator.clear(id);
    }
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
