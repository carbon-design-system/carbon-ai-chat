/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { asyncForEach } from '../../utils/lang/arrayUtils';
import {
  getRequestFooterSlotName,
  hasRequestFooter,
  isResponse,
  streamItemID,
  isResponseWithNestedItems,
  renderAsUserDefinedMessage,
} from '../../utils/messageUtils';
import { captureMessageEvent } from '../../utils/messageEventOwnership';
import {
  BusEventType,
  type BusEventUserDefinedResponse,
  type BusEventChunkUserDefinedResponse,
  type BusEventCustomFooterSlot,
  type BusEventCustomRequestFooterSlot,
} from '../../../types/events/eventBusTypes';
import type { LocalMessageItem } from '../../../types/messaging/LocalMessageItem';
import type {
  GenericItem,
  Message,
  MessageRequest,
  MessageResponse,
  PartialOrCompleteItemChunk,
} from '../../../types/messaging/Messages';
import { MessageState } from '../../../types/config/MessagingConfig';
import type { AppStateMessages } from '../../../types/state/AppState';
import type { DeepPartial } from '../../../types/utilities/DeepPartial';
import type { ServiceManager } from '../ServiceManager';
import type { MessagePresentationPort } from './presentationPort';

/** Delivers response-tree events and commits guarded legacy callback edits. */
export async function coordinateUserDefinedResponseItems(
  serviceManager: ServiceManager,
  presentation: MessagePresentationPort | undefined,
  localMessage: LocalMessageItem,
  originalMessage: Message,
  messageState?: MessageState,
  localItemsByID: Record<
    string,
    LocalMessageItem
  > = serviceManager.store.getState().allMessageItemsByID,
  isCurrent: () => boolean = () => true
) {
  if (!isCurrent()) {
    return;
  }
  if (
    !renderAsUserDefinedMessage(localMessage.item) &&
    !isResponseWithNestedItems(localMessage.item)
  ) {
    return;
  }
  const state = serviceManager.store.getState();
  if (
    !Object.isFrozen(originalMessage) &&
    (state.allMessagesByID[originalMessage.id] === originalMessage ||
      state.allMessageItemsByID[localMessage.ui_state.id] === localMessage)
  ) {
    const localItems = Object.fromEntries(
      Object.entries(localItemsByID).filter(
        ([, item]) => item.fullMessageID === originalMessage.id
      )
    );
    const write = serviceManager.messageUpsertCoordinator.trackWrite(
      originalMessage.id
    );
    const isEventCurrent = () => isCurrent() && write.isCurrent();
    const eventValues = captureMessageEvent(
      serviceManager,
      originalMessage,
      localItems,
      undefined,
      isEventCurrent
    );
    try {
      await coordinateUserDefinedResponseItems(
        serviceManager,
        presentation,
        eventValues.localItems[localMessage.ui_state.id] ?? localMessage,
        eventValues.message,
        messageState,
        eventValues.localItems,
        isEventCurrent
      );
    } finally {
      try {
        eventValues.commit();
      } finally {
        write.release();
      }
    }
    return;
  }
  if (renderAsUserDefinedMessage(localMessage.item)) {
    let slotName: string;
    if (!localMessage.item.user_defined?.silent) {
      slotName = presentation?.getUserDefinedResponseSlot?.(
        localMessage.ui_state.id
      );
    }

    const userDefinedResponseEvent: BusEventUserDefinedResponse = {
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: {
        message: localMessage.item,
        fullMessage: originalMessage,
        slot: slotName,
        state: messageState,
      },
    };

    await serviceManager.fire(userDefinedResponseEvent, isCurrent);
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
      return coordinateUserDefinedResponseItems(
        serviceManager,
        presentation,
        nestedLocalMessage,
        originalMessage,
        messageState,
        localItemsByID,
        isCurrent
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

export async function handleUserDefinedResponseItemsChunk(
  serviceManager: ServiceManager,
  presentation: MessagePresentationPort | undefined,
  messageID: string,
  chunk: PartialOrCompleteItemChunk,
  messageItem: DeepPartial<GenericItem>,
  isCurrent: () => boolean = () => true
) {
  if (!isCurrent()) {
    return;
  }
  if (renderAsUserDefinedMessage(messageItem)) {
    const itemID = streamItemID(messageID, messageItem);

    let slotName: string;
    if (!messageItem.user_defined?.silent) {
      slotName = presentation?.getUserDefinedResponseSlot?.(itemID);
    }

    const userDefinedResponseEvent: BusEventChunkUserDefinedResponse = {
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      data: {
        messageItem,
        chunk,
        slot: slotName,
      },
    };

    await serviceManager.fire(userDefinedResponseEvent, isCurrent);
  }
}

export async function handleCustomFooterSlot(
  serviceManager: ServiceManager,
  localMessage: LocalMessageItem,
  originalMessage: MessageResponse,
  isCurrent: () => boolean = () => true
) {
  if (!isCurrent()) {
    return;
  }
  const footerOptions =
    localMessage.item.message_item_options?.custom_footer_slot;
  if (!footerOptions || footerOptions.is_on === false) {
    return;
  }
  const state = serviceManager.store.getState();
  if (
    !Object.isFrozen(originalMessage) &&
    (state.allMessagesByID[originalMessage.id] === originalMessage ||
      state.allMessageItemsByID[localMessage.ui_state.id] === localMessage)
  ) {
    const write = serviceManager.messageUpsertCoordinator.trackWrite(
      originalMessage.id
    );
    const isEventCurrent = () => isCurrent() && write.isCurrent();
    const eventValues = captureMessageEvent(
      serviceManager,
      originalMessage,
      {
        [localMessage.ui_state.id]: localMessage,
      },
      undefined,
      isEventCurrent
    );
    try {
      await handleCustomFooterSlot(
        serviceManager,
        eventValues.localItems[localMessage.ui_state.id],
        eventValues.message as MessageResponse,
        isEventCurrent
      );
    } finally {
      try {
        eventValues.commit();
      } finally {
        write.release();
      }
    }
    return;
  }
  {
    const customFooterSlotEvent: BusEventCustomFooterSlot = {
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      data: {
        slotName: footerOptions.slot_name,
        messageItem: localMessage.item,
        message: originalMessage,
        additionalData: footerOptions.additional_data,
      },
    };

    await serviceManager.fire(customFooterSlotEvent, isCurrent);
  }
}

export async function handleCustomRequestFooterSlot(
  serviceManager: ServiceManager,
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
    data: {
      slotName: getRequestFooterSlotName(localMessage),
      message: originalMessage,
    },
  };

  await serviceManager.fire(customRequestFooterSlotEvent);
}

export async function createElementsForUserDefinedResponses(
  serviceManager: ServiceManager,
  presentation: MessagePresentationPort | undefined,
  messages: AppStateMessages
) {
  await asyncForEach(
    Object.values(messages.allMessageItemsByID),
    (localMessage) => {
      const originalMessage =
        messages.allMessagesByID[localMessage.fullMessageID];
      const messageState = isResponse(originalMessage)
        ? MessageState.COMPLETE
        : undefined;
      return coordinateUserDefinedResponseItems(
        serviceManager,
        presentation,
        localMessage,
        originalMessage,
        messageState
      );
    }
  );
}

export async function replayFooterSlots(
  serviceManager: ServiceManager,
  messages: AppStateMessages
) {
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
        return handleCustomFooterSlot(
          serviceManager,
          localMessage,
          originalMessage
        );
      }

      return handleCustomRequestFooterSlot(
        serviceManager,
        localMessage,
        originalMessage as MessageRequest
      );
    }
  );
}
