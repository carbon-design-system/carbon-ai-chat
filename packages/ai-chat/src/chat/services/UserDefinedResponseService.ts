/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ServiceManager } from "./ServiceManager";
import { asyncForEach } from "../utils/lang/arrayUtils";
import { uuid } from "../utils/lang/uuid";
import { renderAsUserDefinedMessage } from "../utils/messageUtils";
import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
import { Message } from "../../types/messaging/Messages";
import {
  BusEventType,
  BusEventUserDefinedResponse,
} from "../../types/events/eventBusTypes";
import { AppStateMessages } from "../../types/state/AppState";

/**
 * Service responsible for handling user-defined custom responses.
 * Manages the element registry and fires events for custom response rendering.
 */
export class UserDefinedResponseService {
  private serviceManager: ServiceManager;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Creates the HTML element for a user defined response and adds it to the registry (if it does not already exist).
   */
  getOrCreateUserDefinedElement(messageItemID: string) {
    let userDefinedItem =
      this.serviceManager.userDefinedElementRegistry.get(messageItemID);
    if (!userDefinedItem) {
      userDefinedItem = {
        slotName: `slot-user-defined-${uuid()}`,
      };
      this.serviceManager.userDefinedElementRegistry.set(
        messageItemID,
        userDefinedItem,
      );
    }
    return userDefinedItem;
  }

  /**
   * If the given message should be rendered as a user defined message, this will create a host element for the message
   * and fire the {@link BusEventType.USER_DEFINED_RESPONSE} event so that the event listeners can attach whatever they
   * want to the host element.
   */
  async handleUserDefinedResponseItems(
    localMessage: LocalMessageItem,
    originalMessage: Message,
  ) {
    if (renderAsUserDefinedMessage(localMessage.item)) {
      let slotName: string;
      if (!localMessage.item.user_defined?.silent) {
        // If the message is silent, don't create a host element for it since it's not going to be rendered.
        ({ slotName } = this.getOrCreateUserDefinedElement(
          localMessage.ui_state.id,
        ));
      }

      const userDefinedResponseEvent: BusEventUserDefinedResponse = {
        type: BusEventType.USER_DEFINED_RESPONSE,
        data: {
          message: localMessage.item,
          fullMessage: originalMessage,
          slot: slotName,
        },
      };

      await this.serviceManager.fire(userDefinedResponseEvent);
    } else if (this.isResponseWithNestedItems(localMessage.item)) {
      const {
        itemsLocalMessageItemIDs,
        bodyLocalMessageItemIDs,
        footerLocalMessageItemIDs,
        gridLocalMessageItemIDs,
      } = localMessage.ui_state;
      const { allMessageItemsByID } = this.serviceManager.store.getState();

      /**
       * Will attempt to create an element for the custom response using the provided local message id.
       */
      const createElementForNestedUserDefinedResponse = (
        localMessageItemID: string,
      ) => {
        const nestedLocalMessage = allMessageItemsByID[localMessageItemID];
        return this.handleUserDefinedResponseItems(
          nestedLocalMessage,
          originalMessage,
        );
      };

      if (gridLocalMessageItemIDs?.length) {
        await asyncForEach(gridLocalMessageItemIDs, (row) =>
          asyncForEach(row, (cell) =>
            asyncForEach(cell, (itemID) =>
              createElementForNestedUserDefinedResponse(itemID),
            ),
          ),
        );
      }

      if (itemsLocalMessageItemIDs?.length) {
        await asyncForEach(
          itemsLocalMessageItemIDs,
          createElementForNestedUserDefinedResponse,
        );
      }

      if (bodyLocalMessageItemIDs?.length) {
        await asyncForEach(
          bodyLocalMessageItemIDs,
          createElementForNestedUserDefinedResponse,
        );
      }

      if (footerLocalMessageItemIDs?.length) {
        await asyncForEach(
          footerLocalMessageItemIDs,
          createElementForNestedUserDefinedResponse,
        );
      }
    }
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
        return this.handleUserDefinedResponseItems(
          localMessage,
          originalMessage,
        );
      },
    );
  }

  /**
   * Helper to check if an item has nested items (avoiding circular dependency with messageUtils).
   */
  private isResponseWithNestedItems(item: any): boolean {
    return (
      item &&
      (item.items?.length > 0 ||
        item.body?.length > 0 ||
        item.footer?.length > 0 ||
        item.grid?.length > 0)
    );
  }
}
