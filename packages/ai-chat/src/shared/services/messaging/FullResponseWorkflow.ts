/*
 *  Copyright IBM Corp. 2026
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
import { consoleError } from '../../utils/miscUtils';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import {
  createMessageResponseForText,
  isResponse,
  isConnectToHumanAgent,
  addDefaultsToMessage,
  isPause,
  isHiddenOutputItem,
  streamItemID,
} from '../../utils/messageUtils';
import {
  BusEventType,
  type BusEventPreReceive,
} from '../../../types/events/eventBusTypes';
import {
  MessageResponseTypes,
  type MessageRequest,
  type MessageResponse,
  type PauseItem,
} from '../../../types/messaging/Messages';
import type { LocalMessageItem } from '../../../types/messaging/LocalMessageItem';
import { OnErrorType } from '../../../types/config/ErrorConfig';
import {
  MessageState,
  type UpsertMessageUpdater,
} from '../../../types/config/MessagingConfig';
import type { ServiceManager } from '../ServiceManager';
import type { UpsertStamp } from './incomingWriteTypes';
import { IncomingMessageService } from './inbound/IncomingMessageService';
import {
  outputItemToLocalItem,
  createLocalMessageItemsForNestedMessageItems,
} from '../../schema/outputItemToLocalItem';

class FullResponseWorkflow {
  private processedAgentItems = new Map<string, Set<string>>();
  private pendingReceiveRemovals = new Set<Set<string>>();
  private readonly incomingMessageService = new IncomingMessageService();
  constructor(private serviceManager: ServiceManager) {}

  async receive(
    message: MessageResponse,
    isLatestWelcomeNode = false,
    requestMessage?: MessageRequest,
    origin: 'addMessage' | 'chunk' = 'addMessage',
    isCallerCurrent: () => boolean = () => true
  ) {
    const { restartCount: initialRestartCount } = this.serviceManager;
    const { messageCoordinator: messageService } = this.serviceManager;
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
    // A handler may change the ID; a streamed reply shows under this one.
    const receivedID = message.id;

    const write = this.serviceManager.messageCoordinator.trackIncomingWrite(
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

      if (this.isOvertaken(message, initialRestartCount, isCurrent)) {
        // If a restart occurred during the await above, we need to exit.
        return;
      }
      if (preReceiveEvent.cancel) {
        await this.dropCanceledReply(receivedID);
        return;
      }

      this.serviceManager.messageCoordinator.responseReceived(
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
        this.serviceManager.messageCoordinator.markIncomingComplete(message.id);
      }
    } finally {
      this.pendingReceiveRemovals.delete(removedIDs);
      write.release();
    }
  }

  /** True when a restart or removal while the `pre:receive` handlers ran overtook this write. */
  private isOvertaken(
    message: MessageResponse,
    initialRestartCount: number,
    isCurrent: () => boolean
  ) {
    return (
      !isCurrent() ||
      initialRestartCount !== this.serviceManager.restartCount ||
      this.serviceManager.messageCoordinator.isRequestFromPreviousConversation(
        message.request_id
      )
    );
  }

  private writeReceivedMessage(
    message: MessageResponse,
    options: MessageWriteOptions
  ): Promise<void> {
    return this.serviceManager.messageCoordinator.upsertMessage(
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

  async removeMessages(messageIDs: string[]) {
    this.pendingReceiveRemovals.forEach((removedIDs) => {
      messageIDs.forEach((id) => removedIDs.add(id));
    });
    for (const id of messageIDs) {
      this.processedAgentItems.delete(id);
      this.serviceManager.messageCoordinator.clearIncomingMessage(id);
    }
    this.serviceManager.store.dispatch(actions.removeMessages(messageIDs));
  }

  /**
   * Keeps a reply out of the conversation after a `pre:receive` handler canceled it. A reply
   * that is still streaming already shows, so its stream ends the way a final response ends
   * it, and then the reply is removed. A settled message stored under the ID stays.
   */
  async dropCanceledReply(messageID: string) {
    const coordinator = this.serviceManager.messageCoordinator;
    if (!coordinator.isResponseStreaming(messageID)) {
      return;
    }
    coordinator.finalizeStreamingMessage(messageID);
    await this.removeMessages([messageID]);
    // Removal hides the button only for upsert streams; a chunk stream needs it here.
    coordinator.hideStopStreamingButtonIfIdle();
  }

  async runReceivedWrite(
    messageID: string,
    updater: UpsertMessageUpdater,
    options: MessageWriteOptions,
    stamp: UpsertStamp
  ): Promise<void> {
    const initialRestartCount = options.restartCount ?? stamp.restartCount;
    const message = await updater(
      this.serviceManager.store.getState().allMessagesByID[
        messageID
      ] as MessageResponse
    );
    const isCurrent = () =>
      !this.serviceManager.messageCoordinator.isIncomingWriteStale(
        stamp,
        message.request_id
      ) && initialRestartCount === this.serviceManager.restartCount;
    if (!isCurrent()) {
      return;
    }

    // Reveals outlive receive(), so they retain the same removal guard separately.
    const reveal =
      this.serviceManager.messageCoordinator.incomingWriteLifetime.trackWrite(
        messageID
      );
    this.storeReceivedMessage(message, options, isCurrent, initialRestartCount)
      .catch((error) => {
        consoleError('Error processing the message response', error);
      })
      .finally(reveal.release);

    if (!isCurrent()) {
      return;
    }
    if (!options.isLatestWelcomeNode) {
      this.serviceManager.store.dispatch(
        actions.updateHasSentNonWelcomeMessage(true)
      );
    }
    if (!isCurrent()) {
      return;
    }
    deepFreeze(message);
    const storedMessage =
      this.serviceManager.store.getState().allMessagesByID[messageID];
    if (storedMessage) {
      deepFreeze(storedMessage);
    }
    await this.serviceManager.fire(
      {
        type: BusEventType.RECEIVE,
        data: message,
      },
      isCurrent
    );
    if (isCurrent()) {
      this.serviceManager.messageCoordinator.markIncomingComplete(messageID);
    }
  }

  /**
   * Stores a message from `addMessage` or `final_response`, then shows its items. Only the
   * part before the first item's wait runs before `receive` fires.
   */
  private async storeReceivedMessage(
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
        await this.handleConnectToHumanAgent(localItem, message, isCurrent, {
          identity: this.agentItemIdentity(message, index),
          deduplicateByLocalID: true,
        });
      }
      if (isPause(item)) {
        await this.serviceManager.messageCoordinator.waitForPause(
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

  agentItemIdentity(message: MessageResponse, index: number): string {
    const item = message.output.generic[index];
    const position = message.output.generic
      .slice(0, index)
      .filter((previous) => previous && !isPause(previous)).length;
    const streamID = streamItemID(message.id, item);
    return streamID ? `stream:${streamID}` : `position:${position}`;
  }
}

export { FullResponseWorkflow };
