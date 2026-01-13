/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
import {
  ButtonItem,
  ButtonItemType,
  GenericItem,
  MessageResponse,
  MessageResponseTypes,
  TextItem,
  WithBodyAndFooter,
} from "../../types/messaging/Messages";
import { uuid, UUIDType } from "../utils/lang/uuid";
import {
  createMessageResponseForItem,
  isButtonResponseType,
  isCardResponseType,
  isCarouselResponseType,
  isGridResponseType,
  isItemSupportedInResponseBody,
  isResponseWithNestedItems,
  isShowPanelButtonType,
  streamItemID,
} from "../utils/messageUtils";
import { consoleError } from "../utils/miscUtils";

/**
 * Takes data from a {@link MessageResponse} and transforms into something usable by AI chat
 * ({@link LocalMessageItem}).
 *
 * @param messageItem The individual item from the message to convert.
 * @param fullMessage The message object that came from the server.
 * instance.
 * @param isLatestWelcomeNode Indicates if this message is a new welcome message that has just been shown to the user
 * and isn't a historical welcome message.
 * ID as the message.
 */
function outputItemToLocalItem(
  messageItem: GenericItem,
  fullMessage: MessageResponse,
  isLatestWelcomeNode = false,
): LocalMessageItem {
  // If the item comes with a streaming id, use that. Otherwise assign a new id.
  const id =
    streamItemID(fullMessage.id, messageItem) || uuid(UUIDType.LOCAL_MESSAGE);

  // Create the LocalMessage. It will temporarily have the extra "output" property it gets from the original
  // MessageResponse object.
  const localMessage: LocalMessageItem = {
    ui_state: {
      id,
      needsAnnouncement: !fullMessage.ui_state_internal?.from_history,
    },
    item: messageItem,
    fullMessageID: fullMessage.id,
  };

  if (isLatestWelcomeNode) {
    localMessage.ui_state.isWelcomeResponse = true;
  }

  return localMessage as LocalMessageItem;
}

/**
 * Creates an empty skeleton of a {@link LocalMessageItem} with the inline_error response type.
 */
function createLocalMessageForInlineError(text: string) {
  const messageItem: TextItem = {
    response_type: MessageResponseTypes.INLINE_ERROR,
    text,
  };
  return createLocalMessageForItem(messageItem);
}

/**
 * Creates an empty skeleton of a {@link LocalMessageItem} with the given item.
 */
function createLocalMessageForItem(messageItem: GenericItem) {
  const originalMessage = createMessageResponseForItem(messageItem);
  const localMessage = outputItemToLocalItem(messageItem, originalMessage);

  return { originalMessage, localMessage };
}

/**
 * Loops through the give list of message items to create local message items for each of them. This allows us to reuse
 * the existing ui_state functionality to update nested messages like we currently do with normal messages.
 *
 * @param localMessageItem The local message item to store nested local message items in.
 * @param originalMessage The original message response these nested messages came from.
 * @param fromHistory Indicates if the message was fetched from session history.
 * @param nestedLocalMessageItems A list to add local message items to as they're created.
 * @param allowFooter Determines whether buttons in the footer should render. This allows us to prevent deeply
 * nested buttons from rendering, such as a card with a footer nested in a panel.
 */
