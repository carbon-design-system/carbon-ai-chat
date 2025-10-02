/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file takes history store data and transforms it to the schema we use in the Redux messages array.
 */

import { ServiceManager } from "../services/ServiceManager";
import { DEFAULT_CHAT_MESSAGES_STATE } from "../store/reducerUtils";
import {
  AppStateMessages,
  ChatMessagesState,
} from "../../types/state/AppState";
import {
  LocalMessageItem,
  MessageErrorState,
} from "../../types/messaging/LocalMessageItem";
import ObjectMap from "../../types/utilities/ObjectMap";
import { HistoryItem, HistoryNote } from "../../types/messaging/History";
import { FileStatusValue } from "../utils/constants";
import { findLast } from "../utils/lang/arrayUtils";
import { deepFreeze } from "../utils/lang/objectUtils";
import {
  isDateResponseType,
  isEventRequest,
  isOptionItem,
  isPause,
  isRequest,
  isResponse,
  isResponseWithNestedItems,
  THREAD_ID_MAIN,
} from "../utils/messageUtils";
import inputItemToLocalItemSchema from "./inputItemToLocalItem";
import {
  createLocalMessageItemsForNestedMessageItems,
  outputItemToLocalItem,
} from "./outputItemToLocalItem";
import {
  GenericItem,
  Message,
  MessageResponse,
  PanelItem,
} from "../../types/messaging/Messages";
import {
  BusEventHistoryBegin,
  BusEventType,
} from "../../types/events/eventBusTypes";

interface LoadedHistory {
  /**
   * The state of the messages fetched from session history.
   */
  messageHistory: AppStateMessages;

  /**
   * The latest channel transfer to an agent response in the conversation history.
   */
  latestTransferToHumanAgentResponse: MessageResponse;

  /**
   * The local message item of the panel response type that should automatically open on page refresh if it's the
   * latest message.
   */
  latestPanelLocalMessageItem: LocalMessageItem<PanelItem>;
}

/**
 * This is a simple data structure to store the intermediate data structures that are used during the loading process.
 */
interface LoadingState {
  /**
   * A reference to the {@link ServiceManager}.
   */
  serviceManager: ServiceManager;

  /**
   * The flat list of all the messages returned from the history store.
   */
  allMessages: Message[];

  /**
   * The map of all the {@link Message} objects keyed by their IDs.
   */
  allMessagesByID: ObjectMap<Message>;

  /**
   * The map of all the {@link LocalMessageItem} objects keyed by their IDs.
   */
  allLocalMessagesByID: ObjectMap<LocalMessageItem>;

  /**
   * A map of all the {@link LocalMessageItem} objects associated with a given {@link Message}. The key will be
   * the ID of the {@link Message}.
   */
  localMessagesByOriginalMessageID: ObjectMap<LocalMessageItem[]>;

  /**
   * A map of all the original messages grouped by their threads. Note that a given message may appear in multiple
   * threads.
   */
  threadMessagesByThreadID: ObjectMap<Message[]>;

  /**
   * This is a map of all the messages by their request IDs. This will contain each {@link MessageResponse} with
   * the key being the ID of the corresponding {@link MessageRequest} that the given response is a response to.
   */
  responsesByRequestID: ObjectMap<Message>;

  /**
   * This map keeps track of all the related messages by the related message ID. This can be used by a message to
   * find the message that it is related to. This assumes that a given message can only have one related message.
   */
  relatedMessageByID: ObjectMap<Message>;

  /**
   * The ID of the last sub-thread in the history.
   */
  lastThreadID: string;

  /**
   * The final result of the loading process.
   */
  loadedHistory: LoadedHistory;

  /**
   * The id of the message response that contains the latest panel response type that should be opened on page
   * refresh. This helps find the local message item of the panel response type that should automatically open on page
   * refresh.
   */
  latestMessageResponsePanelID: string;
}

