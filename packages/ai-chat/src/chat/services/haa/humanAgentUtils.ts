/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { BusEventType } from "../../../types/events/eventBusTypes";
import { outputItemToLocalItem } from "../../schema/outputItemToLocalItem";
import actions from "../../store/actions";
import { LocalMessageItem } from "../../../types/messaging/LocalMessageItem";
import { conditionalSetTimeout } from "../../utils/browserUtils";
import { asyncForEach } from "../../utils/lang/arrayUtils";
import { deepFreeze } from "../../utils/lang/objectUtils";
import { createMessageResponseForItem } from "../../utils/messageUtils";
import { ServiceManager } from "../ServiceManager";
import { getHumanAgentStatusMessageText } from "./agentStatusMessage";
import {
  HumanAgentMessageType,
  ResponseUserProfile,
  GenericItem,
  Message,
  MessageResponseTypes,
  TextItem,
} from "../../../types/messaging/Messages";
import { LanguagePack } from "../../../types/config/PublicConfig";

/**
 * A simple pairing of local messages to the original messages that they belong to.
 */
interface LocalAndOriginalMessagesPair {
  localMessages: LocalMessageItem[];
  originalMessage: Message;
}

/**
 * Creates a LocalAndOriginalMessagesPair.
 */
function toPair(localMessages: LocalMessageItem[], originalMessage: Message) {
  return { localMessages, originalMessage };
}

/**
 * Create a local message that represent a status message to display to the user.
 */
async function createHumanAgentLocalMessage(
  agentMessageType: HumanAgentMessageType,
  serviceManager: ServiceManager,
  responseUserProfile?: ResponseUserProfile,
  fireEvents = true,
) {
  const text = getHumanAgentStatusMessageText(
    agentMessageType,
    responseUserProfile,
    serviceManager.intl,
  );

  const result = createHumanAgentLocalMessageForType(agentMessageType);
  const { originalMessage, localMessage } = result;

  localMessage.item.text = text;
  if (responseUserProfile) {
    originalMessage.message_options = originalMessage.message_options || {};
    originalMessage.message_options.response_user_profile = responseUserProfile;
  }

  if (fireEvents) {
    await serviceManager.fire({
      type: BusEventType.HUMAN_AGENT_PRE_RECEIVE,
      data: originalMessage,
    });
  }
  deepFreeze(originalMessage);
  if (fireEvents) {
    await serviceManager.fire({
      type: BusEventType.HUMAN_AGENT_RECEIVE,
      data: originalMessage,
    });
  }

  return result;
}

/**
 * Creates an empty skeleton of a {@link LocalMessageItem} with the given agent message type.
 */
function createHumanAgentLocalMessageForType(
  agentMessageType: HumanAgentMessageType,
) {
  const messageItem: GenericItem = {
    response_type: MessageResponseTypes.TEXT,
    agent_message_type: agentMessageType,
  };
  const originalMessage = createMessageResponseForItem(messageItem);
  const localMessage: LocalMessageItem<TextItem> = outputItemToLocalItem(
    messageItem,
    originalMessage,
  );

  return { localMessage, originalMessage };
}

/**
 * Creates a message for the "bot returns" message that is displayed after a chat is ended. If there is no text in
 * the language pack for this message, the message will be undefined.
 */
function createBotReturnMessage(languagePack: LanguagePack) {
  // Create a bot message to let the user know the bot has returned.
  const { agent_botReturned } = languagePack;

  if (!agent_botReturned) {
    // No text, so don't show anything.
    return null;
  }

  const { originalMessage, localMessage } =
    createHumanAgentLocalMessageForType(null);
  localMessage.item.text = agent_botReturned;

  return { originalMessage, localMessage };
}

/**
 * Adds the given messages to the redux store and optionally to session history as well.
 */
async function addMessages(
  messagePairs: LocalAndOriginalMessagesPair[],
  showLiveMessages: boolean,
  serviceManager: ServiceManager,
) {
  if (showLiveMessages) {
    // Add to the redux store and fire any custom response events that are needed.
    await asyncForEach(
      messagePairs,
      async ({ localMessages, originalMessage }) => {
        await asyncForEach(localMessages, async (localMessage, index) => {
          await serviceManager.actions.handleUserDefinedResponseItems(
            localMessage,
            originalMessage,
          );
          serviceManager.store.dispatch(
            actions.addLocalMessageItem(
              localMessage,
              originalMessage,
              index === 0,
            ),
          );
        });
      },
    );
  }
}

/**
 * Adds a "bot return" message from the bot after (on an optional delay). This messages will also be sent to the server
 * to be included in the session history.
 *
 * @param botReturnDelay The delay before adding the "bot return" message.
 * @param wasSuspended Indicates if the conversation was suspended before it was ended.
 * @param serviceManager The service manager to use.
 */
async function addBotReturnMessage(
  botReturnDelay: number,
  wasSuspended: boolean,
  serviceManager: ServiceManager,
) {
  const botReturn = createBotReturnMessage(
    serviceManager.store.getState().config.derived.languagePack,
  );
  if (botReturn) {
    const initialRestartCount = serviceManager.restartCount;
    conditionalSetTimeout(() => {
      if (initialRestartCount === serviceManager.restartCount) {
        // Don't show this message if the chat has been restarted since we started waiting.
        addMessages(
          [toPair([botReturn.localMessage], botReturn.originalMessage)],
          !wasSuspended,
          serviceManager,
        );
      }
    }, botReturnDelay);
  }
}

/**
 * Adds an "end chat" message to the message list. This messages will also be sent to the server to be included in the
 * session history.
 *
 * @param agentMessageType The type of the "end chat" message.
 * @param responseUserProfile The profile of the agent who ended the chat (or null if not ended by an agent).
 * @param fireEvents Indicates if the agent events should be fired for the "end chat" message.
 * @param wasSuspended Indicates if the conversation was suspended before it was ended.
 * @param serviceManager The service manager to use.
 */
async function addHumanAgentEndChatMessage(
  agentMessageType: HumanAgentMessageType,
  responseUserProfile: ResponseUserProfile,
  fireEvents: boolean,
  wasSuspended: boolean,
  serviceManager: ServiceManager,
) {
  const endChatMessage = await createHumanAgentLocalMessage(
    agentMessageType,
    serviceManager,
    responseUserProfile,
    fireEvents,
  );
  await addMessages(
    [toPair([endChatMessage.localMessage], endChatMessage.originalMessage)],
    !wasSuspended,
    serviceManager,
  );
}

export {
  LocalAndOriginalMessagesPair,
  createHumanAgentLocalMessage,
  addMessages,
  toPair,
  addHumanAgentEndChatMessage,
  addBotReturnMessage,
};