function createLocalMessageItemsForNestedMessageItems(
  localMessageItem: LocalMessageItem,
  originalMessage: MessageResponse,
  fromHistory: boolean,
  nestedLocalMessageItems: LocalMessageItem[],
  allowFooter: boolean,
) {
  const { item } = localMessageItem;

  if (isGridResponseType(item)) {
    localMessageItem.ui_state.gridLocalMessageItemIDs = item.rows.map((row) => {
      return row.cells.map((cell) => {
        const cellLocalMessageItemIDs: string[] = [];
        createLocalMessageItemsForNestedType(
          "items",
          localMessageItem,
          cell.items,
          cellLocalMessageItemIDs,
          originalMessage,
          fromHistory,
          nestedLocalMessageItems,
          (nestedMessageItem) =>
            isSupportedMessageItemInBody(
              localMessageItem.item,
              nestedMessageItem,
            ),
          false, // Grids shouldn't allow buttons.
        );
        return cellLocalMessageItemIDs;
      });
    });
  } else if (isCarouselResponseType(item)) {
    localMessageItem.ui_state.itemsLocalMessageItemIDs = [];
    createLocalMessageItemsForNestedType(
      "items",
      localMessageItem,
      item.items,
      localMessageItem.ui_state.itemsLocalMessageItemIDs,
      originalMessage,
      fromHistory,
      nestedLocalMessageItems,
      (nestedMessageItem) =>
        isSupportedMessageItemInBody(item, nestedMessageItem),
      // A carousel as standalone response type should allow buttons. If a carousel is allowed to be nested in the
      // future, this would be helpful to prevent buttons in it.
      allowFooter,
    );
  } else {
    const bodyItems =
      (item as WithBodyAndFooter).body || (item as ButtonItem).panel?.body;
    if (bodyItems) {
      localMessageItem.ui_state.bodyLocalMessageItemIDs = [];
      createLocalMessageItemsForNestedType(
        "body",
        localMessageItem,
        bodyItems,
        localMessageItem.ui_state.bodyLocalMessageItemIDs,
        originalMessage,
        fromHistory,
        nestedLocalMessageItems,
        (nestedMessageItem) =>
          isSupportedMessageItemInBody(item, nestedMessageItem),
        // If nested items are being rendered in a panel, the footer should not be allowed.
        !isShowPanelButtonType(item),
      );
    }

    if (!allowFooter) {
      return;
    }

    const footerItems =
      (item as WithBodyAndFooter).footer || (item as ButtonItem).panel?.footer;
    if (footerItems) {
      localMessageItem.ui_state.footerLocalMessageItemIDs = [];
      createLocalMessageItemsForNestedType(
        "footer",
        localMessageItem,
        footerItems,
        localMessageItem.ui_state.footerLocalMessageItemIDs,
        originalMessage,
        fromHistory,
        nestedLocalMessageItems,
        (nestedMessageItem) =>
          isSupportedMessageItemInFooter(item, nestedMessageItem),
        // A show panel button in a footer may open a panel that itself also has a footer. Nothing else in a footer can
        // have nested items with footers.
        !isShowPanelButtonType(item),
      );
    }
  }
}

function createLocalMessageItemsForNestedType(
  type: "items" | "body" | "footer",
  localMessageItem: LocalMessageItem,
  items: GenericItem[],
  nestedMessageItemIDs: string[],
  originalMessage: MessageResponse,
  fromHistory: boolean,
  nestedLocalMessageItems: LocalMessageItem[],
  isSupported: (nestedMessageItem: GenericItem) => boolean,
  allowFooter: boolean,
) {
  items.forEach((nestedMessageItem) => {
    if (isSupported(nestedMessageItem)) {
      const nestedLocalMessageItem = outputItemToLocalItem(
        nestedMessageItem,
        originalMessage,
        false,
      );

      nestedMessageItemIDs.push(nestedLocalMessageItem.ui_state.id);
      nestedLocalMessageItems.push(nestedLocalMessageItem);

      if (isResponseWithNestedItems(nestedLocalMessageItem.item)) {
        createLocalMessageItemsForNestedMessageItems(
          nestedLocalMessageItem,
          originalMessage,
          fromHistory,
          nestedLocalMessageItems,
          allowFooter,
        );
      }
    } else {
      consoleError(
        `The "${localMessageItem.item.response_type}" response type does not support "${nestedMessageItem.response_type}" in "${type}" array.`,
      );
    }
  });
}

/**
 * Determines if the given nested item is allowed to be displayed inside the given root message item body.
 */
function isSupportedMessageItemInBody(
  rootMessageItem: GenericItem,
  nestedMessageItem: GenericItem,
) {
  switch (rootMessageItem.response_type as string) {
    case MessageResponseTypes.CARD:
      return (
        !isCardResponseType(nestedMessageItem) &&
        isItemSupportedInResponseBody(nestedMessageItem)
      );
    case MessageResponseTypes.CAROUSEL:
      return isCardResponseType(nestedMessageItem);
    case MessageResponseTypes.BUTTON:
      return (
        (rootMessageItem as ButtonItem).button_type ===
          ButtonItemType.SHOW_PANEL &&
        isItemSupportedInResponseBody(nestedMessageItem)
      );
    case MessageResponseTypes.GRID:
      return (
        !isCardResponseType(nestedMessageItem) &&
        isItemSupportedInResponseBody(nestedMessageItem)
      );
    default:
      return false;
  }
}

/**
 * Determines if the given nested item is allowed to be displayed inside the given root message item footer. Only
 * the button response type should be allowed in the footer. Depending on the root message item, the show_panel
 * button type won't be allowed to render.
 */
function isSupportedMessageItemInFooter(
  rootMessageItem: GenericItem,
  nestedMessageItem: GenericItem,
) {
  if (isButtonResponseType(nestedMessageItem)) {
    // The panel response type and show_panel button type should not support the button type "show_panel" in the
    // footer. This is to prevent the user from opening a panel when a panel is already open.
    if (isShowPanelButtonType(rootMessageItem)) {
      return !isShowPanelButtonType(nestedMessageItem);
    }

    return true;
  }

  return false;
}

export {
  outputItemToLocalItem,
  createLocalMessageForInlineError,
  createLocalMessageItemsForNestedMessageItems,
};
