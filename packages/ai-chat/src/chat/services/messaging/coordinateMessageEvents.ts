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
  isResponseWithNestedItems,
  renderAsUserDefinedMessage,
} from '../../utils/messageUtils';
import { captureMessageEvent } from '../../utils/messageEventOwnership';
import {
  BusEventType,
  type BusEventUserDefinedResponse,
} from '../../../types/events/eventBusTypes';
import type { LocalMessageItem } from '../../../types/messaging/LocalMessageItem';
import type { Message } from '../../../types/messaging/Messages';
import type { MessageState } from '../../../types/config/MessagingConfig';
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
