/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from "lodash-es/cloneDeep.js";
import { DeepPartial } from "../../types/utilities/DeepPartial";

import { AppConfig } from "../../types/state/AppConfig";
import { AppState } from "../../types/state/AppState";
import { FileUpload } from "../../types/config/ServiceDeskConfig";
import {
  LocalMessageItem,
  MessageErrorState,
} from "../../types/messaging/LocalMessageItem";
import { FileStatusValue } from "./constants";
import { findLastWithMap } from "./lang/arrayUtils";
import { uuid, UUIDType } from "./lang/uuid";
import {
  HumanAgentMessageType,
  ButtonItem,
  ButtonItemType,
  CardItem,
  CarouselItem,
  CompleteItemChunk,
  ConnectToHumanAgentItem,
  DateItem,
  EventInput,
  FinalResponseChunk,
  GenericItem,
  GridItem,
  InternalMessageRequestType,
  MediaItem,
  Message,
  MessageInput,
  MessageInputType,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  OptionItem,
  OptionItemPreference,
  PartialItemChunk,
  PauseItem,
  SingleOption,
  StreamChunk,
  SystemMessageItem,
  TextItem,
  UserDefinedItem,
  WithBodyAndFooter,
} from "../../types/messaging/Messages";

const THREAD_ID_MAIN = "main";

/**
 * This function determines if the given message is an output message (i.e. a message output from the assistant) and
 * is a {@link MessageResponse}. This function acts as a type guard which will narrow the type to
 * {@link MessageResponse} if it returns true.
 */
function isResponse(message: unknown): message is MessageResponse {
  return message && (message as MessageResponse).output !== undefined;
}

function isDateResponseType(
  localMessage: LocalMessageItem,
): localMessage is LocalMessageItem<DateItem> {
  return (
    (localMessage?.item.response_type as string) === MessageResponseTypes.DATE
  );
}

/**
 * Adds default values to the given MessageResponse.
 */
function addDefaultsToMessage<T extends MessageResponse | MessageRequest>(
  fullMessage: T,
): T {
  if (!fullMessage.id) {
    fullMessage.id = uuid(UUIDType.MESSAGE);
  }
  if (!fullMessage.thread_id) {
    fullMessage.thread_id = THREAD_ID_MAIN;
  }
  if (!fullMessage.history) {
    fullMessage.history = {};
  }
  if (!fullMessage.ui_state_internal) {
    fullMessage.ui_state_internal = {};
  }
  if (!fullMessage.history.timestamp) {
    fullMessage.history.timestamp = Date.now();
  }
  if (fullMessage.ui_state_internal.from_history === undefined) {
    fullMessage.ui_state_internal.from_history = false;
  }

  return fullMessage;
}

/**
 * This function determines if the given message is a message input to the assistant and is a {@link MessageRequest}.
 * This function will return false if the MessageRequest is an internal event. This function acts as a type guard which
 * will narrow the type to {@link MessageRequest} if it returns true.
 */
function isRequest(message: unknown): message is MessageRequest<MessageInput> {
  return (message as MessageRequest<MessageInput>)?.input !== undefined;
}

/**
 * Indicates if this message was part of a conversation with a live agent.
 */
function isLiveHumanAgentMessage(message: LocalMessageItem) {
  return Boolean(message.item.agent_message_type);
}

/**
 * Indicates if this message contains a message that was part of a conversation with a live agent.
 */
function hasLiveHumanAgentMessage(message: Message) {
  return (
    (isResponse(message) &&
      Boolean(
        message.output.generic?.find((item) => item?.agent_message_type),
      )) ||
    (isRequest(message) && Boolean(message.input.agent_message_type))
  );
}

/**
 * This function determines if the given message is an internal event message that was input (i.e. a message we sent to
 * the back-end that is a {@link MessageRequest} with {@link EventInput} in it). This function acts as a type guard
 * which will narrow the type to 'MessageRequest<EventInput>' if it returns true.
 */
