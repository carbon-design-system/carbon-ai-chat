/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import { Message } from '../../types/messaging/Messages';
import { isStandaloneSystemMessage } from '../../sdk/utils/messageUtils';
import type { ChatSDKMessageItem } from '../../types/instance/ChatSDKState';
import type { DrawnMessageItem } from '../hooks/useDrawnMessageItems';

interface RenderableMessageMetadata {
  fullMessage: Message;
  isFirstMessageItem: boolean;
  isLastMessageItem: boolean;
  isMessageForInput: boolean;
  isStandaloneSystemMessage: boolean;
  localMessageItem: LocalMessageItem;
  /** The item's entry in `instance.state.messageItems`. */
  messageItem: Readonly<ChatSDKMessageItem>;
  messageItemID: string;
  messagesIndex: number;
  showBeforeWelcomeNodeElement: boolean;
}

function buildRenderableMessageMetadata(
  drawnItems: readonly DrawnMessageItem[],
  messageIDForInput: string
): RenderableMessageMetadata[] {
  const metadata: RenderableMessageMetadata[] = [];
  let previousMessageID: string | null = null;

  for (let currentIndex = 0; currentIndex < drawnItems.length; currentIndex++) {
    const {
      localMessageItem,
      message: fullMessage,
      messageItem,
    } = drawnItems[currentIndex];
    const isFirstMessageItem =
      previousMessageID !== localMessageItem.fullMessageID;
    const nextLocalMessageItem = drawnItems[currentIndex + 1]?.localMessageItem;
    const isLastMessageItem =
      drawnItems.length - 1 === currentIndex ||
      localMessageItem.fullMessageID !== nextLocalMessageItem.fullMessageID;

    metadata.push({
      fullMessage,
      isFirstMessageItem,
      isLastMessageItem,
      isMessageForInput: messageIDForInput === localMessageItem.fullMessageID,
      isStandaloneSystemMessage: isStandaloneSystemMessage(fullMessage),
      localMessageItem,
      messageItem,
      messageItemID: localMessageItem.ui_state.id,
      messagesIndex: currentIndex,
      showBeforeWelcomeNodeElement:
        localMessageItem.ui_state.isWelcomeResponse && isFirstMessageItem,
    });

    previousMessageID = localMessageItem.fullMessageID;
  }

  return metadata;
}

export { buildRenderableMessageMetadata };