/**
 * Given an array of every received and sent message, change to correct data format. Eventually, this is going to
 * have to work with paginated data.
 *
 * Note that this function also has side effects because it fires history events as it is processing the loaded history.
 *
 * @param notes An array of the {@link HistoryNote} objects returned from the history store.
 * @param serviceManager A reference to the {@link ServiceManager}.
 */
async function notesToLoadedHistory(
  notes: HistoryNote[],
  serviceManager: ServiceManager,
): Promise<LoadedHistory> {
  // Create an empty version of our state and the final result object.
  const allLocalMessagesByID: ObjectMap<LocalMessageItem> = {};
  const allMessagesByID: ObjectMap<Message> = {};
  const loadingState: LoadingState = {
    serviceManager,
    allMessages: [],
    allMessagesByID,
    allLocalMessagesByID,
    threadMessagesByThreadID: {},
    responsesByRequestID: {},
    relatedMessageByID: {},
    localMessagesByOriginalMessageID: {},
    lastThreadID: null,
    loadedHistory: {
      messageHistory: {
        allMessageItemsByID: allLocalMessagesByID,
        allMessagesByID,
        assistantMessageState: null,
      },
      latestTransferToHumanAgentResponse: null,
      latestPanelLocalMessageItem: null,
    },
    latestMessageResponsePanelID: null,
  };

  // First locate all the messages from history we need.
  await notesToMessages(notes, loadingState);

  if (!loadingState.allMessages.length) {
    // If we didn't actually find any messages, just return null to indicate that. This will trigger the widget to
    // get fetch the welcome node.
    return null;
  }

  // Generate the LocalMessage objects for the messages and divide into threads.
  createLocalMessages(loadingState);

  // Create the ChatMessagesState that correspond to each of the threads.
  createChatStates(loadingState);

  // Locate the most recent welcome node and mark it as such.
  markIsLatestWelcomeNode(loadingState);

  // Find all the options and suggestions and figure out which, if any, options the user chose.
  markSelectedOptions(loadingState);

  // Note: We need to consider if we should clone the LocalMessage objects that get put into multiple threads
  // (namely the first and last message in a thread that's also added to the main thread). If anything attempts to
  // modify the ui_state value in those messages, it will affect both. Right now the only time that happens is the
  // property for doing a11y announcements but since that property isn't active for historical messages, we don't
  // really have to do this now. This is a bit of a landmine I'm leaving here for now so sorry :-). To do the clone
  // the only thing that needs to be different is the ID.
  return loadingState.loadedHistory;
}

/**
 * Converts the given list of {@link HistoryNote} objects into a flat list of all the message objects to process.
 */
async function notesToMessages(
  notes: HistoryNote[],
  loadingState: LoadingState,
) {
  const {
    allMessages,
    allMessagesByID,
    responsesByRequestID,
    relatedMessageByID,
    serviceManager,
    localMessagesByOriginalMessageID,
  } = loadingState;

  if (!notes?.length) {
    return;
  }

  // Find all the messages from history.
  notes.forEach((note) => {
    const sessionHistory = (note as HistoryNote).body;

    const pushAndPrepareMessage = (historyItem: HistoryItem) => {
      const { message } = historyItem;

      if (
        !isEventRequest(message) &&
        (isRequest(message) || isResponse(message))
      ) {
        addMessage(message, loadingState, historyItem);
      }
    };

    sessionHistory.forEach(pushAndPrepareMessage);
  });

  // We need to do a little more processing on all the events now. We iterate backwards just to make it easier to
  // remove items.
  for (let index = allMessages.length - 1; index >= 0; index--) {
    const message = allMessages[index];

    if (message.history?.file_upload_status === FileStatusValue.UPLOADING) {
      // If a file upload was in the middle of uploading and the user left before it was complete, we need to mark
      // it as complete and also display it as an error.
      message.history.file_upload_status = FileStatusValue.COMPLETE;
      message.history.error_state = MessageErrorState.FAILED;
    }

    if (isResponse(message) && message.history.silent) {
      // If we find a message response that was silent, we need to actually throw it away. We treat these like
      // messages that were never actually received. This is currently only used for hiding the responses we get on
      // a 3rd strike from suggestions.
      allMessages.splice(index, 1);
      delete allMessagesByID[message.id];
    } else {
      localMessagesByOriginalMessageID[message.id] = [];

      if (isResponse(message) && message.request_id) {
        responsesByRequestID[message.request_id] = message;
      } else if (isRequest(message) && message.history.related_message_id) {
        relatedMessageByID[message.history.related_message_id] = message;
      }
    }
  }

  if (!allMessages.length) {
    // If we didn't find any messages, then return right now.
    return;
  }

  // Freeze the array so the listeners can't mess with it.
  Object.freeze(allMessages);

  // Fire the event that says we're loading from history. The messages are allowed to be modified at this point.
  const beginEvent: BusEventHistoryBegin = {
    type: BusEventType.HISTORY_BEGIN,
    messages: allMessages,
  };
  await serviceManager.eventBus.fire(beginEvent, serviceManager.instance);

  // The message is not allowed to be modified so freeze it.
  allMessages.forEach(deepFreeze);

  // Fire the event that says we're done loading from history.
  await serviceManager.eventBus.fire(
    { type: BusEventType.HISTORY_END, messages: allMessages },
    serviceManager.instance,
  );
}

