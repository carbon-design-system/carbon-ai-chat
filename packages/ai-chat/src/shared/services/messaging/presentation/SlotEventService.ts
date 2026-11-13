/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { LocalMessageItem } from '../../../../types/messaging/LocalMessageItem';
import type { DeepPartial } from '../../../../types/utilities/DeepPartial';
import type {
  GenericItem,
  Message,
  MessageRequest,
  MessageResponse,
  PartialOrCompleteItemChunk,
} from '../../../../types/messaging/Messages';
import type { AppStateMessages } from '../../../../types/state/ChatMessagesState';
import type { MessageState } from '../../../../types/config/MessagingConfig';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import type {
  ServiceManager,
  UserDefinedElementRegistryItem,
} from '../../ServiceManager';

class SlotEventService {
  private serviceManager: ServiceManager;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Creates the HTML element for a user defined response and adds it to the registry (if it does not already exist).
   */
  getOrCreateUserDefinedElement(
    messageItemID: string
  ): UserDefinedElementRegistryItem {
    let userDefinedItem =
      this.serviceManager.userDefinedElementRegistry.get(messageItemID);
    if (!userDefinedItem) {
      userDefinedItem = {
        slotName: `slot-user-defined-${uuid()}`,
      };
      this.serviceManager.userDefinedElementRegistry.set(
        messageItemID,
        userDefinedItem
      );
    }
    return userDefinedItem;
  }

  /**
   * If the given message should be rendered as a user defined message, this will create a host element for the message
   * and fire the {@link BusEventType.USER_DEFINED_RESPONSE} event so that the event listeners can attach whatever they
   * want to the host element.
   *
   * Nested items are looked up in `localItemsByID`, which defaults to the store's. A
   * message from `addMessage` passes the items it built, since its events fire before
   * they are stored.
   */
  handleUserDefinedResponseItems(
    localMessage: LocalMessageItem,
    originalMessage: Message,
    messageState?: MessageState,
    localItemsByID: Record<
      string,
      LocalMessageItem
    > = this.serviceManager.store.getState().allMessageItemsByID,
    isCurrent: () => boolean = () => true
  ) {
    return this.serviceManager.messageCoordinator.handleUserDefinedResponseItems(
      localMessage,
      originalMessage,
      messageState,
      localItemsByID,
      isCurrent
    );
  }

  /**
   * If the given message should be rendered as a user defined message, this will create a host element for the message
   * and fire the {@link BusEventType.CHUNK_USER_DEFINED_RESPONSE} event so that the event listeners can attach whatever
   * they want to the host element.
   *
   * Note, this function does not currently support nested items inside the chunk.
   */
  handleUserDefinedResponseItemsChunk(
    messageID: string,
    chunk: PartialOrCompleteItemChunk,
    messageItem: DeepPartial<GenericItem>,
    isCurrent: () => boolean = () => true
  ) {
    return this.serviceManager.messageCoordinator.handleUserDefinedResponseItemsChunk(
      messageID,
      chunk,
      messageItem,
      isCurrent
    );
  }

  /**
   * If the given message should contain a custom footer slot, this will fire the {@link BusEventType.CUSTOM_FOOTER_SLOT}
   * event so that the event listeners can attach whatever they want to the host element.
   */
  handleCustomFooterSlot(
    localMessage: LocalMessageItem,
    originalMessage: MessageResponse,
    isCurrent: () => boolean = () => true
  ) {
    return this.serviceManager.messageCoordinator.handleCustomFooterSlot(
      localMessage,
      originalMessage,
      isCurrent
    );
  }

  /**
   * Fires the {@link BusEventType.CUSTOM_REQUEST_FOOTER_SLOT} event for a user message so that listeners can attach
   * whatever they want below it. Unlike the assistant side there are no options on the message to read, so the chat
   * mints the slot name itself.
   */
  handleCustomRequestFooterSlot(
    localMessage: LocalMessageItem,
    originalMessage: MessageRequest
  ) {
    return this.serviceManager.messageCoordinator.handleCustomRequestFooterSlot(
      localMessage,
      originalMessage
    );
  }

  /**
   * Creates the custom response elements for all the messages in the given set. This is used in particular when
   * loading a list of messages from history.
   */
  createElementsForUserDefinedResponses(messages: AppStateMessages) {
    return this.serviceManager.messageCoordinator.createElementsForUserDefinedResponses(
      messages
    );
  }

  /**
   * Fires the footer-slot events for messages restored from history, in both directions.
   *
   * The live events fire from `UpsertWorkflow` and `doSend`, neither of which runs during hydration, so
   * without this a restored message renders its slot and nothing ever fills it.
   *
   * Outbound slot names are minted from the local item's id, and a restore always mints a fresh one — the merge in
   * `insertHistory` keys on that id, so it never matches an existing entry. Replaying the same messages therefore
   * fires them again under new slot names and leaves the previous wrappers in place until a restart.
   */
  replayFooterSlots(messages: AppStateMessages) {
    return this.serviceManager.messageCoordinator.replayFooterSlots(messages);
  }
}

export { SlotEventService };
