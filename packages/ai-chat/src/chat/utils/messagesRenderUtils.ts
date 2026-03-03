/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ObjectMap from "../../types/utilities/ObjectMap";
import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
import { Message } from "../../types/messaging/Messages";
import { isStandaloneSystemMessage } from "./messageUtils";

interface RenderableMessageMetadata {
  fullMessage: Message;
  isFirstMessageItem: boolean;
  isLastMessageItem: boolean;
  isMessageForInput: boolean;
  isStandaloneSystemMessage: boolean;
  localMessageItem: LocalMessageItem;
  messageItemID: string;
  messagesIndex: number;
  showBeforeWelcomeNodeElement: boolean;
}

function buildRenderableMessageMetadata(
  localMessageItems: LocalMessageItem[],
  allMessagesByID: ObjectMap<Message>,
  messageIDForInput: string,
): RenderableMessageMetadata[] {
  const metadata: RenderableMessageMetadata[] = [];
  let previousMessageID: string | null = null;

  for (
    let currentIndex = 0;
    currentIndex < localMessageItems.length;
    currentIndex++
  ) {
    const localMessageItem = localMessageItems[currentIndex];
    const fullMessage = allMessagesByID[localMessageItem.fullMessageID];
    const isFirstMessageItem =
      previousMessageID !== localMessageItem.fullMessageID;
    const nextLocalMessageItem = localMessageItems[currentIndex + 1];
    const isLastMessageItem =
      localMessageItems.length - 1 === currentIndex ||
      localMessageItem.fullMessageID !== nextLocalMessageItem.fullMessageID;

    metadata.push({
      fullMessage,
      isFirstMessageItem,
      isLastMessageItem,
      isMessageForInput: messageIDForInput === localMessageItem.fullMessageID,
      isStandaloneSystemMessage: isStandaloneSystemMessage(fullMessage),
      localMessageItem,
      messageItemID: localMessageItem.ui_state.id,
      messagesIndex: currentIndex,
      showBeforeWelcomeNodeElement:
        localMessageItem.ui_state.isWelcomeResponse && isFirstMessageItem,
    });

    previousMessageID = localMessageItem.fullMessageID;
  }

  return metadata;
}

export { buildRenderableMessageMetadata, type RenderableMessageMetadata };