/**
 * Adds the given message to the messages lists.
 */
function addMessage(
  message: Message,
  loadingState: LoadingState,
  historyItem: HistoryItem,
) {
  // Make sure the message has the timestamp that was generated by the service and not the potentially
  // client generated timestamp it originally had.
  message.history = message.history || {};
  message.ui_state_internal = message.ui_state_internal || {};
  message.ui_state_internal.from_history = true;
  message.history.timestamp = new Date(historyItem.time).getTime();

  if (message.thread_id !== THREAD_ID_MAIN) {
    loadingState.lastThreadID = message.thread_id;
  }

  loadingState.allMessagesByID[message.id] = message;
  loadingState.allMessages.push(message);
}

/**
 * Creates all the {@link LocalMessageItem} objects that correspond to all the {@link GenericItem} values in all the
 * given message requests and responses.
 */
function createLocalMessages(loadingState: LoadingState) {
  const {
    allMessages,
    allLocalMessagesByID,
    localMessagesByOriginalMessageID,
  } = loadingState;

  allMessages.forEach((message) => {
    if (isRequest(message)) {
      if (!message.history?.silent) {
        const text = message.history?.label || message.input.text;
        const localMessage = inputItemToLocalItemSchema(message, text);
        localMessagesByOriginalMessageID[message.id].push(localMessage);
        allLocalMessagesByID[localMessage.ui_state.id] = localMessage;
      }
    } else {
      const items = getResponseItems(message);
      if (items?.length) {
        items.forEach((messageItem) => {
          // Pause messages should be ignored when loaded from history. We should also ignore any messages that aren't
          // targeted for the chat channel.
          if (!isPause(messageItem)) {
            const localMessage = outputItemToLocalItem(
              messageItem,
              message as MessageResponse,
              false,
            );

            localMessagesByOriginalMessageID[message.id].push(localMessage);
            allLocalMessagesByID[localMessage.ui_state.id] = localMessage;

            if (isResponseWithNestedItems(localMessage.item)) {
              const nestedLocalMessageItems: LocalMessageItem[] = [];
              createLocalMessageItemsForNestedMessageItems(
                localMessage,
                message as MessageResponse,
                true,
                nestedLocalMessageItems,
                true,
              );

              nestedLocalMessageItems.forEach((localMessageItem) => {
                const localMessageID = localMessageItem.ui_state.id;
                loadingState.loadedHistory.messageHistory.allMessageItemsByID[
                  localMessageID
                ] = localMessageItem;
              });
            }
          }
        });
      }
    }

    addMessageToThread(message, loadingState);
  });
}

/**
 * Returns all the generic items for the given message either if it's a message response or a local response.
 */
function getResponseItems(message: unknown): GenericItem[] {
  if (isResponse(message)) {
    return message.output.generic;
  }
  return null;
}