function isEventRequest(
  message: unknown,
): message is MessageRequest<EventInput> {
  return (
    (message as MessageRequest<EventInput>)?.input?.message_type ===
    MessageInputType.EVENT
  );
}

/**
 * This function determines if the given generic item is a text item. This function acts as a type guard which will
 * narrow the type to {@link TextItem} if it returns true.
 */
function isTextItem(item: GenericItem): item is TextItem {
  return (
    item &&
    item.response_type === "text" &&
    (item as TextItem).text !== undefined
  );
}

function isTyping(message: GenericItem) {
  // eslint-disable-next-line eqeqeq
  return (
    message.response_type === MessageResponseTypes.PAUSE &&
    (message as PauseItem).typing == true
  );
}

function isPause(message: GenericItem): message is PauseItem {
  return message.response_type === MessageResponseTypes.PAUSE;
}

/**
 * This is a type guard that determines if the given item is an {@link OptionItem} item.
 */
function isOptionItem(item: GenericItem): item is OptionItem {
  return (
    item?.response_type === MessageResponseTypes.OPTION &&
    (item as OptionItem).options !== undefined
  );
}

/**
 * Generates a {@link MessageRequest} for the given {@link Option} that the user has selected. This is used for
 * generating the request to the server once the user has selected a choice from an option or suggestion list.
 *
 * @param choice The selected value.
 * @param relatedResponseID If this choice was made as the result of the choice choosing a value from a previous
 * {@link MessageResponse}, this should be the ID of that message.
 */
function createMessageRequestForChoice(
  choice: SingleOption,
  relatedResponseID?: string,
): MessageRequest {
  // The "value" of the choice contains the data that is to be sent to the server when this choice is selected.
  // We'll clone it and add in the history value which stores the user-visible label in the history store.
  const messageRequest: MessageRequest = {
    id: uuid(UUIDType.MESSAGE),
    thread_id: THREAD_ID_MAIN,
    ...cloneDeep(choice.value),
  };
  messageRequest.history = {
    label: choice.label,
    related_message_id: relatedResponseID,
  };

  return messageRequest;
}

/**
 * Generates a {@link MessageRequest} for the given {@link Option} that the user has selected. This is used for
 * generating the request to the server once the user has selected a choice from an option or suggestion list.
 *
 * @param buttonItem The button item.
 * @param relatedResponseID The id of the {@link MessageResponse} the button item came from.
 * {@link MessageResponse}, this should be the ID of that message.
 */
function createMessageRequestForButtonItemOption(
  buttonItem: ButtonItem,
  relatedResponseID: string,
) {
  // The "value" of the choice contains the data that is to be sent to the server when this choice is selected.
  const messageRequest: MessageRequest = {
    id: uuid(UUIDType.MESSAGE),
    thread_id: THREAD_ID_MAIN,
    input: null,
  };

  if (buttonItem.value?.input?.text) {
    messageRequest.input = cloneDeep(buttonItem.value.input);
  } else {
    messageRequest.input = { text: buttonItem.label };
  }

  messageRequest.history = { related_message_id: relatedResponseID };

  return messageRequest;
}

/**
 * Generates a {@link MessageRequest} to request the welcome node.
 */
function createWelcomeRequest(): MessageRequest {
  return addDefaultsToMessage<MessageRequest>({
    id: uuid(UUIDType.MESSAGE),
    input: {
      text: "",
    },
    history: {
      silent: true,
      is_welcome_request: true,
    },
    thread_id: THREAD_ID_MAIN,
  });
}

/**
 * Generates a {@link MessageRequest} for the given text message sent by the user. This is used for generating the
 * request to send to the server when the user has typed something into the input field.
 */
