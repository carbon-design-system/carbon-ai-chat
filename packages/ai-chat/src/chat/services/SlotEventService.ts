/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { asyncForEach } from '../utils/lang/arrayUtils';
import {
  getRequestFooterSlotName,
  hasRequestFooter,
  isResponse,
  isResponseWithNestedItems,
  renderAsUserDefinedMessage,
  streamItemID,
} from '../utils/messageUtils';
import {
  BusEventChunkUserDefinedResponse,
  BusEventCustomFooterSlot,
  BusEventCustomRequestFooterSlot,
  BusEventType,
  BusEventUserDefinedResponse,
} from '../../types/events/eventBusTypes';
import { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import { DeepPartial } from '../../types/utilities/DeepPartial';
import {
  GenericItem,
  Message,
  MessageRequest,
  MessageResponse,
  PartialOrCompleteItemChunk,
} from '../../types/messaging/Messages';
import { AppStateMessages } from '../../types/state/AppState';
import { MessageState } from '../../types/config/MessagingConfig';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import cloneDeep from 'lodash-es/cloneDeep.js';
import { deepFreeze } from '../utils/lang/objectUtils';
import type {
  ServiceManager,
  UserDefinedElementRegistryItem,
} from './ServiceManager';

function ownEventData<Data>(data: Data): Data {
  return deepFreeze(cloneDeep(data));
}

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
  async handleUserDefinedResponseItems(
    localMessage: LocalMessageItem,
    originalMessage: Message,
    messageState?: MessageState,
    localItemsByID: Record<
      string,
      LocalMessageItem
    > = this.serviceManager.store.getState().allMessageItemsByID
  ) {
    if (renderAsUserDefinedMessage(localMessage.item)) {
      let slotName: string;
      if (!localMessage.item.user_defined?.silent) {
        ({ slotName } = this.getOrCreateUserDefinedElement(
          localMessage.ui_state.id
        ));
      }

      const userDefinedResponseEvent: BusEventUserDefinedResponse = {
        type: BusEventType.USER_DEFINED_RESPONSE,
        data: ownEventData({
          message: localMessage.item,
          fullMessage: originalMessage,
          slot: slotName,
          state: messageState,
        }),
      };

      await this.serviceManager.fire(userDefinedResponseEvent);
    } else if (isResponseWithNestedItems(localMessage.item)) {
      const {
        itemsLocalMessageItemIDs,
        bodyLocalMessageItemIDs,
        footerLocalMessageItemIDs,
        gridLocalMessageItemIDs,
      } = localMessage.ui_state;

      const createElementForNestedUserDefinedResponse = (
        localMessageItemID: string
      ) => {
        const nestedLocalMessage = localItemsByID[localMessageItemID];
        return this.handleUserDefinedResponseItems(
          nestedLocalMessage,
          originalMessage,
          messageState,
          localItemsByID
        );
      };

      if (gridLocalMessageItemIDs?.length) {
        await asyncForEach(gridLocalMessageItemIDs, (row) =>
          asyncForEach(row, (cell) =>
            asyncForEach(cell, (itemID) =>
              createElementForNestedUserDefinedResponse(itemID)
            )
          )
        );
      }

      if (itemsLocalMessageItemIDs?.length) {
        await asyncForEach(
          itemsLocalMessageItemIDs,
          createElementForNestedUserDefinedResponse
        );
      }

      if (bodyLocalMessageItemIDs?.length) {
        await asyncForEach(
          bodyLocalMessageItemIDs,
          createElementForNestedUserDefinedResponse
        );
      }

      if (footerLocalMessageItemIDs?.length) {
        await asyncForEach(
          footerLocalMessageItemIDs,
          createElementForNestedUserDefinedResponse
        );
      }
    }
  }

  /**
   * If the given message should be rendered as a user defined message, this will create a host element for the message
   * and fire the {@link BusEventType.CHUNK_USER_DEFINED_RESPONSE} event so that the event listeners can attach whatever
   * they want to the host element.
   *
   * Note, this function does not currently support nested items inside the chunk.
   */
  async handleUserDefinedResponseItemsChunk(
    messageID: string,
    chunk: PartialOrCompleteItemChunk,
    messageItem: DeepPartial<GenericItem>
  ) {
    if (renderAsUserDefinedMessage(messageItem)) {
      const itemID = streamItemID(messageID, messageItem);

      let slotName: string;
      if (!messageItem.user_defined?.silent) {
        ({ slotName } = this.getOrCreateUserDefinedElement(itemID));
      }

      const userDefinedResponseEvent: BusEventChunkUserDefinedResponse = {
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        data: ownEventData({
          messageItem,
          chunk,
          slot: slotName,
        }),
      };

      await this.serviceManager.fire(userDefinedResponseEvent);
    }
  }

  /**
   * If the given message should contain a custom footer slot, this will fire the {@link BusEventType.CUSTOM_FOOTER_SLOT}
   * event so that the event listeners can attach whatever they want to the host element.
   */
  async handleCustomFooterSlot(
    localMessage: LocalMessageItem,
    originalMessage: MessageResponse
  ) {
    const footerOptions =
      localMessage.item.message_item_options?.custom_footer_slot;

    if (footerOptions && footerOptions.is_on !== false) {
      const customFooterSlotEvent: BusEventCustomFooterSlot = {
        type: BusEventType.CUSTOM_FOOTER_SLOT,
        data: ownEventData({
          slotName: footerOptions.slot_name,
          messageItem: localMessage.item,
          message: originalMessage,
          additionalData: footerOptions.additional_data,
        }),
      };

      await this.serviceManager.fire(customFooterSlotEvent);
    }
  }

  /**
   * Fires the {@link BusEventType.CUSTOM_REQUEST_FOOTER_SLOT} event for a user message so that listeners can attach
   * whatever they want below it. Unlike the assistant side there are no options on the message to read, so the chat
   * mints the slot name itself.
   */
  async handleCustomRequestFooterSlot(
    localMessage: LocalMessageItem,
    originalMessage: MessageRequest
  ) {
    if (
      originalMessage.history?.silent ||
      !hasRequestFooter(localMessage, originalMessage)
    ) {
      return;
    }

    const customRequestFooterSlotEvent: BusEventCustomRequestFooterSlot = {
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      data: ownEventData({
        slotName: getRequestFooterSlotName(localMessage),
        message: originalMessage,
      }),
    };

    await this.serviceManager.fire(customRequestFooterSlotEvent);
  }

  /**
   * Creates the custom response elements for all the messages in the given set. This is used in particular when
   * loading a list of messages from history.
   */
  async createElementsForUserDefinedResponses(messages: AppStateMessages) {
    await asyncForEach(
      Object.values(messages.allMessageItemsByID),
      (localMessage) => {
        const originalMessage =
          messages.allMessagesByID[localMessage.fullMessageID];
        const messageState = isResponse(originalMessage)
          ? MessageState.COMPLETE
          : undefined;
        return this.handleUserDefinedResponseItems(
          localMessage,
          originalMessage,
          messageState
        );
      }
    );
  }

  /**
   * Fires the footer-slot events for messages restored from history, in both directions.
   *
   * The live events fire from `MessageUpsertCoordinator` and `doSend`, neither of which runs during hydration, so
   * without this a restored message renders its slot and nothing ever fills it.
   *
   * Outbound slot names are minted from the local item's id, and a restore always mints a fresh one — the merge in
   * `insertHistory` keys on that id, so it never matches an existing entry. Replaying the same messages therefore
   * fires them again under new slot names and leaves the previous wrappers in place until a restart.
   */
  async replayFooterSlots(messages: AppStateMessages) {
    await asyncForEach(
      messages.assistantMessageState.localMessageIDs,
      (localMessageID) => {
        const localMessage = messages.allMessageItemsByID[localMessageID];
        const originalMessage =
          messages.allMessagesByID[localMessage?.fullMessageID];

        if (!localMessage || !originalMessage) {
          return undefined;
        }

        if (isResponse(originalMessage)) {
          return this.handleCustomFooterSlot(localMessage, originalMessage);
        }

        return this.handleCustomRequestFooterSlot(
          localMessage,
          originalMessage as MessageRequest
        );
      }
    );
  }
}

export { SlotEventService };