/**
 * Adds the given message to the given thread. If the message is the first message in its thread, it will also be
 * added to the main thread.
 */
function addMessageToThread(message: Message, loadingState: LoadingState) {
  // Messages from the server may have a thread ID if a multi-turn has started. Make sure anything that's not an
  // agent thread is put into the main thread.
  const { threadMessagesByThreadID } = loadingState;
  let thread = threadMessagesByThreadID[THREAD_ID_MAIN];
  if (!thread) {
    thread = [];
    threadMessagesByThreadID[THREAD_ID_MAIN] = thread;
  }

  thread.push(message);
}

/**
 * Creates all of the {@link ChatMessagesState} objects that all the appropriate threads.
 */
function createChatStates(loadingState: LoadingState) {
  const {
    loadedHistory,
    threadMessagesByThreadID,
    localMessagesByOriginalMessageID,
  } = loadingState;
  loadedHistory.messageHistory.assistantMessageState = toChatMessageState(
    threadMessagesByThreadID[THREAD_ID_MAIN],
    localMessagesByOriginalMessageID,
  );
}

/**
 * Creates a {@link ChatMessagesState} for the given array of local messages.
 */
function toChatMessageState(
  messages: Message[],
  localMessagesByFullMessageID: ObjectMap<LocalMessageItem[]>,
): ChatMessagesState {
  const localMessageIDs: string[] = [];
  const messageIDs: string[] = [];
  if (messages) {
    messages.forEach((message) => {
      messageIDs.push(message.id);
      localMessagesByFullMessageID[message.id].forEach((localMessage) => {
        localMessageIDs.push(localMessage.ui_state.id);
      });
    });
  }

  return {
    ...DEFAULT_CHAT_MESSAGES_STATE,
    localMessageIDs,
    messageIDs,
  };
}

/**
 * Checks if most recent input is a request for a welcome node. If it is, it marks the response ui_state as
 * isLatestWelcomeNode.
 */
function markIsLatestWelcomeNode(loadingState: LoadingState) {
  const {
    responsesByRequestID,
    threadMessagesByThreadID,
    localMessagesByOriginalMessageID,
  } = loadingState;
  const mainThreadMessages = threadMessagesByThreadID[THREAD_ID_MAIN];

  // Look for the most recent welcome message.
  const welcomeRequest = findLast(
    mainThreadMessages,
    (message) => isRequest(message) && message.history.is_welcome_request,
  );

  if (welcomeRequest) {
    // See if we have a response to this request and if so, mark it.
    const welcomeResponse = responsesByRequestID[welcomeRequest.id];
    if (welcomeResponse) {
      localMessagesByOriginalMessageID[welcomeResponse.id].forEach(
        (localMessage) => {
          localMessage.ui_state.isWelcomeResponse = true;
        },
      );
    }
  }
}

/**
 * Goes through all the messages looking for the option and suggestion responses. For each of those, this will
 * look to see if there's a related message request where the user chose one of the options and then marks the
 * option or suggestion with the value that was chosen.
 */
function markSelectedOptions({
  allMessages,
  relatedMessageByID,
  localMessagesByOriginalMessageID,
}: LoadingState) {
  allMessages.forEach((message) => {
    if (isResponse(message)) {
      localMessagesByOriginalMessageID[message.id].forEach((localMessage) => {
        if (isOptionItem(localMessage.item)) {
          // This is an option response. Let's see if another message said it's related to this
          // message in which case, that other message should tell us which option the user chose.
          const relatedRequest = relatedMessageByID[message.id];
          if (isRequest(relatedRequest)) {
            localMessage.ui_state.optionSelected = relatedRequest;
          }
        } else if (isDateResponseType(localMessage as LocalMessageItem)) {
          const relatedRequest = relatedMessageByID[message.id];
          if (isRequest(relatedRequest)) {
            localMessage.ui_state.originalUserText =
              relatedRequest.history.label;
          }
        }
      });
    }
  });
}

export { LoadedHistory, notesToLoadedHistory };