function createMessageRequestForText(text: string): MessageRequest {
  // The "value" of the choice contains the data that is to be sent to the server when this choice is selected.
  // We'll clone it and add in the history value which stores the user-visible label in the history store.
  return addDefaultsToMessage<MessageRequest>({
    input: {
      // The assistant will choke if we send it text with line breaks in it, so we have to remove them first.
      text,
      message_type: MessageInputType.TEXT,
    },
  });
}

/**
 * Generates a {@link MessageRequest} to represent a file upload.
 */
function createMessageRequestForFileUpload(upload: FileUpload): MessageRequest {
  return addDefaultsToMessage<MessageRequest>({
    id: upload.id,
    input: {
      text: upload.file.name,
      message_type:
        InternalMessageRequestType.FILE as unknown as MessageInputType,
      agent_message_type: HumanAgentMessageType.FROM_USER,
    },
    history: {
      file_upload_status: FileStatusValue.UPLOADING,
    },
  });
}

function createMessageRequestForDate(
  inputString: string,
  userString: string,
  relatedResponseID: string,
) {
  const messageRequest = createMessageRequestForText(inputString);

  messageRequest.history = {
    label: userString,
    related_message_id: relatedResponseID,
  };

  return messageRequest;
}

/**
 * Generates a {@link MessageResponse} for the given text message sent to the user.
 */
function createMessageResponseForText(
  text: string,
  threadID: string = THREAD_ID_MAIN,
  responseType = MessageResponseTypes.TEXT,
  context?: unknown,
): MessageResponse {
  const textItem: TextItem = {
    response_type: responseType as MessageResponseTypes,
    text,
  };
  const messageResponse: MessageResponse = {
    id: uuid(UUIDType.MESSAGE),
    thread_id: threadID,
    output: {
      generic: [textItem],
    },
  };
  if (context) {
    messageResponse.context = context;
  }

  return messageResponse;
}

/**
 * Generates a {@link MessageResponse} for the given item sent to the user.
 */
function createMessageResponseForItem<T extends GenericItem>(
  item: T,
  context?: unknown,
): MessageResponse {
  const messageResponse: MessageResponse = {
    output: {
      generic: [item],
    },
  };
  if (context) {
    messageResponse.context = context;
  }
  return addDefaultsToMessage(messageResponse);
}

/**
 * Indicates if the dialog response is a "connect_to_agent" message.
 */
function isConnectToHumanAgent(
  response: GenericItem,
): response is ConnectToHumanAgentItem {
  return (
    response?.response_type === MessageResponseTypes.CONNECT_TO_HUMAN_AGENT
  );
}

function isCardResponseType(response: GenericItem): response is CardItem {
  // TODO: Add Card to wa-fd-types MessageResponseTypes enum.
  return (response?.response_type as string) === MessageResponseTypes.CARD;
}

function isCarouselResponseType(
  response: GenericItem,
): response is CarouselItem {
  return (response?.response_type as string) === MessageResponseTypes.CAROUSEL;
}

function isButtonResponseType(response: GenericItem): response is ButtonItem {
  return (response?.response_type as string) === MessageResponseTypes.BUTTON;
}

function isShowPanelButtonType(response: GenericItem) {
  return (
    isButtonResponseType(response) &&
    response.button_type === ButtonItemType.SHOW_PANEL
  );
}

/**
 * Determines if the provided message item is a response type that supports nesting response types.
 */
function isResponseWithNestedItems(item: GenericItem): boolean {
  if (isButtonResponseType(item)) {
    return hasBodyOrFooter(item.panel);
  }

  if (isCardResponseType(item)) {
    return hasBodyOrFooter(item);
  }

  if (isCarouselResponseType(item)) {
    return item.items !== undefined;
  }

  return isGridResponseType(item);
}

function hasBodyOrFooter(item: WithBodyAndFooter) {
  return item?.body !== undefined || item?.footer !== undefined;
}

/**
 * Determines if the given message should be rendered as custom message.
 */
