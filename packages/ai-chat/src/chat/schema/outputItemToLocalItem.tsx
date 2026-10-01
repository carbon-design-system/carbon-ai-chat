/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from 'lodash-es/isEqual.js';

import {
  LocalMessageItem,
  LocalMessageUIState,
} from '../../types/messaging/LocalMessageItem';
import {
  ButtonItem,
  ButtonItemType,
  ConversationalSearchItem,
  GenericItem,
  GridItem,
  MessageResponse,
  MessageResponseTypes,
  OptionItem,
  TextItem,
  WithBodyAndFooter,
} from '../../types/messaging/Messages';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import {
  createMessageResponseForItem,
  getOptionType,
  isButtonResponseType,
  isCardResponseType,
  isCarouselResponseType,
  isGridResponseType,
  isItemSupportedInResponseBody,
  isResponseWithNestedItems,
  isShowPanelButtonType,
  streamItemID,
} from '../utils/messageUtils';
import { consoleError } from '../utils/miscUtils';
import ObjectMap from '../../types/utilities/ObjectMap';

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
  isLatestWelcomeNode = false
): LocalMessageItem {
  // If the item comes with a streaming id, use that. Otherwise assign a new id.
  const id = streamItemID(fullMessage.id, messageItem) || uuid();

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
  allowFooter: boolean
) {
  const { item } = localMessageItem;

  if (isGridResponseType(item)) {
    localMessageItem.ui_state.gridLocalMessageItemIDs = item.rows.map((row) => {
      return row.cells.map((cell) => {
        const cellLocalMessageItemIDs: string[] = [];
        createLocalMessageItemsForNestedType(
          'items',
          localMessageItem,
          cell.items,
          cellLocalMessageItemIDs,
          originalMessage,
          fromHistory,
          nestedLocalMessageItems,
          (nestedMessageItem) =>
            isSupportedMessageItemInBody(
              localMessageItem.item,
              nestedMessageItem
            ),
          false // Grids shouldn't allow buttons.
        );
        return cellLocalMessageItemIDs;
      });
    });
  } else if (isCarouselResponseType(item)) {
    localMessageItem.ui_state.itemsLocalMessageItemIDs = [];
    createLocalMessageItemsForNestedType(
      'items',
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
      allowFooter
    );
  } else {
    const bodyItems =
      (item as WithBodyAndFooter).body || (item as ButtonItem).panel?.body;
    if (bodyItems) {
      localMessageItem.ui_state.bodyLocalMessageItemIDs = [];
      createLocalMessageItemsForNestedType(
        'body',
        localMessageItem,
        bodyItems,
        localMessageItem.ui_state.bodyLocalMessageItemIDs,
        originalMessage,
        fromHistory,
        nestedLocalMessageItems,
        (nestedMessageItem) =>
          isSupportedMessageItemInBody(item, nestedMessageItem),
        // If nested items are being rendered in a panel, the footer should not be allowed.
        !isShowPanelButtonType(item)
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
        'footer',
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
        !isShowPanelButtonType(item)
      );
    }
  }
}

function createLocalMessageItemsForNestedType(
  type: 'items' | 'body' | 'footer',
  localMessageItem: LocalMessageItem,
  items: GenericItem[],
  nestedMessageItemIDs: string[],
  originalMessage: MessageResponse,
  fromHistory: boolean,
  nestedLocalMessageItems: LocalMessageItem[],
  isSupported: (nestedMessageItem: GenericItem) => boolean,
  allowFooter: boolean
) {
  items.forEach((nestedMessageItem) => {
    if (isSupported(nestedMessageItem)) {
      const nestedLocalMessageItem = outputItemToLocalItem(
        nestedMessageItem,
        originalMessage,
        false
      );

      nestedMessageItemIDs.push(nestedLocalMessageItem.ui_state.id);
      nestedLocalMessageItems.push(nestedLocalMessageItem);

      if (isResponseWithNestedItems(nestedLocalMessageItem.item)) {
        createLocalMessageItemsForNestedMessageItems(
          nestedLocalMessageItem,
          originalMessage,
          fromHistory,
          nestedLocalMessageItems,
          allowFooter
        );
      }
    } else {
      consoleError(
        `The "${localMessageItem.item.response_type}" response type does not support "${nestedMessageItem.response_type}" in "${type}" array.`
      );
    }
  });
}

/**
 * Returns the nested-id lists of a local item, one per slot, keyed by slot: body, footer,
 * items, and each grid cell. A button's panel body and footer use the body and footer
 * lists.
 */
function nestedSlotsOf(uiState: LocalMessageUIState): Map<string, string[]> {
  const slots = new Map<string, string[]>([
    ['body', uiState.bodyLocalMessageItemIDs],
    ['footer', uiState.footerLocalMessageItemIDs],
    ['items', uiState.itemsLocalMessageItemIDs],
  ]);
  uiState.gridLocalMessageItemIDs?.forEach((row, rowIndex) =>
    row.forEach((cell, cellIndex) =>
      slots.set(`cell-${rowIndex}-${cellIndex}`, cell)
    )
  );
  return slots;
}

