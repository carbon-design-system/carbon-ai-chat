/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';
import merge from 'lodash-es/merge.js';
import actions from '../../../store/actions';
import type { AppStateMessages } from '../../../../types/state/AppState';
import { isResponse } from '../../../utils/messageUtils';
import type {
  MessageRequest,
  MessageResponse,
} from '../../../../types/messaging/Messages';
import type { LocalMessageItem } from '../../../../types/messaging/LocalMessageItem';
import type {
  HistoryItem,
  HistoryNote,
} from '../../../../types/messaging/History';
import type { ServiceManager } from '../../ServiceManager';

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
   * @param isLatestWelcomeNode Indicates if this message is a new welcome message that has just been shown to the user
   * and isn't a historical welcome message.
   * @param requestMessage The optional {@link MessageRequest} that this response is a response to.
   * @param origin The public method the message comes from: `addMessage`, or `addMessageChunk` for the
   * `final_response` that completes a stream.
   */
  receive(
    message: MessageResponse,
    isLatestWelcomeNode = false,
    requestMessage?: MessageRequest,
    origin: 'addMessage' | 'chunk' = 'addMessage',
    isCallerCurrent: () => boolean = () => true
  ) {
    return this.serviceManager.messageCoordinator.receive(
      message,
      isLatestWelcomeNode,
      requestMessage,
      origin,
      isCallerCurrent
    );
  }
  handleConnectToHumanAgent(
    localMessageItem: LocalMessageItem,
    fullMessage: MessageResponse,
    isCurrent: () => boolean = () => true,
    options: {
      identity?: string;
      deduplicateByLocalID?: boolean;
    } = {}
  ) {
    return this.serviceManager.messageCoordinator.handleConnectToHumanAgent(
      localMessageItem,
      fullMessage,
      isCurrent,
      options
    );
  }
  retainAgentItemPositions(messageID: string, identities: Set<string>) {
    return this.serviceManager.messageCoordinator.retainAgentItemPositions(
      messageID,
      identities
    );
  }
  clearProcessedAgentItems() {
    return this.serviceManager.messageCoordinator.clearProcessedAgentItems();
  }
  /**
   * Removes the messages with the given IDs from the chat view.
   */
  removeMessages(messageIDs: string[]) {
    return this.serviceManager.messageCoordinator.removeMessages(messageIDs);
  }
  /**
   * Inserts the given messages into the chat window as part of the chat history. This will fire the history:begin
   * and history:end events.
   */
  async insertHistory(messages: HistoryItem[]) {
    // If we're inserting more history into a chat that already has messages, we want to preserve the relative
    // scroll position of the existing messages from the bottom.
    const scrollBottom =
      this.serviceManager.messageCoordinator.getMessagesScrollBottom();

    const state = this.serviceManager.store.getState();

    // The chat writes its defaults onto each message, which a frozen one can't take.
    const items = messages?.map((item) =>
      item && Object.isFrozen(item.message)
        ? { ...item, message: cloneDeep(item.message) }
        : item
    );

    const notes: { notes: HistoryNote[] } = {
      notes: [{ body: items }],
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
    const inserted = history.messageHistory;
    const newAppStateMessages: AppStateMessages = merge(
      {},
      inserted,
      currentAppStateMessages
    );

    // A message inserted again appears once, at its first position, and takes the later call's content and items.
    const repeatedIDs = new Set(
      inserted.assistantMessageState.messageIDs.filter(
        (id) => state.allMessagesByID[id]
      )
    );
    const isRepeatedItem = (
      itemsByID: AppStateMessages['allMessageItemsByID'],
      localID: string
    ) => repeatedIDs.has(itemsByID[localID]?.fullMessageID);
    const currentLocalIDs =
      currentAppStateMessages.assistantMessageState.localMessageIDs;
    currentLocalIDs
      .filter((localID) => isRepeatedItem(state.allMessageItemsByID, localID))
      .forEach((localID) => {
        delete newAppStateMessages.allMessageItemsByID[localID];
      });
    inserted.assistantMessageState.localMessageIDs
      .filter((localID) =>
        isRepeatedItem(inserted.allMessageItemsByID, localID)
      )
      .forEach((localID) => {
        newAppStateMessages.allMessageItemsByID[localID] = merge(
          {},
          {
            [localID]: inserted.allMessageItemsByID[localID],
          }
        )[localID];
      });
    repeatedIDs.forEach((id) => {
      newAppStateMessages.allMessagesByID[id] = merge(
        {},
        {
          [id]: inserted.allMessagesByID[id],
        }
      )[id];
    });

    // Now make sure the message arrays are merged correctly.
    newAppStateMessages.assistantMessageState.messageIDs = [
      ...new Set([
        ...inserted.assistantMessageState.messageIDs,
        ...currentAppStateMessages.assistantMessageState.messageIDs,
      ]),
    ];
    newAppStateMessages.assistantMessageState.localMessageIDs = [
      ...inserted.assistantMessageState.localMessageIDs,
      ...currentLocalIDs.filter(
        (localID) => !isRepeatedItem(state.allMessageItemsByID, localID)
      ),
    ];

    this.serviceManager.store.dispatch(
      actions.hydrateMessageHistory(newAppStateMessages)
    );

    // History messages are semantically COMPLETE — record so a later upsertMessage on
    // a historical id suppresses `pre:receive` / `receive`.
    const upsertCoordinator = this.serviceManager.messageCoordinator;
    for (const historicalID of history.messageHistory.assistantMessageState
      .messageIDs) {
      const historicalMessage =
        history.messageHistory.allMessagesByID[historicalID];
      if (historicalMessage && isResponse(historicalMessage)) {
        upsertCoordinator.markIncomingComplete(historicalID);
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
    this.serviceManager.messageCoordinator.restoreMessagesScroll(scrollBottom);
  }
}

export { ReceiveService };
