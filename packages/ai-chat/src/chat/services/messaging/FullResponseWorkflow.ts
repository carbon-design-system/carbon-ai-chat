/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from 'lodash-es/isEqual.js';
import actions from '../../store/actions';
import type {
  MessageWriteOptions,
  ReceivedLocalItems,
} from '../../store/messageWriteTypes';
import { deepFreeze } from '../../utils/lang/objectUtils';
import {
  addDefaultsToMessage,
  isConnectToHumanAgent,
  isPause,
  isHiddenOutputItem,
} from '../../utils/messageUtils';
import type {
  MessageResponse,
  PauseItem,
} from '../../../types/messaging/Messages';
import type { LocalMessageItem } from '../../../types/messaging/LocalMessageItem';
import { MessageState } from '../../../types/config/MessagingConfig';
import type { ServiceManager } from '../ServiceManager';
import { IncomingMessageService } from './inbound/IncomingMessageService';
import {
  outputItemToLocalItem,
  createLocalMessageItemsForNestedMessageItems,
} from '../../schema/outputItemToLocalItem';

class FullResponseWorkflow {
  private readonly incomingMessageService = new IncomingMessageService();
  constructor(private serviceManager: ServiceManager) {}

  /**
   * Stores a message from `addMessage` or `final_response`, then shows its items. Only the
   * part before the first item's wait runs before `receive` fires.
   */
  async storeReceivedMessage(
    message: MessageResponse,
    options: MessageWriteOptions,
    isCurrent: () => boolean,
    initialRestartCount: number
  ): Promise<void> {
    const { store, messageCoordinator: messageService } = this.serviceManager;

    message.request_id ??= options.requestMessage?.id;
    addDefaultsToMessage(message);
    let storedMessage: MessageResponse;
    const write = (received: ReceivedLocalItems) => {
      if (!isCurrent()) {
        return;
      }
      const owned = this.incomingMessageService.prepareReceivedMessage(
        message,
        received
      );
      if (Object.isFrozen(message)) {
        deepFreeze(owned.message);
      }
      if (
        received.localItem &&
        store.getState().allMessagesByID[message.id] === storedMessage &&
        !isEqual(storedMessage, message)
      ) {
        store.dispatch(actions.updateMessage(owned.message));
        storedMessage = owned.message;
      }
      if (!isCurrent()) {
        return;
      }
      store.dispatch(
        actions.upsertMessage(owned.message, false, undefined, {
          origin: options.origin,
          received: owned.received,
        })
      );
      if (!received.localItem) {
        storedMessage = store.getState().allMessagesByID[
          message.id
        ] as MessageResponse;
      }
    };
    write({ nestedLocalItems: [] });

    // `showStopButtonImmediately` put the button up for the request; the response takes
    // it down unless something is still streaming.
    if (
      store.getState().config.public.messaging?.showStopButtonImmediately &&
      !messageService.inboundStreaming.streamingMessageID
    ) {
      messageService.hideStopStreamingButtonIfNoUpsertStreaming();
    }

    await this.showReceivedItems(
      message,
      options.isLatestWelcomeNode,
      write,
      isCurrent,
      initialRestartCount
    );
  }

  /**
   * Shows the items of a message from `addMessage` or `final_response` one at a time, in
   * `output.generic` order. A pause waits, with the typing indicator up when it asks for
   * one. A `connect_to_agent` item checks agent availability first, including a hidden
   * one. Every other item fires its `userDefinedResponse` and footer events, then shows,
   * unless it is hidden. Once `isCurrent` turns false, nothing more shows.
   */
  private async showReceivedItems(
    message: MessageResponse,
    isLatestWelcomeNode: boolean,
    write: (received: ReceivedLocalItems) => void,
    isCurrent: () => boolean,
    initialRestartCount: number
  ): Promise<void> {
    const { store, actions: chatActions } = this.serviceManager;
    const generic = message.output.generic;
    let addAfterID: string;

    for (let index = 0; index < generic.length && isCurrent(); index++) {
      const item = generic[index];
      if (!item) {
        continue;
      }
      const localItem = outputItemToLocalItem(
        item,
        message,
        isLatestWelcomeNode
      );
      const nestedLocalItems: LocalMessageItem[] = [];
      createLocalMessageItemsForNestedMessageItems(
        localItem,
        message,
        false,
        nestedLocalItems,
        true
      );
      const nestedLocalItemsByID = Object.fromEntries(
        nestedLocalItems.map((nested) => [nested.ui_state.id, nested])
      );
      if (isConnectToHumanAgent(item)) {
        // Mark the item handled before the async availability check, so a later
        // native upsertMessage COMPLETE write doesn't re-run the check for the same item.
        store.dispatch(
          actions.setMessageUIProperty(
            localItem.ui_state.id,
            'connectToAgentHandled',
            true
          )
        );
        await this.serviceManager.receiveService.handleConnectToHumanAgent(
          localItem,
          message,
          isCurrent,
          {
            identity:
              this.serviceManager.messageUpsertCoordinator.agentItemIdentity(
                message,
                index
              ),
            deduplicateByLocalID: true,
          }
        );
      }
      if (isPause(item)) {
        await this.serviceManager.chunkProcessingService.waitForPause(
          item as PauseItem,
          initialRestartCount
        );
        continue;
      }
      if (!isCurrent()) {
        return;
      }
      await chatActions.handleUserDefinedResponseItems(
        localItem,
        message,
        MessageState.COMPLETE,
        nestedLocalItemsByID,
        isCurrent
      );
      if (!isCurrent()) {
        return;
      }
      await chatActions.handleCustomFooterSlot(localItem, message, isCurrent);
      if (!isHiddenOutputItem(message, item) && isCurrent()) {
        write({
          localItem,
          nestedLocalItems,
          addAfterID,
        });
        addAfterID = localItem.ui_state.id;
      }
    }
  }
}

export { FullResponseWorkflow };