/**
 * Gives each item nested in `localItem` the local id of the item at the same position in
 * the same slot of `previous`, and does the same for the items nested in those. Items
 * with a streaming id keep it. Both are freshly built, so their ids change in place.
 */
function matchNestedLocalIDs(
  localItem: LocalMessageItem,
  previous: LocalMessageItem,
  nestedByID: Map<string, LocalMessageItem>,
  previousByID: ObjectMap<LocalMessageItem>
) {
  const previousSlots = nestedSlotsOf(previous.ui_state);
  nestedSlotsOf(localItem.ui_state).forEach((ids, slot) => {
    ids?.forEach((id, index) => {
      const nested = nestedByID.get(id);
      const previousNested = previousByID[previousSlots.get(slot)?.[index]];
      if (
        !nested ||
        !previousNested ||
        streamItemID(localItem.fullMessageID, nested.item) ||
        streamItemID(localItem.fullMessageID, previousNested.item)
      ) {
        return;
      }
      nested.ui_state.id = previousNested.ui_state.id;
      ids[index] = previousNested.ui_state.id;
      matchNestedLocalIDs(nested, previousNested, nestedByID, previousByID);
    });
  });
}

/**
 * Keeps the items nested in a rebuilt container mounted. Nested items carry no streaming
 * id, so a rebuild gives them new ids, and the UI remounts them. Each one instead takes
 * the id of the item in the same place in `previous`, the container it replaces, and
 * keeps that item's reference when the two are deep-equal.
 *
 * @param localItem The rebuilt container, whose nested-id lists change in place.
 * @param nestedLocalItems The items nested in it, freshly built.
 * @param previous The local item `localItem` replaces, if any.
 * @param previousByID The local items `previous` and its nested items are stored in.
 * @returns The nested items to store.
 */
function keepNestedLocalIDs(
  localItem: LocalMessageItem,
  nestedLocalItems: LocalMessageItem[],
  previous: LocalMessageItem | undefined,
  previousByID: ObjectMap<LocalMessageItem>
): LocalMessageItem[] {
  if (!previous) {
    return nestedLocalItems;
  }
  const nestedByID = new Map(
    nestedLocalItems.map((nested) => [nested.ui_state.id, nested])
  );
  matchNestedLocalIDs(localItem, previous, nestedByID, previousByID);
  return nestedLocalItems.map((nested) => {
    const previousNested = previousByID[nested.ui_state.id];
    return previousNested && isEqual(previousNested, nested)
      ? previousNested
      : nested;
  });
}

/**
 * Determines if the given nested item is allowed to be displayed inside the given root message item body.
 */
