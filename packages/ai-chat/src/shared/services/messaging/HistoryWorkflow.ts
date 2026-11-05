/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import merge from 'lodash-es/merge.js';
import actions from '../../store/actions';
import {
  captureMessageOwnership,
  retainHistoryOwnership,
} from '../../store/messageOwnership';
import type { AppStateMessages } from '../../../types/state/AppState';
import { isResponse } from '../../utils/messageUtils';
import type {
  HistoryItem,
  HistoryNote,
} from '../../../types/messaging/History';
import type { LoadedHistory } from '../../schema/historyToMessages';
import type { ServiceManager } from '../ServiceManager';
import { retainCopiedNativeMessageOrigin } from './nativeMessageEvents';

class HistoryWorkflow {
  constructor(private serviceManager: ServiceManager) {}

  async insertHistory(messages: HistoryItem[]) {
    // If we're inserting more history into a chat that already has messages, we want to preserve the relative
    // scroll position of the existing messages from the bottom.
    const scrollBottom =
      this.serviceManager.messageCoordinator.getMessagesScrollBottom();

    const state = this.serviceManager.store.getState();
    const ownership = captureMessageOwnership(this.serviceManager.store);

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
    for (const [messageID, message] of Object.entries(
      currentAppStateMessages.allMessagesByID
    )) {
      const copied = newAppStateMessages.allMessagesByID[messageID];
      if (isResponse(message) && isResponse(copied)) {
        retainCopiedNativeMessageOrigin(message, copied);
      }
    }

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
      retainHistoryOwnership(
        actions.hydrateMessageHistory(newAppStateMessages),
        ownership
      )
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
    await this.serviceManager.messageCoordinator.createElementsForUserDefinedResponses(
      history.messageHistory
    );
    await this.serviceManager.messageCoordinator.replayFooterSlots(
      history.messageHistory
    );

    // Restore the scroll position.
    this.serviceManager.messageCoordinator.restoreMessagesScroll(scrollBottom);
  }

  async applyLoadedHistory(history: LoadedHistory): Promise<void> {
    const { serviceManager } = this;
    // User-defined response handlers read history from the store when their events fire.
    serviceManager.store.dispatch(
      actions.hydrateMessageHistory(history.messageHistory)
    );
    const { messageIDs } = history.messageHistory.assistantMessageState;
    const lastId = messageIDs[messageIDs.length - 1];
    const lastMessage = lastId
      ? history.messageHistory.allMessagesByID[lastId]
      : null;
    serviceManager.store.dispatch(
      actions.setActiveResponseId(
        lastMessage && isResponse(lastMessage) ? lastMessage.id : null
      )
    );
    await serviceManager.actions.createElementsForUserDefinedResponses(
      history.messageHistory
    );
    await serviceManager.actions.replayFooterSlots(history.messageHistory);

    if (history.latestPanelLocalMessageItem) {
      serviceManager.messageCoordinator.openHistoryResponsePanel(
        history.latestPanelLocalMessageItem
      );
    }
  }
}

export { HistoryWorkflow };