function renderAsUserDefinedMessage(
  messageItem: DeepPartial<GenericItem>,
): boolean {
  const responseType = messageItem.response_type;
  switch (responseType) {
    case MessageResponseTypes.TEXT:
    case MessageResponseTypes.IMAGE:
    case MessageResponseTypes.OPTION:
    case MessageResponseTypes.CONNECT_TO_HUMAN_AGENT:
    case MessageResponseTypes.IFRAME:
    case MessageResponseTypes.VIDEO:
    case MessageResponseTypes.AUDIO:
    case MessageResponseTypes.DATE:
    case MessageResponseTypes.CONVERSATIONAL_SEARCH:
    case MessageResponseTypes.INLINE_ERROR:
    case MessageResponseTypes.CARD:
    case MessageResponseTypes.PREVIEW_CARD:
    case MessageResponseTypes.CAROUSEL:
    case MessageResponseTypes.BUTTON:
    case MessageResponseTypes.GRID:
      return false;
    default:
      return true;
  }
}

/**
 * Indicates if the given remote config indicates that a service desk is configured.
 */
function hasServiceDesk(config: AppConfig): boolean {
  return Boolean(config.public.serviceDeskFactory);
}

/**
 * Determines if the provided message item can be rendered in a response body item.
 */
function isItemSupportedInResponseBody(item: GenericItem) {
  switch (item.response_type as string) {
    case MessageResponseTypes.IMAGE:
    case MessageResponseTypes.IFRAME:
    case MessageResponseTypes.VIDEO:
    case MessageResponseTypes.AUDIO:
    case MessageResponseTypes.TEXT:
    case MessageResponseTypes.USER_DEFINED:
    case MessageResponseTypes.CARD:
    case MessageResponseTypes.GRID:
      return true;
    default:
      return false;
  }
}

/**
 * Determines if the message item is a carousel response type with a single item.
 */
function isSingleItemCarousel(
  messageItem: GenericItem,
): messageItem is CarouselItem {
  return isCarouselResponseType(messageItem) && messageItem.items.length === 1;
}

function isFullWidthUserDefined(
  messageItem: GenericItem,
): messageItem is UserDefinedItem {
  return isUserDefinedItem(messageItem) && messageItem.full_width;
}

function isUserDefinedItem(item: GenericItem): item is UserDefinedItem {
  return (item?.response_type as string) === MessageResponseTypes.USER_DEFINED;
}

function isGridResponseType(item: GenericItem): item is GridItem {
  return (item?.response_type as string) === MessageResponseTypes.GRID;
}

function getOptionType(preference: OptionItemPreference, totalOptions: number) {
  let type = "button";
  if (preference && preference === "button") {
    type = "button";
  } else if (preference && preference === "dropdown") {
    type = "dropdown";
  } else if (totalOptions > 4) {
    type = "dropdown";
  }
  return type;
}

/**
 * Indicates if the given stream chunk is a partial item.
 */
function isStreamPartialItem(chunk: StreamChunk): chunk is PartialItemChunk {
  return Boolean((chunk as PartialItemChunk).partial_item);
}

/**
 * Indicates if the given stream chunk is a complete item.
 */
function isStreamCompleteItem(chunk: StreamChunk): chunk is CompleteItemChunk {
  return Boolean((chunk as CompleteItemChunk).complete_item);
}

/**
 * Indicates if the given stream chunk is a partial item.
 */
function isStreamFinalResponse(
  chunk: StreamChunk,
): chunk is FinalResponseChunk {
  return Boolean((chunk as FinalResponseChunk).final_response);
}

/**
 * Returns the ID of a streaming item that is part of a message response. If the item does not have a streaming ID,
 * this will return null;
 */
function streamItemID(messageID: string, item: DeepPartial<GenericItem>) {
  const itemID = item?.streaming_metadata?.id;
  if (!itemID) {
    return null;
  }
  return `${messageID}-${itemID}`;
}

/**
 * Returns the dimensions info for the given media item.
 */
function getMediaDimensions(item: MediaItem) {
  return item.dimensions;
}