function isSupportedMessageItemInBody(
  rootMessageItem: GenericItem,
  nestedMessageItem: GenericItem
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
  nestedMessageItem: GenericItem
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

/**
 * Lists what keeps an upserted item from drawing: the path of each field that the
 * item's renderers, or the builder of its nested local items, would throw on. The list
 * is empty when the item can draw.
 *
 * It checks only what those read, not the item's type, so an item that draws today
 * while missing a field its type calls required stays drawable. Fields that aren't
 * listed, such as an image's `source`, draw without the field.
 */
function findDrawIssues(item: GenericItem, message: MessageResponse): string[] {
  const issues: string[] = [];
  checkItem(item, '', true, issues);
  if ((item.response_type as string) === MessageResponseTypes.SYSTEM) {
    checkMessageBeforeSystemItem(message, issues);
  }
  return issues;
}

/**
 * Checks one item, top-level or nested, the way {@link createLocalMessageItemsForNestedMessageItems}
 * walks it. `allowFooter` is false where that builder skips footers.
 */
function checkItem(
  item: GenericItem,
  path: string,
  allowFooter: boolean,
  issues: string[]
) {
  switch (item.response_type as string) {
    case MessageResponseTypes.GRID:
      checkGrid(item as GridItem, path, issues);
      return;
    case MessageResponseTypes.CAROUSEL:
      // `CarouselItemComponent` maps the built ids, and `isSingleItemCarousel` reads
      // `items.length`, so a carousel needs a list even when it has no entries.
      checkList(item, (item as WithItems).items, `${path}items`, allowFooter, {
        issues,
        isSupported: isSupportedMessageItemInBody,
      });
      return;
    case MessageResponseTypes.OPTION:
      checkOption(item as OptionItem, path, issues);
      return;
    case MessageResponseTypes.CONVERSATIONAL_SEARCH:
      checkCitations(item as ConversationalSearchItem, path, issues);
      return;
    default:
      if (isResponseWithNestedItems(item)) {
        checkBodyAndFooter(item, path, allowFooter, issues);
      }
  }
}

/**
 * Whether a list entry is one that reading a field of throws.
 */
function isMissing(value: unknown): boolean {
  return value === null || value === undefined;
}

interface WithItems {
  items?: unknown;
}

interface ListCheck {
  issues: string[];
  isSupported: (parent: GenericItem, entry: GenericItem) => boolean;
}

/**
 * Checks a list the builder walks with `forEach`. It reads `response_type` on every
 * entry, so a null entry fails even where no entry is supported. Supported entries get
 * nested local items of their own, so they're checked too.
 */
function checkList(
  parent: GenericItem,
  list: unknown,
  path: string,
  allowFooter: boolean,
  { issues, isSupported }: ListCheck
) {
  if (!Array.isArray(list)) {
    issues.push(path);
    return;
  }
  list.forEach((entry: GenericItem, index) => {
    const entryPath = `${path}[${index}]`;
    if (isMissing(entry)) {
      issues.push(entryPath);
    } else if (isSupported(parent, entry)) {
      checkItem(entry, `${entryPath}.`, allowFooter, issues);
    }
  });
}

/**
 * A card's body and footer, or a button's panel body and footer. The builder walks
 * whichever list is truthy, and walks the footer only when footers are allowed. Items in
 * a panel get no footer.
 */
function checkBodyAndFooter(
  item: GenericItem,
  path: string,
  allowFooter: boolean,
  issues: string[]
) {
  const { body, footer } = item as WithBodyAndFooter;
  const panel = (item as ButtonItem).panel;
  const nestedAllowFooter = !isShowPanelButtonType(item);
  const bodyItems = body || panel?.body;
  if (bodyItems) {
    checkList(
      item,
      bodyItems,
      `${path}${body ? 'body' : 'panel.body'}`,
      nestedAllowFooter,
      { issues, isSupported: isSupportedMessageItemInBody }
    );
  }
  const footerItems = allowFooter && (footer || panel?.footer);
  if (footerItems) {
    checkList(
      item,
      footerItems,
      `${path}${footer ? 'footer' : 'panel.footer'}`,
      nestedAllowFooter,
      { issues, isSupported: isSupportedMessageItemInFooter }
    );
  }
}

/**
 * The builder maps `rows` and each row's `cells`, and walks each cell's `items`.
 * `GridItemComponent` calls `match` on the width of every column that has a cell.
 */
function checkGrid(item: GridItem, path: string, issues: string[]) {
  const { rows, columns } = item;
  if (!Array.isArray(rows)) {
    issues.push(`${path}rows`);
    return;
  }
  let columnCount = 0;
  rows.forEach((row, rowIndex) => {
    const rowPath = `${path}rows[${rowIndex}]`;
    if (isMissing(row)) {
      issues.push(rowPath);
      return;
    }
    if (!Array.isArray(row.cells)) {
      issues.push(`${rowPath}.cells`);
      return;
    }
    columnCount = Math.max(columnCount, row.cells.length);
    row.cells.forEach((cell, cellIndex) => {
      const cellPath = `${rowPath}.cells[${cellIndex}]`;
      if (isMissing(cell)) {
        issues.push(cellPath);
        return;
      }
      checkList(item, cell.items, `${cellPath}.items`, false, {
        issues,
        isSupported: isSupportedMessageItemInBody,
      });
    });
  });
  for (let index = 0; index < columnCount; index++) {
    const width: unknown = columns?.[index]?.width;
    if (width && typeof width !== 'string') {
      issues.push(`${path}columns[${index}].width`);
    }
  }
}

/**
 * `OptionComponent` reads each entry's `label`, and a dropdown reads each entry's
 * `value.input.text`. Button-mode entries without a `value` draw until the user picks
 * one, which the check leaves alone since it draws today.
 */
function checkOption(item: OptionItem, path: string, issues: string[]) {
  const { options, preference } = item;
  if (!Array.isArray(options)) {
    issues.push(`${path}options`);
    return;
  }
  const isDropdown = getOptionType(preference, options.length) === 'dropdown';
  options.forEach((option, index) => {
    const optionPath = `${path}options[${index}]`;
    if (isMissing(option)) {
      issues.push(optionPath);
    } else if (isDropdown && isMissing(option.value?.input)) {
      issues.push(`${optionPath}.value.input`);
    }
  });
}

/**
 * `ConversationalSearch` filters `citations` when it is truthy, reading each one's
 * `ranges`.
 */
function checkCitations(
  item: ConversationalSearchItem,
  path: string,
  issues: string[]
) {
  const { citations } = item;
  if (!citations) {
    return;
  }
  if (!Array.isArray(citations)) {
    issues.push(`${path}citations`);
    return;
  }
  citations.forEach((citation, index) => {
    if (isMissing(citation)) {
      issues.push(`${path}citations[${index}]`);
    }
  });
}

/**
 * `SystemMessage` finds the system item in the whole message, reading `response_type`
 * on every item up to it, including the null ones the chat otherwise skips.
 */
function checkMessageBeforeSystemItem(
  message: MessageResponse,
  issues: string[]
) {
  const generic = message.output?.generic ?? [];
  for (let index = 0; index < generic.length; index++) {
    const entry = generic[index];
    if (isMissing(entry)) {
      issues.push(`output.generic[${index}]`);
      return;
    }
    if ((entry.response_type as string) === MessageResponseTypes.SYSTEM) {
      return;
    }
  }
}

export {
  outputItemToLocalItem,
  createLocalMessageForInlineError,
  createLocalMessageItemsForNestedMessageItems,
  keepNestedLocalIDs,
  findDrawIssues,
};