/**
 * Returns the last response message from the bot (excludes agent messages) that has a context object on it.
 */
function getLastAssistantResponseWithContext(state: AppState) {
  const messageIDs = state.assistantMessageState.messageIDs || [];
  return findLastWithMap(
    messageIDs,
    state.allMessagesByID,
    (message) =>
      isResponse(message) &&
      !hasLiveHumanAgentMessage(message) &&
      Boolean(message.context),
  ) as MessageResponse;
}

/**
 * Determines if the given generic item is a system message item (response).
 * This is a type guard that narrows the type to SystemMessageItem.
 */
function isSystemMessageItem(item: GenericItem): item is SystemMessageItem {
  if (!item || item === null || item === undefined) {
    return false;
  }
  return (
    item.response_type === MessageResponseTypes.SYSTEM &&
    (item as SystemMessageItem).title !== undefined
  );
}

/**
 * Determines if a message should be rendered as a standalone system message.
 * A message is standalone if ALL of its items are system messages.
 * This means the message will render centered without avatar or bubble chrome.
 *
 * For responses: checks if ALL generic items are system messages
 */
function isStandaloneSystemMessage(message: Message): boolean {
  // Check if it's a response with only system message items
  if (isResponse(message)) {
    const items = message.output.generic;
    if (!items || items.length === 0) {
      return false;
    }
    // All items must be system messages for standalone rendering
    return items.every((item) => isSystemMessageItem(item));
  }

  return false;
}

/**
 * Returns the ID of the last message response that should have interactive inputs enabled.
 *
 * As soon as the user sends a message, all previous responses are disabled to prevent re-interaction.
 * However, if the latest request resulted in an error, the last response is re-enabled so the user
 * isn't left stuck with a disabled input bar.
 *
 * @param localMessageItems - The ordered list of local message items
 * @param allMessagesByID - Map of all messages by their IDs
 */
function getMessageIDForUserInput(
  localMessageItems: LocalMessageItem[],
  allMessagesByID: Record<string, Message>,
): string | null {
  for (let index = localMessageItems.length - 1; index >= 0; index--) {
    const message = localMessageItems[index];
    const originalMessage = allMessagesByID[message.fullMessageID];
    if (
      isRequest(originalMessage) &&
      originalMessage?.history?.error_state !== MessageErrorState.FAILED
    ) {
      // If we find a request that was not an error, then we need to disable everything.
      return null;
    }
    if (isResponse(originalMessage)) {
      // If we didn't find a successful request, then the first response we find can be enabled.
      return message.fullMessageID;
    }
  }
  // Nothing should be enabled.
  return null;
}

export {
  getOptionType,
  isResponse,
  isCardResponseType,
  isTextItem,
  isTyping,
  isPause,
  isRequest,
  isEventRequest,
  isDateResponseType,
  isOptionItem,
  createWelcomeRequest,
  createMessageRequestForChoice,
  createMessageRequestForText,
  createMessageResponseForText,
  createMessageRequestForDate,
  isConnectToHumanAgent,
  renderAsUserDefinedMessage,
  hasServiceDesk,
  isLiveHumanAgentMessage,
  isItemSupportedInResponseBody,
  isCarouselResponseType,
  isResponseWithNestedItems,
  createMessageRequestForFileUpload,
  createMessageResponseForItem,
  isSingleItemCarousel,
  isButtonResponseType,
  isShowPanelButtonType,
  createMessageRequestForButtonItemOption,
  isGridResponseType,
  addDefaultsToMessage,
  isStreamPartialItem,
  isStreamCompleteItem,
  isStreamFinalResponse,
  streamItemID,
  getMediaDimensions,
  getLastAssistantResponseWithContext,
  THREAD_ID_MAIN,
  isFullWidthUserDefined,
  isSystemMessageItem,
  isStandaloneSystemMessage,
  getMessageIDForUserInput,
};
